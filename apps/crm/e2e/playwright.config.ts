import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

function resolveBaseURL(): string {
  const fromEnv =
    process.env.PLAYWRIGHT_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  if (fromEnv.toLowerCase().includes("revolis.ai")) {
    throw new Error(
      `REFUSED: acquisition e2e must not use hosted Revolis (${fromEnv}). Use http://localhost:3000.`,
    );
  }
  return fromEnv;
}

const webServer =
  process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1"
    ? undefined
    : {
        command: "npm run dev",
        cwd: path.resolve(__dirname, ".."),
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      };

export default defineConfig({
  testDir: __dirname,
  testMatch: /acquisition-smoke\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? "line" : "html",
  timeout: 90_000,
  use: {
    baseURL: resolveBaseURL(),
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "acquisition-smoke",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(webServer ? { webServer } : {}),
});
