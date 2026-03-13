import { Hono, type Context } from 'hono';
import { serveStatic } from 'hono/deno';
import { logger } from 'hono/logger';

import { handleProxyAppError, registerProxyRoutes } from './server/app.ts';

const serveBuiltAsset = serveStatic({ root: './dist/client' });
const serveIndexHtml = serveStatic({ path: './dist/client/index.html' });

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

  await serveBuiltAsset(c, async () => {});
  if (c.finalized) {
    return;
  }

  if (!shouldServeSpaShell(c)) {
    return await next();
  }

  await serveIndexHtml(c, async () => {});
});

registerProxyRoutes(app);
app.onError(handleProxyAppError);

Deno.serve(app.fetch);
