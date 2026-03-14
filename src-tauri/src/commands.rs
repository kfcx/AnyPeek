use std::net::IpAddr;

use reqwest::{
    header::{self, HeaderMap},
    redirect::Policy,
    Client, Response, StatusCode,
};
use serde::{Deserialize, Serialize};
use tokio::net::lookup_host;
use url::Url;

const DEFAULT_SAMPLE_BYTES: usize = 64 * 1024;
const MAX_REDIRECTS: usize = 5;
const USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0";

#[derive(Serialize)]
pub struct NativeFallbackStatus {
    pub status: String,
    pub message: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteProbeRequest {
    pub raw_url: String,
    pub sample_bytes: Option<usize>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteReadRequest {
    pub raw_url: String,
    pub start: Option<usize>,
    pub end_exclusive: Option<usize>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteProbeResult {
    pub file_name: String,
    pub content_type: String,
    pub size: Option<u64>,
    pub sample_bytes: Vec<u8>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteReadResult {
    pub bytes: Vec<u8>,
    pub complete: bool,
}

fn sanitize_file_name(file_name: &str) -> String {
    let cleaned: String = file_name
        .chars()
        .map(|value| match value {
            '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => value,
        })
        .collect();
    let cleaned = cleaned.trim();
    if cleaned.is_empty() {
        "remote-file".to_string()
    } else {
        cleaned.to_string()
    }
}

fn extract_filename_param(source: &str, prefix: &str) -> Option<String> {
    let lower = source.to_ascii_lowercase();
    let start = lower.find(prefix)? + prefix.len();
    let rest = source.get(start..)?.trim_start();
    let value = rest.split(';').next()?.trim();
    if value.is_empty() {
        return None;
    }

    Some(value.trim_matches('"').to_string())
}

fn parse_content_disposition_filename(headers: &HeaderMap) -> Option<String> {
    let content_disposition = headers
        .get(header::CONTENT_DISPOSITION)?
        .to_str()
        .ok()?;

    if let Some(encoded) = extract_filename_param(content_disposition, "filename*=utf-8''") {
        let decoded = urlencoding::decode(&encoded)
            .map(|value| value.into_owned())
            .unwrap_or(encoded);
        return Some(sanitize_file_name(&decoded));
    }

    extract_filename_param(content_disposition, "filename=").map(|value| sanitize_file_name(&value))
}

fn resolve_file_name(requested_url: &Url, response: &Response) -> String {
    if let Some(from_header) = parse_content_disposition_filename(response.headers()) {
        return from_header;
    }

    let candidate = response
        .url()
        .path_segments()
        .and_then(|segments| segments.filter(|value| !value.is_empty()).last())
        .or_else(|| {
            requested_url
                .path_segments()
                .and_then(|segments| segments.filter(|value| !value.is_empty()).last())
        })
        .unwrap_or("remote-file");

    let decoded = urlencoding::decode(candidate)
        .map(|value| value.into_owned())
        .unwrap_or_else(|_| candidate.to_string());
    sanitize_file_name(&decoded)
}

fn normalize_host(host: &str) -> String {
    host.trim().trim_end_matches('.').to_ascii_lowercase()
}

fn is_private_ip(address: IpAddr) -> bool {
    match address {
        IpAddr::V4(value) => {
            let [a, b, c, _] = value.octets();
            value.is_private()
                || value.is_loopback()
                || value.is_link_local()
                || value.is_unspecified()
                || value.is_broadcast()
                || value.is_multicast()
                || a >= 240
                || (a == 100 && (64..=127).contains(&b))
                || (a == 192 && b == 0 && c == 0)
                || (a == 192 && b == 0 && c == 2)
                || (a == 192 && b == 88 && c == 99)
                || (a == 198 && matches!(b, 18 | 19))
                || (a == 198 && b == 51 && c == 100)
                || (a == 203 && b == 0 && c == 113)
        }
        IpAddr::V6(value) => {
            let segments = value.segments();
            value.is_loopback()
                || value.is_unspecified()
                || value.is_unique_local()
                || value.is_unicast_link_local()
                || value.is_multicast()
                || ((segments[0] & 0xffc0) == 0xfec0)
                || (segments[0] == 0x2001 && segments[1] == 0x0db8)
                || value
                    .to_ipv4_mapped()
                    .map(|mapped| is_private_ip(IpAddr::V4(mapped)))
                    .unwrap_or(false)
        }
    }
}

async fn assert_safe_target_url(raw_url: &str) -> Result<Url, String> {
    let url = Url::parse(raw_url).map_err(|_| "URL 无效，请提供完整的 http 或 https 地址。".to_string())?;

    if !matches!(url.scheme(), "http" | "https") {
        return Err("仅支持 http 和 https 协议。".to_string());
    }

    if !url.username().is_empty() || url.password().is_some() {
        return Err("URL 里不允许携带账号或密码。".to_string());
    }

    let hostname = normalize_host(
        url.host_str()
            .ok_or_else(|| "URL 无效，请提供完整的 http 或 https 地址。".to_string())?,
    );

    if hostname == "localhost" || hostname.ends_with(".local") {
        return Err("不允许访问本地或内网地址。".to_string());
    }

    if let Ok(address) = hostname.parse::<IpAddr>() {
        if is_private_ip(address) {
            return Err("不允许访问本地或内网地址。".to_string());
        }
        return Ok(url);
    }

    let port = url.port_or_known_default().unwrap_or(80);
    let mut resolved_any = false;
    let lookup = lookup_host((hostname.as_str(), port))
        .await
        .map_err(|_| "目标地址无法解析。".to_string())?;

    for entry in lookup {
        resolved_any = true;
        if is_private_ip(entry.ip()) {
            return Err("不允许访问指向本地或内网的地址。".to_string());
        }
    }

    if !resolved_any {
        return Err("目标地址无法解析。".to_string());
    }

    Ok(url)
}

fn build_client() -> Result<Client, String> {
    Client::builder()
        .redirect(Policy::none())
        .build()
        .map_err(|error| format!("桌面代理初始化失败：{error}"))
}

fn is_redirect_status(status: StatusCode) -> bool {
    matches!(
        status,
        StatusCode::MOVED_PERMANENTLY
            | StatusCode::FOUND
            | StatusCode::SEE_OTHER
            | StatusCode::TEMPORARY_REDIRECT
            | StatusCode::PERMANENT_REDIRECT
    )
}

fn build_request(
    client: &Client,
    url: Url,
    range: Option<(usize, usize)>,
) -> reqwest::RequestBuilder {
    let mut request = client
        .get(url)
        .header(header::USER_AGENT, USER_AGENT)
        .header(header::ACCEPT, "*/*")
        .header(header::ACCEPT_ENCODING, "identity");

    if let Some((start, end_exclusive)) = range {
        let range_end = end_exclusive.saturating_sub(1);
        request = request.header(header::RANGE, format!("bytes={start}-{range_end}"));
    }

    request
}

async fn request_remote_resource(
    client: &Client,
    raw_url: &str,
    range: Option<(usize, usize)>,
) -> Result<(Url, Response), String> {
    let mut current_url = assert_safe_target_url(raw_url).await?;

    for _ in 0..=MAX_REDIRECTS {
        let response = build_request(client, current_url.clone(), range)
            .send()
            .await
            .map_err(|error| format!("目标资源请求失败：{error}"))?;

        if !is_redirect_status(response.status()) {
            return Ok((current_url, response));
        }

        let location = response
            .headers()
            .get(header::LOCATION)
            .and_then(|value| value.to_str().ok())
            .ok_or_else(|| "目标资源重定向缺少 location。".to_string())?;

        current_url = current_url
            .join(location)
            .map_err(|_| "目标资源重定向地址无效。".to_string())?;
        current_url = assert_safe_target_url(current_url.as_str()).await?;
    }

    Err("目标资源重定向次数过多。".to_string())
}

fn ensure_supported_status(response: &Response) -> Result<(), String> {
    let status = response.status();
    if status.is_success() || status == StatusCode::PARTIAL_CONTENT {
        return Ok(());
    }

    Err(format!("目标资源请求失败，远端返回 {}。", status.as_u16()))
}

async fn read_response_sample(response: &mut Response, limit: usize) -> Result<Vec<u8>, String> {
    let mut collected = Vec::with_capacity(limit.min(8192));

    while collected.len() < limit {
        let next = response
            .chunk()
            .await
            .map_err(|error| format!("读取远程资源失败：{error}"))?;

        let Some(chunk) = next else {
            break;
        };

        let remaining = limit - collected.len();
        let take = chunk.len().min(remaining);
        collected.extend_from_slice(&chunk[..take]);

        if take < chunk.len() {
            break;
        }
    }

    Ok(collected)
}

async fn read_response_all(response: Response) -> Result<Vec<u8>, String> {
    response
        .bytes()
        .await
        .map(|bytes| bytes.to_vec())
        .map_err(|error| format!("读取远程资源失败：{error}"))
}

#[tauri::command]
pub async fn probe_remote_resource(payload: RemoteProbeRequest) -> Result<RemoteProbeResult, String> {
    let sample_limit = payload
        .sample_bytes
        .unwrap_or(DEFAULT_SAMPLE_BYTES)
        .clamp(1, 1024 * 1024);

    let client = build_client()?;
    let (requested_url, mut response) = request_remote_resource(&client, &payload.raw_url, None).await?;
    ensure_supported_status(&response)?;

    let file_name = resolve_file_name(&requested_url, &response);
    let content_type = response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.to_string())
        .unwrap_or_else(|| "application/octet-stream".to_string());
    let size = response.content_length();
    let sample_bytes = read_response_sample(&mut response, sample_limit).await?;

    Ok(RemoteProbeResult {
        file_name,
        content_type,
        size,
        sample_bytes,
    })
}

#[tauri::command]
pub async fn read_remote_resource(payload: RemoteReadRequest) -> Result<RemoteReadResult, String> {
    if let (Some(start), Some(end_exclusive)) = (payload.start, payload.end_exclusive) {
        if end_exclusive <= start {
            return Ok(RemoteReadResult {
                bytes: Vec::new(),
                complete: false,
            });
        }
    }

    let client = build_client()?;
    let range = match (payload.start, payload.end_exclusive) {
        (Some(start), Some(end_exclusive)) if end_exclusive > start => Some((start, end_exclusive)),
        _ => None,
    };

    let (_, response) = request_remote_resource(&client, &payload.raw_url, range).await?;
    ensure_supported_status(&response)?;

    let is_partial_response = response.status() == StatusCode::PARTIAL_CONTENT;
    let bytes = read_response_all(response).await?;

    Ok(RemoteReadResult {
        bytes,
        complete: range.is_none() || !is_partial_response,
    })
}

#[tauri::command]
pub async fn convert_legacy_office(file_path: String) -> Result<NativeFallbackStatus, String> {
    Err(format!(
        "Native office fallback is reserved but not wired yet for: {}",
        file_path
    ))
}
