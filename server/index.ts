import dns from 'node:dns/promises';

import { serve } from '@hono/node-server';

import { createProxyApp } from './app.ts';

const port = Number.parseInt(process.env.PORT ?? '8788', 10);

const app = createProxyApp({
  resolveHostname: async (hostname) => {
    const results = await dns.lookup(hostname, { all: true, verbatim: true });
    return results.map((entry) => entry.address);
  }
});

serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.log(`Preview proxy listening on http://localhost:${info.port}`);
  }
);
