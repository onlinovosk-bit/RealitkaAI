/**
 * Startup environment report (ENV-TS-WIRE / ENV-SCHEMA-RECONCILE). Logs, by NAME
 * only: (1) what the schema hard-requires and the runtime lacks, (2) variables
 * whose absence silently kills a feature (`degraded`). Throws (fail-fast) only for
 * CRITICAL_ENV_KEYS in production; everything else only logs. Read it in Vercel runtime logs (search `[env]`).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  let fatal: string[] = [];
  try {
    const { validateEnv, failFastKeys } = await import("@/config/env");
    const { ok, issues, degraded } = validateEnv();
    fatal = failFastKeys(issues);
    if (!ok) {
      console.error(
        `[env] schema ↔ runtime drift (${issues.length}): ` +
          issues.map((i) => `${i.key} (${i.message})`).join(", "),
      );
    }
    if (degraded.length > 0) {
      console.error(
        `[env] degraded (${degraded.length}): ` + degraded.map((d) => `${d.key} → ${d.feature}`).join("; "),
      );
    }
  } catch (err) {
    console.error("[env] startup check failed", err instanceof Error ? err.message : "unknown");
  }
  // Mimo try/catch zámerne: kritická chýbajúca premenná má zhodiť štart, nie skončiť v logu.
  if (fatal.length > 0) {
    throw new Error(`[env] fail-fast: chýba/neplatné ${fatal.join(", ")} (vypínač: ENV_FAILFAST=off)`);
  }
}
