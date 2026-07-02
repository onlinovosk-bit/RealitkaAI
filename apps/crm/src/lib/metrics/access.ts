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
