/** Comma-separated founder inboxes — same pattern as internal ops gates. */
export function parseFounderEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isFounderMetricsViewer(email: string | null | undefined): boolean {
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized) return false;
  const allowlist = parseFounderEmails(process.env.FOUNDER_EMAILS);
  if (allowlist.length === 0) return false;
  return allowlist.includes(normalized);
}

/**
 * Kto smie vidieť founder metriky.
 *
 * Pôvodne to stálo VÝHRADNE na `FOUNDER_EMAILS`. Dôsledok: používateľ
 * s `profiles.is_platform_admin = true` — teda najvyšším oprávnením, aké
 * v aplikácii existuje — dostal 404, ak jeho e-mail v tej env premennej
 * nebol. Stránka sa nepýtala na oprávnenie, ale na zoznam reťazcov.
 *
 * Platform admin teraz stačí sám o sebe. Allowlist ostáva ako druhá cesta
 * pre ľudí bez profilu v aplikácii (napr. účtovník s prístupom len k metrikám).
 */
export function canViewFounderMetrics(input: {
  email: string | null | undefined;
  isPlatformAdmin: boolean | null | undefined;
}): boolean {
  if (input.isPlatformAdmin === true) return true;
  return isFounderMetricsViewer(input.email);
}
