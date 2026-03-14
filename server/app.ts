import { Hono, type Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';

import { PROXY_RESOLVED_FILENAME_HEADER } from '../packages/preview-core/src/constants.ts';
import { proxyRemoteResource, type HostnameResolver } from './remote-proxy.ts';

const DEFAULT_ALLOWED_HEADERS = [
  'Accept',
  'Content-Type',
  'Range',
  'If-Range',
  'If-None-Match',
  'If-Modified-Since',
  'Cache-Control'
].join(', ');

const EXPOSED_HEADERS = [
  'Accept-Ranges',
  'Content-Disposition',
  'Content-Length',
  'Content-Range',
  'Content-Type',
  'ETag',
  'Last-Modified',
  PROXY_RESOLVED_FILENAME_HEADER
].join(', ');

export interface ProxyAppOptions {
  enableLogger?: boolean;
  resolveHostname?: HostnameResolver;
}

function appendVary(headers: Headers, value: string): void {
  const existing = headers.get('vary');
  if (!existing) {
    headers.set('vary', value);
    return;
  }

  const values = new Set(
    existing
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
  values.add(value);
  headers.set('vary', Array.from(values).join(', '));
}

function applyCorsHeaders(headers: Headers, origin: string | undefined, requestedHeaders?: string | undefined): void {
  const allowOrigin = origin && origin !== 'null' ? origin : '*';
  headers.set('access-control-allow-origin', allowOrigin);
  headers.set('access-control-allow-methods', 'GET, HEAD, OPTIONS');
  headers.set('access-control-allow-headers', requestedHeaders?.trim() || DEFAULT_ALLOWED_HEADERS);
  headers.set('access-control-expose-headers', EXPOSED_HEADERS);
  headers.set('access-control-max-age', '86400');

  if (allowOrigin !== '*') {
    appendVary(headers, 'Origin');
  }
  if (requestedHeaders?.trim()) {
    appendVary(headers, 'Access-Control-Request-Headers');
  }
}

export function handleProxyAppError(error: unknown, c: Context): Response {
  const status = error instanceof HTTPException ? error.status : 500;
  const message = error instanceof Error ? error.message : '服务内部错误。';

  if (!(error instanceof HTTPException) && status >= 500) {
    console.error(error);
  }

  const headers = new Headers();
  applyCorsHeaders(headers, c.req.header('origin'), c.req.header('access-control-request-headers'));
  return new Response(message, { status, headers });
}

export function registerProxyRoutes(app: Hono, options: ProxyAppOptions = {}): Hono {
  app.use('/api/*', async (c, next) => {
    const origin = c.req.header('origin');
    const requestedHeaders = c.req.header('access-control-request-headers');

    if (c.req.method === 'OPTIONS') {
      const headers = new Headers();
      applyCorsHeaders(headers, origin, requestedHeaders);
      return new Response(null, { status: 204, headers });
    }

    await next();
    applyCorsHeaders(c.res.headers, origin, requestedHeaders);
  });

  app.get('/healthz', (c) => c.json({ ok: true }));
  app.on(['GET', 'HEAD'], '/api/file', async (c) => {
    const rawUrl = c.req.query('url');
    if (!rawUrl) {
      return c.text('缺少 url 参数。', 400);
    }

    return await proxyRemoteResource(rawUrl, c.req.raw, {
      forceDownload: c.req.query('download') === '1',
      resolveHostname: options.resolveHostname
    });
  });

  return app;
}

export function createProxyApp(options: ProxyAppOptions = {}): Hono {
  const app = new Hono();

  if (options.enableLogger !== false) {
    app.use(logger());
  }

  registerProxyRoutes(app, options);
  app.onError(handleProxyAppError);
  return app;
}
