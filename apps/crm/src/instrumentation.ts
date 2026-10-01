/**
 * Startup environment report (ENV-TS-WIRE). Logs the NAMES of variables the zod
 * schema requires but the runtime lacks. It never throws and never blocks boot:
 * the schema is stricter than what production provides today, so failing fast
 * here would be an outage, not a safeguard. Read the result in Vercel runtime
 * logs (search `[env]`), reconcile the schema, and only then consider failing fast.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { validateEnv } = await import("@/config/env");
    const { ok, issues } = validateEnv();
    if (ok) return;
    console.error(
      `[env] schema ↔ runtime drift (${issues.length}): ` +
        issues.map((i) => `${i.key} (${i.message})`).join(", "),
    );
  } catch (err) {
    console.error("[env] startup check failed", err instanceof Error ? err.message : "unknown");
  }
}
