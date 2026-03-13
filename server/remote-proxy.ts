import { HTTPException } from 'hono/http-exception';

import { parseContentDispositionFilename, sanitizeFileName } from '../packages/preview-core/src/file-name.ts';

const PRIVATE_IPV4_PATTERNS = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./
];

const HOP_BY_HOP_RESPONSE_HEADERS = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
];

const STRIPPED_RESPONSE_HEADERS = [
  ...HOP_BY_HOP_RESPONSE_HEADERS,
  'content-security-policy',
  'content-security-policy-report-only',
  'clear-site-data',
  'set-cookie',
  'set-cookie2'
];

export type HostnameResolver = (hostname: string) => Promise<readonly string[]>;

export interface SafeTargetUrlOptions {
  resolveHostname?: HostnameResolver;
}

export interface ProxyRemoteResourceOptions extends SafeTargetUrlOptions {
  forceDownload?: boolean;
}

function badRequest(message: string): never {
  throw new HTTPException(400, { message });
}

function remoteFailure(status: number, message: string): never {
  throw new HTTPException(status as 400 | 401 | 403 | 404 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 422 | 423 | 424 | 429 | 500 | 501 | 502 | 503 | 504 | 505 | 507 | 508, {
    message
  });
}

function normalizeHost(hostnameOrAddress: string): string {
  const value = hostnameOrAddress.trim().toLowerCase();
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1);
  }
  return value;
}

function isIpv4Literal(hostnameOrAddress: string): boolean {
  const value = normalizeHost(hostnameOrAddress);
  const segments = value.split('.');
  if (segments.length !== 4) {
    return false;
  }

  return segments.every((segment) => {
    if (!/^\d{1,3}$/.test(segment)) {
      return false;
    }

    const numeric = Number.parseInt(segment, 10);
    return numeric >= 0 && numeric <= 255;
  });
}

function isIpv6Literal(hostnameOrAddress: string): boolean {
  const value = normalizeHost(hostnameOrAddress);
  return value.includes(':') && /^[0-9a-f:.]+$/i.test(value);
}

function isIpLiteral(hostnameOrAddress: string): boolean {
  return isIpv4Literal(hostnameOrAddress) || isIpv6Literal(hostnameOrAddress);
}

export function isPrivateIp(hostnameOrAddress: string): boolean {
  const value = normalizeHost(hostnameOrAddress);

  if (isIpv4Literal(value)) {
    return PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(value));
  }

  if (isIpv6Literal(value)) {
    return (
      value === '::1' ||
      value.startsWith('fe80:') ||
      value.startsWith('fc') ||
      value.startsWith('fd')
    );
  }

  return false;
}

export async function assertSafeTargetUrl(rawUrl: string, options: SafeTargetUrlOptions = {}): Promise<URL> {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    badRequest('URL 无效，请提供完整的 http 或 https 地址。');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    badRequest('仅支持 http 和 https 协议。');
  }

  if (url.username || url.password) {
    badRequest('URL 里不允许携带账号或密码。');
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.local') || isPrivateIp(hostname)) {
    badRequest('不允许访问本地或内网地址。');
  }

  if (isIpLiteral(hostname) || !options.resolveHostname) {
    return url;
  }

  try {
    const addresses = await options.resolveHostname(hostname);
    if (!addresses.length || addresses.some((address) => isPrivateIp(address))) {
      badRequest('不允许访问指向本地或内网的地址。');
    }
  } catch {
    badRequest('目标地址无法解析。');
  }

  return url;
}

function copyRequestHeader(source: Headers, target: Headers, key: string): void {
  const value = source.get(key);
  if (value) {
    target.set(key, value);
  }
}

function isRedirectStatus(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}

async function fetchWithValidatedRedirects(
  url: URL,
  init: RequestInit,
  options: SafeTargetUrlOptions
): Promise<Response> {
  let currentUrl = url;

  for (let step = 0; step < 6; step += 1) {
    await assertSafeTargetUrl(currentUrl.toString(), options);

    const response = await fetch(currentUrl, {
      ...init,
      redirect: 'manual'
    });

    if (!isRedirectStatus(response.status)) {
      return response;
    }

    const location = response.headers.get('location');
    if (!location) {
      remoteFailure(502, '目标资源重定向缺少 location。');
    }

    currentUrl = new URL(location, currentUrl);
  }

  remoteFailure(508, '目标资源重定向次数过多。');
}

function resolveFileName(requestedUrl: URL, response: Response): string {
  const fromHeader = parseContentDispositionFilename(response.headers.get('content-disposition'));
  if (fromHeader) {
    return fromHeader;
  }

  const finalUrl =
    new URL(response.url || requestedUrl.toString());
  const lastSegment =
    finalUrl.pathname.split('/').filter(Boolean).at(-1) ??
    requestedUrl.pathname.split('/').filter(Boolean).at(-1) ??
    'remote-file';

  try {
    return sanitizeFileName(decodeURIComponent(lastSegment));
  } catch {
    return sanitizeFileName(lastSegment);
  }
}

export function sanitizeProxyResponseHeaders(source: Headers): Headers {
  const headers = new Headers(source);

  for (const key of STRIPPED_RESPONSE_HEADERS) {
    headers.delete(key);
  }

  // Node fetch transparently inflates gzip/br/deflate responses, so forwarding
  // the original content-encoding and content-length can leave clients waiting
  // for bytes that will never arrive.
  if (headers.has('content-encoding')) {
    headers.delete('content-encoding');
    headers.delete('content-length');
  }

  return headers;
}

export async function proxyRemoteResource(
  rawUrl: string,
  request: Request,
  options: ProxyRemoteResourceOptions = {}
): Promise<Response> {
  const targetUrl = await assertSafeTargetUrl(rawUrl, options);
  const requestHeaders = new Headers();

  copyRequestHeader(request.headers, requestHeaders, 'accept');
  copyRequestHeader(request.headers, requestHeaders, 'range');
  copyRequestHeader(request.headers, requestHeaders, 'if-range');
  copyRequestHeader(request.headers, requestHeaders, 'if-none-match');
  copyRequestHeader(request.headers, requestHeaders, 'if-modified-since');
  copyRequestHeader(request.headers, requestHeaders, 'cache-control');

  requestHeaders.set(
    'user-agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0'
  );
  requestHeaders.set('accept', requestHeaders.get('accept') ?? '*/*');
  requestHeaders.set('accept-encoding', 'identity');

  const method = request.method === 'HEAD' ? 'HEAD' : 'GET';
  const response = await fetchWithValidatedRedirects(
    targetUrl,
    {
      method,
      headers: requestHeaders
    },
    options
  );

  if (!response.ok && response.status !== 206 && response.status !== 304) {
    remoteFailure(response.status, `目标资源请求失败，远端返回 ${response.status}。`);
  }

  const headers = sanitizeProxyResponseHeaders(response.headers);
  headers.set('x-content-type-options', 'nosniff');

  if (options.forceDownload) {
    const fileName = resolveFileName(targetUrl, response);
    headers.set('content-disposition', `attachment; filename="${fileName}"`);
  }

  return new Response(response.body, {
    status: response.status,
    headers
  });
}
