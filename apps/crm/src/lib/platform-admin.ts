/**
 * Platform owner / architect — mimo tenantových rolí (owner/manager/agent).
 * Nastavte v env zoznam e-mailov (rovnaký účet ako prihlásenie cez Supabase Auth).
 */
export function parsePlatformOwnerEmails(): string[] {
  const raw = process.env.PLATFORM_OWNER_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = parsePlatformOwnerEmails();
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}
