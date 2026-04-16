import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/lib': resolve(__dirname, './src/lib'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    include: [
      'src/lib/__tests__/**/*.test.ts',
      'src/components/notifications/**/*.test.tsx',
      'src/components/layout/**/*.test.tsx',
    ],
  },
});
