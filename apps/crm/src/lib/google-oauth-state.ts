import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  return (
    process.env.GOOGLE_OAUTH_STATE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "google-oauth-state-dev-only"
  );
}

/** Podpisovaný state: Google ho vráti v callbacku; overíme integritu a expiráciu. */
export function signGoogleOAuthState(profileId: string): string {
  const t = Date.now();
  const payload = JSON.stringify({ p: profileId, t });
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return Buffer.from(`${payload}::${sig}`, "utf8").toString("base64url");
}

export function verifyGoogleOAuthState(state: string | null, maxAgeMs = 15 * 60 * 1000): string | null {
  if (!state?.trim()) return null;
  try {
    const raw = Buffer.from(state, "base64url").toString("utf8");
    const sep = raw.lastIndexOf("::");
    if (sep < 0) return null;
    const payload = raw.slice(0, sep);
    const sig = raw.slice(sep + 2);
    const expected = createHmac("sha256", secret()).update(payload).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const { p, t } = JSON.parse(payload) as { p: string; t: number };
    if (typeof p !== "string" || typeof t !== "number") return null;
    if (Date.now() - t > maxAgeMs) return null;
    return p;
  } catch {
    return null;
  }
}
