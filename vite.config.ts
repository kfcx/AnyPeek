import { resolve } from 'node:path';

import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), cloudflare()],
  resolve: {
    alias: {
      '@preview/core': resolve(__dirname, 'packages/preview-core/src'),
      '@preview/renderers': resolve(__dirname, 'packages/preview-renderers/src'),
      '@app': resolve(__dirname, 'src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true
  }
});

