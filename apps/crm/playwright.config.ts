import { defineConfig, devices } from '@playwright/test';

import dotenv from 'dotenv';
import path from 'path';

// [ADR-010] Načítanie environmentálnych premenných z rootu monorepa
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Definujeme cestu JEDENKRÁT na vrchu
const authFile = path.resolve(__dirname, 'tests/playwright/.auth/user.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    // storageState sem NEPATRÍ!
  },
  projects: [
    // 1. PROJEKT: SETUP (Tento súbor NEPOUŽÍVA storageState, on ho vytvára)
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    // 2. PROJEKT: CHROMIUM (Tento súbor VYŽADUJE storageState)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile, // Playwright ho začne hľadať až TU
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
