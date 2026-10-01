/**
 * Popis chyby, ktorý je bezpečné poslať do logu: iba názov a správa.
 *
 * Do logu nikdy nejde celý objekt chyby. Supabase/PostgREST chyba nesie `details`,
 * v ktorom Postgres vypisuje celý riadok ("Failing row contains (…)") — teda meno,
 * e-mail a telefón leadu, ktorý sa práve vkladal. Vercel runtime logy to držia ~1 h,
 * DB logy dlhšie (PII-GATE-AUDIT, oblasť B).
 */
export function describeError(err: unknown): string {
  const max = 300;
  if (err instanceof Error) return `${err.name}: ${err.message}`.slice(0, max);
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m.slice(0, max);
  }
  return typeof err === "string" ? err.slice(0, max) : `non-error (${typeof err})`;
}
