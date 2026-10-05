import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

// Marketing nemá vlastný test runner; vitest sa berie z workspace (hoisted v koreňovom node_modules).
// Alias `@` kopíruje tsconfig (`@/*` -> CRM src), lebo zdieľané CRM moduly ho používajú.
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: { '@': resolve(__dirname, '../crm/src') },
  },
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.{ts,tsx}'],
  },
})
