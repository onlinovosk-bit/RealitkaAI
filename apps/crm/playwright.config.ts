import { defineConfig, devices } from '@playwright/test';

import dotenv from 'dotenv';
import path from 'path';

// [ADR-010] Načítanie environmentálnych premenných z rootu monorepa
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Definujeme cestu JEDENKRÁT na vrchu
const authFile = path.resolve(__dirname, 'tests/playwright/.auth/user.json');

const webServer =
  process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1'
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        env: {
          ...process.env,
          E2E_BYPASS_AUTH: '1',
        },
      };

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
      testIgnore: [/call-analyzer\.spec\.ts/, /routing-legacy\.spec\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile, // Playwright ho začne hľadať až TU
      },
      dependencies: ['setup'],
    },
    // Public routing checks bez auth setup dependency (legacy URL guards)
    {
      name: 'chromium-public',
      testMatch: /routing-legacy\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Call Analyzer: E2E_BYPASS_AUTH=1 (webServer alebo ručný dev — pozri docs)
    {
      name: 'chromium-call-analyzer',
      testMatch: /call-analyzer\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // API + route smoke (engineering_live) — bez auth setup dependency
    {
      name: 'smoke',
      testMatch: /\/(smoke|proof-funnel)\.spec\.ts$/,
      workers: 1,
      timeout: 90_000,
      use: { ...devices['Desktop Chrome'] },
    },
    // Universal import route smoke — bez auth setup dependency
    {
      name: 'universal-import-smoke',
      testMatch: /universal-import-smoke\.spec\.ts/,
      workers: 1,
      timeout: 60_000,
      use: { ...devices['Desktop Chrome'] },
    },
    // Valuation widget GDPR/sandbox acceptance — ephemeral DB + service role
    {
      name: 'valuation-widget',
      testMatch: /valuation-widget\.spec\.ts/,
      workers: 1,
      timeout: 120_000,
      use: { ...devices['Desktop Chrome'] },
    },
    // Vercel Preview deploy smoke — public routes, no CRON / prod DB guard
    {
      name: 'preview-smoke',
      testMatch: /preview-smoke\.spec\.ts/,
      workers: 1,
      timeout: 90_000,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(webServer ? { webServer } : {}),
});
