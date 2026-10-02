import { createServiceRoleClient } from "@/lib/supabase/admin";
import { pickAgencyMailbox, type MailboxRow } from "./mailbox-routing";

export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const FORBIDDEN_SCOPE_NEEDLES = ["gmail.send", "gmail.compose", "mail.google.com", "gmail.modify"] as const;

export type AcquireEmailPayload = {
  version: 1;
  receivedAt: string;
  mailbox: { agencyId: string };
  email: { to: string; from: string; subject: string; text: string; html: string };
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
  | {
      ok: true;
      skipped?: string;
      pulled: number;
      posted: number;
      errors: string[];
      /** Už spracované v predchádzajúcich behoch — telo sa nesťahovalo druhýkrát. */
      alreadySeen?: number;
      /** Správa bez nášho štítku: prečítané hlavičky stačili na zahodenie, nikam sa neposiela. */
      outsideLabel?: number;
    }
  | { ok: false; error: string };

/**
 * Pamäť spracovaných Gmail ID. Bez nej by každý beh znova sťahoval telá správ zo
 * štítku (zbytočné čítanie cudzích dát). Ukladá sa iba ID správy, nikdy obsah.
 */
export type SeenStore = {
  /** Z `ids` vráti tie, ktoré už boli spracované. Musí vyhodiť, ak sa nedá zistiť. */
  filterSeen(agencyId: string, ids: string[]): Promise<Set<string>>;
  markSeen(agencyId: string, ids: string[], outcome: string): Promise<void>;
  /** Best-effort údržba; zlyhanie nesmie zhodiť beh. */
  prune?(agencyId: string): Promise<void>;
};

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

/** Strop na telo jednej správy. Dopyt z portálu má pár kB; viac je newsletter alebo príloha. */
export const MAX_BODY_CHARS = 200_000;
const DEFAULT_LOOKBACK_DAYS = 3;
const PAGE_SIZE = 50;
const MAX_PAGES = 3;
/** Dlhšie než najväčší lookback (14 dní), takže prune nikdy nezabudne ID, ktoré list ešte vráti. */
const SEEN_RETENTION_DAYS = 30;

function collectBodies(part: GmailPart | undefined, out: { text: string; html: string }): void {
  if (!part) return;
  if (part.body?.data) {
    const decoded = decodeB64Url(part.body.data);
    if ((part.mimeType ?? "").includes("text/html")) out.html = (out.html + decoded).slice(0, MAX_BODY_CHARS);
    else out.text = (out.text + decoded).slice(0, MAX_BODY_CHARS);
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
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; scope?: string; error?: string };
  // `invalid_grant` = refresh token expiroval/bol odvolaný (aplikácia v Testing režime ho ruší po 7 dňoch).
  // Kód chyby je verejný protokolový reťazec, nie token — môže ísť do denníka.
  if (!res.ok || !data.access_token) throw new Error(`oauth_refresh_failed:${data.error ?? res.status}`);
  assertReadonlyScope(data.scope);
  return data.access_token;
}

export function lookbackDaysFrom(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 14 ? n : DEFAULT_LOOKBACK_DAYS;
}

export function gmailListUrl(labelId: string, opts: { pageToken?: string; lookbackDays?: number } = {}): string {
  if (!labelId) throw new Error("label_id_required");
  const u = new URL(`${GMAIL_API_BASE}/messages`);
  u.searchParams.set("labelIds", labelId);
  u.searchParams.set("maxResults", String(PAGE_SIZE));
  // Časové okno: bez neho by každý beh prechádzal celú históriu štítku.
  u.searchParams.set("q", `newer_than:${opts.lookbackDays ?? DEFAULT_LOOKBACK_DAYS}d`);
  if (opts.pageToken) u.searchParams.set("pageToken", opts.pageToken);
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
      // Záložný signál zdroja: keď portál prestane uvádzať svoj názov v tele,
      // rozpozná ho doména odosielateľa (SOURCE-FROM).
      from: headerOf(msg.payload?.headers, "From"),
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
    .select("email,profile_id")
    .eq("agency_id", agencyId);
  // Pull nevie, komu mail patrí → smie niesť len adresu celej agentúry (viď pickAgencyMailbox).
  const email = pickAgencyMailbox((data ?? []) as MailboxRow[]);
  return email ? { agencyId, email } : null;
}

export function memorySeenStore(set: Set<string> = new Set()): SeenStore {
  return {
    async filterSeen(_agencyId, ids) {
      return new Set(ids.filter((id) => set.has(id)));
    },
    async markSeen(_agencyId, ids) {
      for (const id of ids) set.add(id);
    },
  };
}

export function supabaseSeenStore(): SeenStore | null {
  const sb = createServiceRoleClient();
  if (!sb) return null;
  return {
    async filterSeen(agencyId, ids) {
      if (ids.length === 0) return new Set();
      const { data, error } = await sb
        .from("agency_gmail_inbound_seen")
        .select("gmail_message_id")
        .eq("agency_id", agencyId)
        .in("gmail_message_id", ids);
      if (error) throw new Error("seen_store_read_failed");
      return new Set((data ?? []).map((r: { gmail_message_id: string }) => r.gmail_message_id));
    },
    async markSeen(agencyId, ids, outcome) {
      if (ids.length === 0) return;
      const { error } = await sb
        .from("agency_gmail_inbound_seen")
        .upsert(
          ids.map((gmail_message_id) => ({ agency_id: agencyId, gmail_message_id, outcome })),
          { onConflict: "agency_id,gmail_message_id", ignoreDuplicates: true },
        );
      if (error) throw new Error("seen_store_write_failed");
    },
    async prune(agencyId) {
      const cutoff = new Date(Date.now() - SEEN_RETENTION_DAYS * 86_400_000).toISOString();
      await sb.from("agency_gmail_inbound_seen").delete().eq("agency_id", agencyId).lt("acquired_at", cutoff);
    },
  };
}

/** 4xx, ktoré sa opakovaním nezmení (zlý payload) — správu zapíšeme ako vybavenú, nie dookola. */
function isPermanentAcquireRejection(status: number): boolean {
  return status >= 400 && status < 500 && status !== 401 && status !== 408 && status !== 429;
}

async function listLabeledIds(cfg: GmailInboundConfig, access: string, fetchFn: FetchFn, lookbackDays: number) {
  const ids: string[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const res = await fetchFn(gmailListUrl(cfg.labelId, { pageToken, lookbackDays }), {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!res.ok) throw new Error("gmail_list_failed");
    const json = (await res.json()) as { messages?: { id?: string }[]; nextPageToken?: string };
    for (const m of json.messages ?? []) if (m.id) ids.push(m.id);
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }
  return ids;
}

export async function runGmailInboundPull(deps: {
  env?: NodeJS.Dict<string>;
  fetch: FetchFn;
  loadMailbox?: (agencyId: string) => Promise<InboundMailbox | null>;
  seenStore?: SeenStore;
}): Promise<PullResult> {
  const env = deps.env ?? process.env;
  const cfg = readGmailInboundConfig(env);
  if ("error" in cfg) {
    if (cfg.error === "disabled") return { ok: true, skipped: "disabled", pulled: 0, posted: 0, errors: [] };
    return { ok: false, error: cfg.error };
  }
  // Bez pamäte spracovaných správ by sme schránku čítali dookola. Radšej nič, než čítať naslepo.
  const store = deps.seenStore ?? supabaseSeenStore();
  if (!store) return { ok: false, error: "seen_store_unavailable" };
  const mailbox = await (deps.loadMailbox ?? loadMailboxForAgency)(cfg.agencyId);
  if (!mailbox) return { ok: false, error: "mailbox_not_found" };

  try {
    const access = await refreshGmailAccessToken(cfg, deps.fetch);
    const ids = await listLabeledIds(cfg, access, deps.fetch, lookbackDaysFrom(env.GOOGLE_GMAIL_INBOUND_LOOKBACK_DAYS));
    const seen = await store.filterSeen(cfg.agencyId, ids);
    const fresh = ids.filter((id) => !seen.has(id));
    let posted = 0;
    let outsideLabel = 0;
    const errors: string[] = [];
    const done: Array<{ id: string; outcome: string }> = [];

    for (const id of fresh) {
      try {
        const getRes = await deps.fetch(`${GMAIL_API_BASE}/messages/${encodeURIComponent(id)}?format=full`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        if (!getRes.ok) {
          errors.push("get_failed");
          continue;
        }
        const msg = (await getRes.json()) as GmailMessage;
        if (!(msg.labelIds ?? []).includes(cfg.labelId)) {
          outsideLabel += 1;
          done.push({ id, outcome: "outside_label" });
          continue;
        }
        const postRes = await deps.fetch(cfg.acquireUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-shared-secret": cfg.acquireSecret,
            "x-revolis-request-id": `gmail-pull:${cfg.agencyId}:${id}`,
          },
          body: JSON.stringify(mapGmailMessageToAcquire(msg, mailbox)),
        });
        if (postRes.ok) {
          posted += 1;
          done.push({ id, outcome: "acquired" });
        } else if (isPermanentAcquireRejection(postRes.status)) {
          errors.push(`acquire_rejected_${postRes.status}`);
          done.push({ id, outcome: `rejected_${postRes.status}` });
        } else {
          errors.push("acquire_failed");
        }
      } catch {
        errors.push("message_failed");
      }
    }

    for (const outcome of new Set(done.map((d) => d.outcome))) {
      await store.markSeen(cfg.agencyId, done.filter((d) => d.outcome === outcome).map((d) => d.id), outcome);
    }
    await store.prune?.(cfg.agencyId).catch(() => undefined);
    return { ok: true, pulled: fresh.length, posted, errors, alreadySeen: seen.size, outsideLabel };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "pull_failed" };
  }
}
