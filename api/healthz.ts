import { Hono } from 'hono';
import { handle } from 'hono/vercel';

const app = new Hono();

app.get('/healthz', (c) => c.json({ ok: true }));
app.get('/api/healthz', (c) => c.json({ ok: true }));

export default handle(app);
