import { rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
rmSync('.wrangler/deploy', { recursive: true, force: true });
