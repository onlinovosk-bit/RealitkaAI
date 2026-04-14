/**
 * Redakcia PII pre logy, exporty a zobrazenia v enterprise režime.
 */

export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return email ?? "";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const safeLocal =
    local.length <= 2 ? "*" : `${local.slice(0, 2)}${"*".repeat(Math.min(local.length - 2, 4))}`;
  return `${safeLocal}@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `***${digits.slice(-4)}`;
}

export function maskName(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const p = parts[0];
    return p.length <= 2 ? `${p[0]}*` : `${p.slice(0, 2)}…`;
  }
  return `${parts[0][0]}. ${parts[parts.length - 1][0]}.`;
}

export function shouldRedactPiiForExport(request: Request): boolean {
  const url = new URL(request.url);
  if (url.searchParams.get("redactPii") === "0") return false;
  return true;
}
