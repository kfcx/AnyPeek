import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { serveStatic } from 'hono/deno';
import { logger } from 'hono/logger';

import { handleProxyAppError, registerProxyRoutes } from './server/app.ts';

const serveBuiltAsset = serveStatic({ root: './dist/client' });
const serveIndexHtml = serveStatic({ path: './dist/client/index.html' });

async function runStaticMiddleware(c: Context, middleware: MiddlewareHandler): Promise<Response | null> {
  const response = await middleware(c, async () => {});
  if (response) {
    return response;
  }
  if (c.finalized) {
    return c.res;
  }
  return null;
}

function shouldServeSpaShell(c: Context): boolean {
  if (!['GET', 'HEAD'].includes(c.req.method)) {
    return false;
  }

  const accept = c.req.header('accept') ?? '';
  return accept.includes('text/html');
}

const app = new Hono();

app.use(logger());
app.use('*', async (c, next) => {
  if (c.req.path.startsWith('/api/') || c.req.path === '/healthz') {
    return await next();
  }

  const assetResponse = await runStaticMiddleware(c, serveBuiltAsset);
  if (assetResponse) {
    return assetResponse;
  }

  if (!shouldServeSpaShell(c)) {
    return await next();
  }

  const indexResponse = await runStaticMiddleware(c, serveIndexHtml);
  if (indexResponse) {
    return indexResponse;
  }

  return c.text('未找到前端构建产物。先执行 pnpm run build，再运行 deno task dev。', 503);
});

registerProxyRoutes(app);
app.onError(handleProxyAppError);

Deno.serve(app.fetch);
