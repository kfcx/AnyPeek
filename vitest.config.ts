import { defineConfig } from 'vitest/config';

import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@preview/core': resolve(__dirname, 'packages/preview-core/src'),
      '@preview/renderers': resolve(__dirname, 'packages/preview-renderers/src'),
      '@app': resolve(__dirname, 'src')
    }
  },
  test: {
    environment: 'node',
    include: ['packages/**/*.test.ts', 'server/**/*.test.ts']
  }
});
