import { handle } from 'hono/vercel';

import { createProxyApp } from '../server/app';

export default handle(createProxyApp({ enableLogger: false }));
