import { createServiceRoleClient } from "@/lib/supabase/admin";

export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const FORBIDDEN_SCOPE_NEEDLES = ["gmail.send", "gmail.compose", "mail.google.com", "gmail.modify"] as const;

export type AcquireEmailPayload = {
  version: 1;
  receivedAt: string;
  mailbox: { agencyId: string };
  email: { to: string; subject: string; text: string; html: string };
};

export type GmailInboundConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  labelId: string;
  agencyId: string;
  acquireSecret: string;
  acquireUrl: string;
};

export type PullResult =
  | { ok: true; skipped?: string; pulled: number; posted: number; errors: string[] }
  | { ok: false; error: string };

export type InboundMailbox = { agencyId: string; email: string };
type FetchFn = typeof fetch;
type GmailHeader = { name?: string; value?: string };
type GmailPart = { mimeType?: string; body?: { data?: string }; parts?: GmailPart[] };
export type GmailMessage = {
  id?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: { headers?: GmailHeader[]; mimeType?: string; body?: { data?: string }; parts?: GmailPart[] };
};

function headerOf(headers: GmailHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function decodeB64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function collectBodies(part: GmailPart | undefined, out: { text: string; html: string }): void {
  if (!part) return;
  if (part.body?.data) {
    const decoded = decodeB64Url(part.body.data);
    if ((part.mimeType ?? "").includes("text/html")) out.html += decoded;
    else out.text += decoded;
  }
  for (const child of part.parts ?? []) collectBodies(child, out);
}

export function buildGmailReadonlyAuthUrl(clientId: string, redirectUri: string): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("scope", GMAIL_READONLY_SCOPE);
  return u.toString();
}

export function assertReadonlyScope(scope: string | undefined): void {
  const raw = scope ?? "";
  for (const needle of FORBIDDEN_SCOPE_NEEDLES) {
    if (raw.includes(needle)) throw new Error("forbidden_gmail_scope");
  }
}

export function readGmailInboundConfig(
  env: NodeJS.Dict<string> = process.env,
): GmailInboundConfig | { error: string } {
  if (env.GMAIL_INBOUND_PULL_ENABLED?.trim() !== "true") return { error: "disabled" };
  const clientId = env.GOOGLE_GMAIL_INBOUND_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.GOOGLE_GMAIL_INBOUND_CLIENT_SECRET?.trim() ?? "";
  const refreshToken = env.GOOGLE_GMAIL_INBOUND_REFRESH_TOKEN?.trim() ?? "";
  const labelId = env.GOOGLE_GMAIL_INBOUND_LABEL_ID?.trim() ?? "";
  const agencyId = env.GOOGLE_GMAIL_INBOUND_AGENCY_ID?.trim() ?? "";
  const acquireSecret = env.ACQUIRE_SHARED_SECRET?.trim() ?? "";
  const base = (env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!clientId || !clientSecret || !refreshToken) return { error: "missing_oauth_env" };
  if (!labelId || !agencyId) return { error: "missing_mailbox_env" };
  if (!acquireSecret || !base) return { error: "missing_acquire_env" };
  return {
    clientId,
    clientSecret,
    refreshToken,
    labelId,
    agencyId,
    acquireSecret,
    acquireUrl: `${base}/api/acquire/email`,
  };
}

export async function refreshGmailAccessToken(cfg: GmailInboundConfig, fetchFn: FetchFn): Promise<string> {
  const res = await fetchFn(GMAIL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: cfg.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json()) as { access_token?: string; scope?: string };
  if (!res.ok || !data.access_token) throw new Error("oauth_refresh_failed");
  assertReadonlyScope(data.scope);
  return data.access_token;
}

export function gmailListUrl(labelId: string): string {
  if (!labelId) throw new Error("label_id_required");
  const u = new URL(`${GMAIL_API_BASE}/messages`);
  u.searchParams.set("labelIds", labelId);
  u.searchParams.set("maxResults", "25");
  return u.toString();
}

export function isDmarcReject(msg: GmailMessage): boolean {
  const ar = headerOf(msg.payload?.headers, "Authentication-Results").toLowerCase();
  return ar.includes("dmarc=fail") && ar.includes("p=reject");
}

export function mapGmailMessageToAcquire(msg: GmailMessage, mailbox: InboundMailbox): AcquireEmailPayload {
  const bodies = { text: "", html: "" };
  collectBodies(msg.payload, bodies);
  const internalMs = Number(msg.internalDate ?? 0);
  const receivedAt =
    Number.isFinite(internalMs) && internalMs > 0 ? new Date(internalMs).toISOString() : new Date().toISOString();
  return {
    version: 1,
    receivedAt,
    mailbox: { agencyId: mailbox.agencyId },
    email: {
      to: mailbox.email,
      subject: headerOf(msg.payload?.headers, "Subject"),
      text: bodies.text,
      html: bodies.html,
    },
  };
}

export async function loadMailboxForAgency(agencyId: string): Promise<InboundMailbox | null> {
  const sb = createServiceRoleClient();
  if (!sb) return null;
  const { data } = await sb
    .from("inbound_mailboxes")
    .select("agency_id,email")
    .eq("agency_id", agencyId)
    .limit(1)
    .maybeSingle();
  const row = data as { agency_id?: string; email?: string } | null;
  if (!row?.email || !row.agency_id) return null;
  return { agencyId: row.agency_id, email: row.email };
}

export async function runGmailInboundPull(deps: {
  env?: NodeJS.Dict<string>;
  fetch: FetchFn;
  loadMailbox?: (agencyId: string) => Promise<InboundMailbox | null>;
  seen?: Set<string>;
}): Promise<PullResult> {
  const cfg = readGmailInboundConfig(deps.env ?? process.env);
  if ("error" in cfg) {
    if (cfg.error === "disabled") return { ok: true, skipped: "disabled", pulled: 0, posted: 0, errors: [] };
    return { ok: false, error: cfg.error };
  }
  const mailbox = await (deps.loadMailbox ?? loadMailboxForAgency)(cfg.agencyId);
  if (!mailbox) return { ok: false, error: "mailbox_not_found" };

  const access = await refreshGmailAccessToken(cfg, deps.fetch);
  const listRes = await deps.fetch(gmailListUrl(cfg.labelId), {
    headers: { Authorization: `Bearer ${access}` },
  });
  if (!listRes.ok) return { ok: false, error: "gmail_list_failed" };
  const listJson = (await listRes.json()) as { messages?: { id?: string }[] };
  const ids = (listJson.messages ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
  const seen = deps.seen ?? new Set<string>();
  let posted = 0;
  const errors: string[] = [];

  for (const id of ids) {
    if (seen.has(id)) continue;
    const getRes = await deps.fetch(`${GMAIL_API_BASE}/messages/${encodeURIComponent(id)}?format=full`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!getRes.ok) {
      errors.push("get_failed");
      continue;
    }
    const msg = (await getRes.json()) as GmailMessage;
    if (!(msg.labelIds ?? []).includes(cfg.labelId)) continue;
    const payload = mapGmailMessageToAcquire(msg, mailbox);
    const postRes = await deps.fetch(cfg.acquireUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-shared-secret": cfg.acquireSecret,
        "x-revolis-request-id": `gmail-pull:${cfg.agencyId}:${id}`,
      },
      body: JSON.stringify(payload),
    });
    if (!postRes.ok) {
      errors.push("acquire_failed");
      continue;
    }
    seen.add(id);
    posted += 1;
  }
  return { ok: true, pulled: ids.length, posted, errors };
}
