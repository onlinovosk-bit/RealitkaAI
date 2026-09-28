/**
 * Acquisition e2e must never touch hosted production.
 * Mirrors apps/crm/tests/helpers/env-guard.ts plus app.revolis.ai / prod project block.
 */

const PROD_SUPABASE_REF = "ypgajkhqtbriqqmyawyv";
const PROD_HOSTS = ["app.revolis.ai", "revolis.ai"];

export function assertNotProduction(): void {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "";
  const haystack = `${supabaseUrl} ${siteUrl} ${baseUrl}`.toLowerCase();

  if (supabaseUrl.includes(PROD_SUPABASE_REF) || PROD_HOSTS.some((host) => haystack.includes(host))) {
    throw new Error(
      "REFUSED: acquisition e2e must not run against production / https://app.revolis.ai.\n" +
        `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl || "(unset)"}\n` +
        `NEXT_PUBLIC_SITE_URL=${siteUrl || "(unset)"}\n` +
        `PLAYWRIGHT_BASE_URL=${baseUrl || "(unset)"}`,
    );
  }
}

export function isLocalSupabaseUrl(url: string): boolean {
  return url.includes("127.0.0.1") || url.includes("localhost");
}

/** Local stack, or CI ephemeral DB explicitly aliased as TEST_SUPABASE_URL. */
export function canUseSeededTestDb(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url || url.includes(PROD_SUPABASE_REF)) return false;
  if (isLocalSupabaseUrl(url)) return true;
  const testUrl = process.env.TEST_SUPABASE_URL ?? "";
  return process.env.ALLOW_REMOTE_TEST_SUPABASE === "1" && Boolean(testUrl) && url === testUrl;
}

export function getServiceRoleKey(): string | undefined {
  return (
    process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SERVICE_ROLE_KEY
  );
}

export function seedHarnessBlocker(): string | null {
  assertNotProduction();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!canUseSeededTestDb()) {
    return (
      "BLOCKER: /acquisition is SSR (supabase.auth.getUser + loadAcquisitionDashboard). " +
      "E2E_BYPASS_AUTH does not apply to this page, and page.route cannot mock server-side data. " +
      "Tenant isolation needs two seeded local/CI users. Set NEXT_PUBLIC_SUPABASE_URL to local " +
      "Supabase (or ALLOW_REMOTE_TEST_SUPABASE=1 with TEST_SUPABASE_URL). No TEST_USER_PASSWORD / prod credentials."
    );
  }
  if (!getServiceRoleKey()) {
    return (
      "BLOCKER: local/CI seed needs SUPABASE_SERVICE_ROLE_KEY (or TEST_SUPABASE_SERVICE_ROLE_KEY) " +
      "for the non-prod test DB. The Playwright chromium project login (TEST_USER_EMAIL/PASSWORD) " +
      "is a secret and is not used here."
    );
  }
  if (!url) {
    return "BLOCKER: NEXT_PUBLIC_SUPABASE_URL is unset.";
  }
  return null;
}
