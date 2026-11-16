import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@revolis/control-contract': resolve(
        __dirname,
        '../../packages/control-contract/src/index.ts',
      ),
      '@revolis/model-gateway/usage': resolve(
        __dirname,
        '../../packages/model-gateway/src/usage.ts',
      ),
      '@revolis/model-gateway/config': resolve(
        __dirname,
        '../../packages/model-gateway/src/config.ts',
      ),
      '@revolis/model-gateway/subscription-capacity': resolve(
        __dirname,
        '../../packages/model-gateway/src/subscription-capacity.ts',
      ),
      '@': resolve(__dirname, './src'),
      '@/lib': resolve(__dirname, './src/lib'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/verification/**/*.{test,spec}.{ts,tsx}',
      'tests/integration/**/*.{test,spec}.{ts,tsx}',
      'tests/rls/**/*.{test,spec}.{ts,tsx}',
    ],
  },
});
