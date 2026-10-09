import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * GMAIL-CONNECT — pripojenie Gmailu agentúry cez OAuth (gmail.readonly), bez kopírovania tokenov.
 *
 * Fail-closed: bez vlastných tajomstiev (state, kľúč tokenu) sa nič nepripojí. Žiadny
 * vývojársky záložný kľúč — ten by v produkcii potichu podpísal state alebo zašifroval
 * token verejne známym kľúčom.
 */
export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const CONNECT_SCOPES = [GMAIL_READONLY_SCOPE, "openid", "email"] as const;
export const DEFAULT_LABEL_NAME = "Revolis";
const STATE_MAX_AGE_MS = 15 * 60 * 1000;
const KEY_VERSION = "v1";

type FetchFn = typeof fetch;

export type ConnectConfig = {
  clientId: string;
  clientSecret: string;
  stateSecret: string;
  tokenKey: Buffer;
  redirectUri: string;
};

export function readConnectConfig(
  env: NodeJS.Dict<string>,
  appUrlFallback: string,
): ConnectConfig | { error: string } {
  const clientId = env.GOOGLE_GMAIL_INBOUND_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.GOOGLE_GMAIL_INBOUND_CLIENT_SECRET?.trim() ?? "";
  const stateSecret = env.GMAIL_INBOUND_STATE_SECRET?.trim() ?? "";
  const rawKey = env.GMAIL_INBOUND_TOKEN_KEY?.trim() ?? "";
  if (!clientId || !clientSecret) return { error: "missing_oauth_env" };
  if (stateSecret.length < 32) return { error: "missing_state_secret" };
  const tokenKey = Buffer.from(rawKey, "base64");
  if (tokenKey.length !== 32) return { error: "missing_token_key" };
  const base = (env.NEXT_PUBLIC_APP_URL?.trim() || env.APP_URL?.trim() || appUrlFallback).replace(/\/$/, "");
  return {
    clientId,
    clientSecret,
    stateSecret,
    tokenKey,
    redirectUri: `${base}/api/integrations/gmail-inbound/callback`,
  };
}

// ── šifrovanie tokenu ────────────────────────────────────────────────────────

export function encryptToken(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [KEY_VERSION, iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
}

export function decryptToken(blob: string, key: Buffer): string {
  const [version, iv, tag, ct] = blob.split(".");
  if (version !== KEY_VERSION || !iv || !tag || !ct) throw new Error("token_blob_invalid");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}

// ── state (CSRF + väzba na agentúru a profil, ktoré spustili pripojenie) ─────

export type ConnectState = { agencyId: string; profileId: string };

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function signConnectState(s: ConnectState, secret: string, now = Date.now()): string {
  const payload = JSON.stringify({ a: s.agencyId, p: s.profileId, t: now });
  return Buffer.from(`${payload}::${sign(payload, secret)}`, "utf8").toString("base64url");
}

export function verifyConnectState(
  state: string | null,
  secret: string,
  now = Date.now(),
): ConnectState | null {
  if (!state || !secret) return null;
  try {
    const raw = Buffer.from(state, "base64url").toString("utf8");
    const sep = raw.lastIndexOf("::");
    if (sep < 0) return null;
    const payload = raw.slice(0, sep);
    const a = Buffer.from(raw.slice(sep + 2), "hex");
    const b = Buffer.from(sign(payload, secret), "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(payload) as { a?: unknown; p?: unknown; t?: unknown };
    if (typeof parsed.a !== "string" || typeof parsed.p !== "string" || typeof parsed.t !== "number") return null;
    if (now - parsed.t > STATE_MAX_AGE_MS || parsed.t > now + 60_000) return null;
    return { agencyId: parsed.a, profileId: parsed.p };
  } catch {
    return null;
  }
}

// ── OAuth ────────────────────────────────────────────────────────────────────

export function buildConnectUrl(cfg: ConnectConfig, state: string, loginHint?: string | null): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "false");
  u.searchParams.set("scope", CONNECT_SCOPES.join(" "));
  u.searchParams.set("state", state);
  if (loginHint) u.searchParams.set("login_hint", loginHint);
  return u.toString();
}

/** Prijmeme iba presne povolené scopy a gmail.readonly musí byť medzi nimi. Inak sa nič neuloží. */
export function validateGrantedScopes(scope: string | undefined): string[] {
  const granted = (scope ?? "").split(/\s+/).filter(Boolean);
  const allowed = new Set<string>(CONNECT_SCOPES);
  if (!granted.includes(GMAIL_READONLY_SCOPE)) throw new Error("scope_readonly_missing");
  // Google občas vráti dlhé tvary openid/email scopov; tie sú neškodné a normalizujeme ich.
  const normalized = granted.map((s) =>
    s === "https://www.googleapis.com/auth/userinfo.email" ? "email" : s,
  );
  for (const s of normalized) if (!allowed.has(s)) throw new Error("forbidden_gmail_scope");
  return [...new Set(normalized)];
}

export type ExchangeResult = { refreshToken: string; gmailUserEmail: string; scopes: string[] };

export async function exchangeCodeForConnection(
  cfg: ConnectConfig,
  code: string,
  fetchFn: FetchFn,
): Promise<ExchangeResult> {
  const res = await fetchFn("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    error?: string;
  };
  if (!res.ok || !data.access_token) throw new Error(`token_exchange_failed:${data.error ?? res.status}`);
  const scopes = validateGrantedScopes(data.scope);
  // Bez refresh tokenu (Google ho dá len pri prvom súhlase) by pull po hodine prestal fungovať.
  if (!data.refresh_token) throw new Error("refresh_token_missing");
  const infoRes = await fetchFn("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const info = (await infoRes.json().catch(() => ({}))) as { email?: string };
  if (!infoRes.ok || !info.email) throw new Error("userinfo_failed");
  return { refreshToken: data.refresh_token, gmailUserEmail: info.email, scopes };
}

export async function revokeGoogleToken(token: string, fetchFn: FetchFn): Promise<boolean> {
  try {
    const res = await fetchFn("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Kto smie pripojiť/odpojiť Gmail agentúry: aktívny vlastník alebo manažér s priradenou agentúrou. */
export function canManageGmailConnection(
  profile: { role?: string | null; agency_id?: string | null; is_active?: boolean | null } | null,
): profile is { role: string; agency_id: string; is_active: boolean } {
  if (!profile?.agency_id || profile.is_active === false) return false;
  return ["owner", "manager"].includes((profile.role ?? "").trim().toLowerCase());
}
