import { HTTPException } from 'hono/http-exception';

import { PROXY_RESOLVED_FILENAME_HEADER } from '../packages/preview-core/src/constants.ts';
import { parseContentDispositionFilename, sanitizeFileName } from '../packages/preview-core/src/file-name.ts';

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
  let value = hostnameOrAddress.trim().toLowerCase();
  if (value.startsWith('[') && value.endsWith(']')) {
    value = value.slice(1, -1);
  }
  return value.replace(/\.+$/u, '');
}

function parseIpv4Octets(hostnameOrAddress: string): number[] | null {
  const value = normalizeHost(hostnameOrAddress);
  const segments = value.split('.');
  if (segments.length !== 4) {
    return null;
  }

  const octets = new Array<number>(4);
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (!/^\d{1,3}$/u.test(segment)) {
      return null;
    }

    const numeric = Number.parseInt(segment, 10);
    if (numeric < 0 || numeric > 255) {
      return null;
    }
    octets[index] = numeric;
  }

  return octets;
}

function parseIpv6Hextets(hostnameOrAddress: string): number[] | null {
  let value = normalizeHost(hostnameOrAddress);
  if (!value.includes(':')) {
    return null;
  }

  if (value.includes('.')) {
    const lastColonIndex = value.lastIndexOf(':');
    if (lastColonIndex < 0) {
      return null;
    }

    const tail = parseIpv4Octets(value.slice(lastColonIndex + 1));
    if (!tail) {
      return null;
    }

    value = `${value.slice(0, lastColonIndex)}:${((tail[0] << 8) | tail[1]).toString(16)}:${((tail[2] << 8) | tail[3]).toString(16)}`;
  }

  const hasCompression = value.includes('::');
  if (hasCompression && value.indexOf('::') !== value.lastIndexOf('::')) {
    return null;
  }

  const isValidHextet = (candidate: string) => /^[0-9a-f]{1,4}$/iu.test(candidate);

  if (!hasCompression) {
    const parts = value.split(':');
    if (parts.length !== 8 || parts.some((part) => !isValidHextet(part))) {
      return null;
    }
    return parts.map((part) => Number.parseInt(part, 16));
  }

  const [leftRaw, rightRaw = ''] = value.split('::');
  const left = leftRaw ? leftRaw.split(':').filter(Boolean) : [];
  const right = rightRaw ? rightRaw.split(':').filter(Boolean) : [];
  if (left.some((part) => !isValidHextet(part)) || right.some((part) => !isValidHextet(part))) {
    return null;
  }

  const missing = 8 - (left.length + right.length);
  if (missing <= 0) {
    return null;
  }

  return [...left, ...Array(missing).fill('0'), ...right].map((part) => Number.parseInt(part, 16));
}

function isIpv4Literal(hostnameOrAddress: string): boolean {
  return parseIpv4Octets(hostnameOrAddress) != null;
}

function isIpv6Literal(hostnameOrAddress: string): boolean {
  return parseIpv6Hextets(hostnameOrAddress) != null;
}

function isIpLiteral(hostnameOrAddress: string): boolean {
  return isIpv4Literal(hostnameOrAddress) || isIpv6Literal(hostnameOrAddress);
}

function isPrivateIpv4(octets: readonly number[]): boolean {
  const [a, b, c] = octets;

  if (a === 0 || a === 10 || a === 127) {
    return true;
  }

  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }

  if (a === 169 && b === 254) {
    return true;
  }

  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }

  if (a === 192 && b === 0 && c === 0) {
    return true;
  }

  if (a === 192 && b === 0 && c === 2) {
    return true;
  }

  if (a === 192 && b === 88 && c === 99) {
    return true;
  }

  if (a === 192 && b === 168) {
    return true;
  }

  if (a === 198 && (b === 18 || b === 19)) {
    return true;
  }

  if (a === 198 && b === 51 && c === 100) {
    return true;
  }

  if (a === 203 && b === 0 && c === 113) {
    return true;
  }

  return a >= 224;
}

function isPrivateIpv6(hextets: readonly number[]): boolean {
  const [a, b, c, d, e, f, g, h] = hextets;

  if (hextets.every((part) => part === 0)) {
    return true;
  }

  if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0 && g === 0 && h === 1) {
    return true;
  }

  if ((a & 0xffc0) === 0xfe80) {
    return true;
  }

  if ((a & 0xfe00) === 0xfc00) {
    return true;
  }

  if ((a & 0xffc0) === 0xfec0) {
    return true;
  }

  if ((a & 0xff00) === 0xff00) {
    return true;
  }

  if (a === 0x2001 && b === 0x0db8) {
    return true;
  }

  if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0xffff) {
    return isPrivateIpv4([(g >> 8) & 0xff, g & 0xff, (h >> 8) & 0xff, h & 0xff]);
  }

  return false;
}

export function isPrivateIp(hostnameOrAddress: string): boolean {
  const ipv4 = parseIpv4Octets(hostnameOrAddress);
  if (ipv4) {
    return isPrivateIpv4(ipv4);
  }

  const ipv6 = parseIpv6Hextets(hostnameOrAddress);
  if (ipv6) {
    return isPrivateIpv6(ipv6);
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

  const hostname = normalizeHost(url.hostname);
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

  const resolvedFileName = resolveFileName(targetUrl, response);
  const headers = sanitizeProxyResponseHeaders(response.headers);
  headers.set('x-content-type-options', 'nosniff');
  headers.set(PROXY_RESOLVED_FILENAME_HEADER, resolvedFileName);

  if (options.forceDownload) {
    headers.set('content-disposition', `attachment; filename="${resolvedFileName}"`);
  } else {
    headers.delete('content-disposition');
  }

  return new Response(response.body, {
    status: response.status,
    headers
  });
}
