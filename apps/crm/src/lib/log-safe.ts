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
  if (err instanceof Error) return mask(`${err.name}: ${err.message}`).slice(0, max);
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return mask(m).slice(0, max);
  }
  return typeof err === "string" ? mask(err).slice(0, max) : `non-error (${typeof err})`;
}

/**
 * Samotná správa chyby môže niesť adresu: SMTP chyby píšu „Recipient rejected: <a@b.sk>",
 * webhook odpoveď môže vrátiť späť, čo sme poslali. Preto sa v nej maskujú e-maily
 * a dlhé číselné rady (telefóny).
 */
function mask(text: string): string {
  return text
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g, "[e-mail]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[číslo]");
}
