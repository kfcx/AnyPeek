import { DEFAULT_PROXY_BASE } from './constants';

export interface RemoteTransport {
  buildPreviewUrl(rawUrl: string): string;
  buildDownloadUrl(rawUrl: string): string;
  fetch(rawUrl: string, init?: RequestInit, options?: { download?: boolean }): Promise<Response>;
}

export function buildProxyUrl(rawUrl: string, base = DEFAULT_PROXY_BASE, download = false): string {
  const params = new URLSearchParams({ url: rawUrl });
  if (download) {
    params.set('download', '1');
  }
  return `${base}?${params.toString()}`;
}

export function createProxyRemoteTransport(base = DEFAULT_PROXY_BASE): RemoteTransport {
  return {
    buildPreviewUrl(rawUrl) {
      return buildProxyUrl(rawUrl, base, false);
    },
    buildDownloadUrl(rawUrl) {
      return buildProxyUrl(rawUrl, base, true);
    },
    fetch(rawUrl, init, options) {
      return fetch(buildProxyUrl(rawUrl, base, options?.download ?? false), init);
    }
  };
}
