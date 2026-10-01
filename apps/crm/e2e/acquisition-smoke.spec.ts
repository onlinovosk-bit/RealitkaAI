import { test, expect, type Page } from "@playwright/test";
import { assertNotProduction, seedHarnessBlocker } from "./helpers/env-guard";
import { seedAcquisitionTenants, TENANT_A, TENANT_B } from "./helpers/local-seed";

/**
 * Acquisition /acquisition smoke ? local/CI only. Never https://app.revolis.ai.
 *
 * /acquisition is RSC: createClient().auth.getUser() + loadAcquisitionDashboard.
 * E2E_BYPASS_AUTH does not apply. page.route cannot stub SSR data.
 * TEST_USER_EMAIL / TEST_USER_PASSWORD are not used.
 *
 * Tenant assertions run only when a local/CI DB can be seeded (service role)
 * or when ACQUISITION_E2E_* local-seed env is already present. Otherwise skip
 * ? that skip is not a PASS of tenant isolation (API isolation is covered by
 * src/app/api/acquisition/dashboard/__tests__/route.test.ts).
 *
 * Run: cd apps/crm && npx playwright test -c e2e/playwright.config.ts
 */

assertNotProduction();

const SEED_CUSTOMER_ID = "7024414113";
const SEED_PAUSED = 2;
const SEED_LOGGED_TEST = 3;
const RENDER_MS = 15_000;
const LOCAL_SEED_EMAIL = /@(local\.test|revolis\.test|example\.com)$/i;

let seeded: { passwordA: string; passwordB: string } | null = null;
let seedSkipReason: string | null = null;

function localSeedPair(
  emailKey: "ACQUISITION_E2E_EMAIL" | "ACQUISITION_E2E_OTHER_EMAIL",
  passwordKey: "ACQUISITION_E2E_PASSWORD" | "ACQUISITION_E2E_OTHER_PASSWORD",
): { email: string; password: string } | null {
  const email = process.env[emailKey]?.trim() ?? "";
  const password = process.env[passwordKey] ?? "";
  if (!email && !password) return null;
  if (!email || !password) {
    throw new Error(`${emailKey} and ${passwordKey} must be set together (local seed only).`);
  }
  if (!LOCAL_SEED_EMAIL.test(email)) {
    throw new Error(
      `${emailKey} must be a local seed address (@local.test / @revolis.test / @example.com).`,
    );
  }
  return { email, password };
}

test.beforeAll(async () => {
  const envA = localSeedPair("ACQUISITION_E2E_EMAIL", "ACQUISITION_E2E_PASSWORD");
  const envB = localSeedPair("ACQUISITION_E2E_OTHER_EMAIL", "ACQUISITION_E2E_OTHER_PASSWORD");
  if (envA || envB) return;

  const blocker = seedHarnessBlocker();
  if (blocker) {
    seedSkipReason = blocker;
    return;
  }
  try {
    seeded = await seedAcquisitionTenants();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("BLOCKER:")) {
      seedSkipReason = message;
      return;
    }
    throw error;
  }
});

async function loginLocalSeed(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login", { waitUntil: "load", timeout: 60_000 });
  await page.locator('input[name="email"]').waitFor({ state: "visible", timeout: 30_000 });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 15_000 });
}

function tenantALogin(): { email: string; password: string } | null {
  return (
    localSeedPair("ACQUISITION_E2E_EMAIL", "ACQUISITION_E2E_PASSWORD") ??
    (seeded ? { email: TENANT_A.email, password: seeded.passwordA } : null)
  );
}

function tenantBLogin(): { email: string; password: string } | null {
  return (
    localSeedPair("ACQUISITION_E2E_OTHER_EMAIL", "ACQUISITION_E2E_OTHER_PASSWORD") ??
    (seeded ? { email: TENANT_B.email, password: seeded.passwordB } : null)
  );
}

test.describe("Acquisition smoke (local/CI)", () => {
  test.describe.configure({ timeout: 90_000 });

  test("refuses production host and does not navigate to app.revolis.ai", async ({
    page,
    baseURL,
  }) => {
    expect(baseURL ?? "").not.toMatch(/app\.revolis\.ai/i);
    const response = await page.goto("/acquisition", {
      waitUntil: "domcontentloaded",
      timeout: RENDER_MS,
    });
    expect(page.url()).not.toMatch(/app\.revolis\.ai/i);
    expect(response?.status() ?? 0).not.toBe(500);
  });

  test("/acquisition document arrives in under 15s", async ({ page }) => {
    const started = Date.now();
    const response = await page.goto("/acquisition", {
      waitUntil: "domcontentloaded",
      timeout: RENDER_MS,
    });
    expect(Date.now() - started).toBeLessThan(RENDER_MS);
    expect(response?.status() ?? 0).not.toBe(500);
    expect(page.url()).not.toMatch(/app\.revolis\.ai/i);
  });

  test("seed tenant: account 7024414113, 2 PAUSED, 3 LOGGED_TEST", async ({ page }) => {
    const seed = tenantALogin();
    test.skip(
      !seed,
      seedSkipReason ??
        "BLOCKER: no local seed user. RSC /acquisition ignores E2E_BYPASS_AUTH; TEST_USER_* is forbidden. Provide local Supabase + service role, or ACQUISITION_E2E_EMAIL+PASSWORD (@revolis.test).",
    );
    await loginLocalSeed(page, seed!.email, seed!.password);

    const started = Date.now();
    await page.goto("/acquisition", { waitUntil: "domcontentloaded", timeout: RENDER_MS });
    expect(Date.now() - started).toBeLessThan(RENDER_MS);

    await expect(page.getByText("Google Ads (test)")).toBeVisible({ timeout: RENDER_MS });
    await expect(page.getByText(SEED_CUSTOMER_ID).first()).toBeVisible();
    await expect(page.getByText("PAUSED")).toHaveCount(SEED_PAUSED);
    await expect(page.getByText("LOGGED_TEST")).toHaveCount(SEED_LOGGED_TEST);
  });

  test("other tenant does not see seed rows", async ({ page }) => {
    const other = tenantBLogin();
    test.skip(
      !other,
      seedSkipReason ??
        "BLOCKER: tenant isolation needs a second local seed user. This skip is not a PASS. API isolation: dashboard route unit tests.",
    );
    await loginLocalSeed(page, other!.email, other!.password);
    await page.goto("/acquisition", { waitUntil: "domcontentloaded", timeout: RENDER_MS });
    await expect(page.getByText("Google Ads (test)")).toBeVisible({ timeout: RENDER_MS });
    await expect(page.getByText(SEED_CUSTOMER_ID)).toHaveCount(0);
    await expect(page.getByText("RKA-test-byty")).toHaveCount(0);
    await expect(page.getByText("RKB-test-domy")).toHaveCount(0);
    await expect(page.getByText("LOGGED_TEST")).toHaveCount(0);
  });
});
