import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertReadonlyScope,
  buildGmailReadonlyAuthUrl,
  GMAIL_API_BASE,
  GMAIL_READONLY_SCOPE,
  GMAIL_TOKEN_URL,
  gmailListUrl,
  isDmarcReject,
  lookbackDaysFrom,
  MAX_BODY_CHARS,
  mapGmailMessageToAcquire,
  memorySeenStore,
  readGmailInboundConfig,
  runGmailInboundPull,
  type GmailMessage,
} from "../gmail-pull";

const AGENCY = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const ALIAS = "demo-test@revolis.ai";
const LABEL = "Label_Revolis";
const MAILBOX = { agencyId: AGENCY, email: ALIAS };
const fixtures = JSON.parse(
  readFileSync(join(process.cwd(), "src/lib/inbound/__tests__/fixtures/gmail-api.json"), "utf8"),
) as {
  token_readonly: { access_token: string; scope: string };
  token_with_send: { scope: string };
  list_labeled: unknown;
  message_dmarc_reject: unknown;
  message_plain_inquiry: unknown;
  message_unlabeled: unknown;
};

const ENV = {
  GMAIL_INBOUND_PULL_ENABLED: "true",
  GOOGLE_GMAIL_INBOUND_CLIENT_ID: "fixture-client-id",
  GOOGLE_GMAIL_INBOUND_CLIENT_SECRET: "fixture-client-secret",
  GOOGLE_GMAIL_INBOUND_REFRESH_TOKEN: "1//fixture-refresh",
  GOOGLE_GMAIL_INBOUND_LABEL_ID: LABEL,
  GOOGLE_GMAIL_INBOUND_AGENCY_ID: AGENCY,
  ACQUIRE_SHARED_SECRET: "fixture-acquire-secret",
  NEXT_PUBLIC_APP_URL: "https://crm.test",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("gmail inbound pull (mock-first)", () => {
  it("consent URL is gmail.readonly only", () => {
    const url = buildGmailReadonlyAuthUrl("fixture-client-id", "https://developers.google.com/oauthplayground");
    expect(url).toContain(encodeURIComponent(GMAIL_READONLY_SCOPE));
    expect(url).not.toContain("gmail.send");
    expect(url).not.toContain("mail.google.com");
  });

  it("rejects token scopes that include send", () => {
    expect(() => assertReadonlyScope(fixtures.token_with_send.scope)).toThrow("forbidden_gmail_scope");
  });

  it("lists only with labelIds", () => {
    const url = gmailListUrl(LABEL);
    expect(url.startsWith(`${GMAIL_API_BASE}/messages`)).toBe(true);
    expect(url).toContain(`labelIds=${LABEL}`);
    expect(() => gmailListUrl("")).toThrow("label_id_required");
  });

  it("maps DMARC p=REJECT fixture onto POST /api/acquire/email", async () => {
    const msg = fixtures.message_dmarc_reject as GmailMessage;
    expect(isDmarcReject(msg)).toBe(true);
    const posted: Array<{ url: string; init?: RequestInit }> = [];
    const fetchFn: typeof fetch = async (input, init) => {
      const url = String(input);
      posted.push({ url, init });
      if (url === GMAIL_TOKEN_URL) return jsonResponse(fixtures.token_readonly);
      if (url.includes("/messages?") && url.includes(`labelIds=${LABEL}`)) return jsonResponse(fixtures.list_labeled);
      if (url.includes("/messages/msg-dmarc-reject")) return jsonResponse(fixtures.message_dmarc_reject);
      if (url.includes("/messages/msg-plain-inquiry")) return jsonResponse(fixtures.message_plain_inquiry);
      if (url.includes("/messages/msg-unlabeled")) throw new Error("unlabeled_get_forbidden");
      if (url === "https://crm.test/api/acquire/email") return jsonResponse({ ok: true, lead_created: true });
      throw new Error(`unexpected_fetch:${url}`);
    };

    const result = await runGmailInboundPull({
      env: ENV,
      fetch: fetchFn,
      loadMailbox: async () => MAILBOX,
      seenStore: memorySeenStore(),
    });
    expect(result).toEqual({ ok: true, pulled: 2, posted: 2, errors: [], alreadySeen: 0, outsideLabel: 0 });

    const acquireCalls = posted.filter((c) => c.url.endsWith("/api/acquire/email"));
    expect(acquireCalls).toHaveLength(2);
    const dmarcBody = JSON.parse(String(acquireCalls[0]?.init?.body)) as ReturnType<typeof mapGmailMessageToAcquire>;
    expect(dmarcBody.version).toBe(1);
    expect(dmarcBody.mailbox.agencyId).toBe(AGENCY);
    expect(dmarcBody.email.to).toBe(ALIAS);
    expect(dmarcBody.email.to).not.toBe("makler@example.com");
    expect(dmarcBody.email.subject).toContain("3-izbovy");
    expect(dmarcBody.email.text).toContain("jana@example.com");
    const hdrs = acquireCalls[0]?.init?.headers as Record<string, string>;
    expect(hdrs["x-shared-secret"]).toBe("fixture-acquire-secret");
    expect(hdrs["x-revolis-request-id"]).toMatch(/^gmail-pull:/);
    expect(posted.some((c) => c.url.includes("msg-unlabeled"))).toBe(false);
  });

  it("skips unlabeled messages even if list leaked an id", async () => {
    const fetchFn: typeof fetch = async (input) => {
      const url = String(input);
      if (url === GMAIL_TOKEN_URL) return jsonResponse(fixtures.token_readonly);
      if (url.includes("/messages?")) {
        return jsonResponse({ messages: [{ id: "msg-unlabeled" }] });
      }
      if (url.includes("/messages/msg-unlabeled")) return jsonResponse(fixtures.message_unlabeled);
      if (url.endsWith("/api/acquire/email")) throw new Error("acquire_must_not_run");
      throw new Error(`unexpected_fetch:${url}`);
    };
    const result = await runGmailInboundPull({
      env: ENV,
      fetch: fetchFn,
      loadMailbox: async () => MAILBOX,
      seenStore: memorySeenStore(),
    });
    expect(result).toMatchObject({ ok: true, posted: 0, pulled: 1, outsideLabel: 1 });
  });

  it("does not call Google when pull is disabled", async () => {
    const result = await runGmailInboundPull({
      env: { ...ENV, GMAIL_INBOUND_PULL_ENABLED: "false" },
      fetch: async () => {
        throw new Error("live_google_forbidden");
      },
    });
    expect(result).toMatchObject({ ok: true, skipped: "disabled", posted: 0 });
    expect(readGmailInboundConfig({}).error).toBe("disabled");
  });

  it("source contract: acquire pipeline only, no leads insert, no calendar tokens", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/inbound/gmail-pull.ts"), "utf8");
    expect(src).toContain("/api/acquire/email");
    expect(src).toContain("inbound_mailboxes");
    expect(src).toContain("x-shared-secret");
    expect(src).not.toContain('from("leads")');
    expect(src).not.toContain("profile_google_calendar");
    expect(src).toContain("FORBIDDEN_SCOPE_NEEDLES");
    expect(src).toContain("assertReadonlyScope");
  });
});

describe("gmail inbound pull — dokončenie (trvalý dedup, hranice čítania)", () => {
  type Call = { url: string; init?: RequestInit };

  function harness(opts: { acquireStatus?: number; acquireThrows?: boolean; listIds?: string[] } = {}) {
    const calls: Call[] = [];
    const ids = opts.listIds ?? ["msg-dmarc-reject", "msg-plain-inquiry"];
    const fetchFn: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (url === GMAIL_TOKEN_URL) return jsonResponse(fixtures.token_readonly);
      if (url.includes("/messages?")) return jsonResponse({ messages: ids.map((id) => ({ id })) });
      if (url.includes("/messages/msg-dmarc-reject")) return jsonResponse(fixtures.message_dmarc_reject);
      if (url.includes("/messages/msg-plain-inquiry")) return jsonResponse(fixtures.message_plain_inquiry);
      if (url.includes("/messages/msg-unlabeled")) return jsonResponse(fixtures.message_unlabeled);
      if (url === "https://crm.test/api/acquire/email") {
        if (opts.acquireThrows) throw new Error("network");
        return jsonResponse({ ok: true }, opts.acquireStatus ?? 200);
      }
      throw new Error(`unexpected_fetch:${url}`);
    };
    return { calls, fetchFn };
  }
  const gets = (calls: Call[]) => calls.filter((c) => /\/messages\/[^?]+\?format=full/.test(c.url));

  it("druhý beh už správy zo štítku nesťahuje ani neposiela znova", async () => {
    const store = memorySeenStore();
    const first = harness();
    await runGmailInboundPull({ env: ENV, fetch: first.fetchFn, loadMailbox: async () => MAILBOX, seenStore: store });
    expect(gets(first.calls)).toHaveLength(2);

    const second = harness();
    const res = await runGmailInboundPull({ env: ENV, fetch: second.fetchFn, loadMailbox: async () => MAILBOX, seenStore: store });
    expect(res).toMatchObject({ ok: true, pulled: 0, posted: 0, alreadySeen: 2 });
    expect(gets(second.calls)).toHaveLength(0);
    expect(second.calls.some((c) => c.url.endsWith("/api/acquire/email"))).toBe(false);
  });

  it("správa mimo štítka sa zahodí a zapíše ako vybavená, aby sa nečítala znova", async () => {
    const store = memorySeenStore();
    const h = harness({ listIds: ["msg-unlabeled"] });
    const res = await runGmailInboundPull({ env: ENV, fetch: h.fetchFn, loadMailbox: async () => MAILBOX, seenStore: store });
    expect(res).toMatchObject({ ok: true, posted: 0, outsideLabel: 1 });
    expect(h.calls.some((c) => c.url.endsWith("/api/acquire/email"))).toBe(false);
    expect([...(await store.filterSeen(AGENCY, ["msg-unlabeled"]))]).toEqual(["msg-unlabeled"]);
  });

  it("dočasná chyba acquire (5xx, 401, sieť) správu NEoznačí — zopakuje sa v ďalšom behu", async () => {
    for (const opt of [{ acquireStatus: 503 }, { acquireStatus: 401 }, { acquireStatus: 429 }, { acquireThrows: true }]) {
      const store = memorySeenStore();
      const h = harness(opt);
      const res = await runGmailInboundPull({ env: ENV, fetch: h.fetchFn, loadMailbox: async () => MAILBOX, seenStore: store });
      expect(res).toMatchObject({ ok: true, posted: 0 });
      expect((res as { errors: string[] }).errors.length).toBe(2);
      expect((await store.filterSeen(AGENCY, ["msg-dmarc-reject", "msg-plain-inquiry"])).size).toBe(0);
    }
  });

  it("trvalé odmietnutie (400) sa zapíše ako vybavené — zlá správa sa nesmie točiť donekonečna", async () => {
    const store = memorySeenStore();
    const h = harness({ acquireStatus: 400 });
    const res = await runGmailInboundPull({ env: ENV, fetch: h.fetchFn, loadMailbox: async () => MAILBOX, seenStore: store });
    expect(res).toMatchObject({ ok: true, posted: 0, errors: ["acquire_rejected_400", "acquire_rejected_400"] });
    expect((await store.filterSeen(AGENCY, ["msg-dmarc-reject", "msg-plain-inquiry"])).size).toBe(2);
  });

  it("pamäť spracovaných správ sa nedá načítať → nič sa nečíta (fail-closed)", async () => {
    const broken = {
      filterSeen: async () => {
        throw new Error("seen_store_read_failed");
      },
      markSeen: async () => undefined,
    };
    const h = harness();
    const res = await runGmailInboundPull({ env: ENV, fetch: h.fetchFn, loadMailbox: async () => MAILBOX, seenStore: broken });
    expect(res).toEqual({ ok: false, error: "seen_store_read_failed" });
    expect(gets(h.calls)).toHaveLength(0);
  });

  it("vypršaný token vráti pomenovanú chybu, nie výnimku", async () => {
    const fetchFn: typeof fetch = async () => jsonResponse({ error: "invalid_grant" }, 400);
    const res = await runGmailInboundPull({ env: ENV, fetch: fetchFn, loadMailbox: async () => MAILBOX, seenStore: memorySeenStore() });
    expect(res).toEqual({ ok: false, error: "oauth_refresh_failed:invalid_grant" });
  });

  it("zoznam je viazaný na štítok aj na časové okno", () => {
    const url = gmailListUrl(LABEL, { lookbackDays: 5, pageToken: "tok" });
    expect(url).toContain(`labelIds=${LABEL}`);
    expect(url).toContain("q=newer_than%3A5d");
    expect(url).toContain("pageToken=tok");
    expect(lookbackDaysFrom("5")).toBe(5);
    expect(lookbackDaysFrom("0")).toBe(3);
    expect(lookbackDaysFrom("999")).toBe(3);
    expect(lookbackDaysFrom(undefined)).toBe(3);
  });

  it("telo správy je orezané na strop", () => {
    const big = Buffer.from("x".repeat(500_000)).toString("base64url");
    const msg: GmailMessage = {
      id: "m",
      internalDate: "1755165600000",
      payload: { headers: [], mimeType: "text/plain", body: { data: big } },
    };
    expect(mapGmailMessageToAcquire(msg, MAILBOX).email.text.length).toBe(MAX_BODY_CHARS);
    const html: GmailMessage = {
      id: "m",
      internalDate: "1755165600000",
      payload: { headers: [], mimeType: "text/html", body: { data: big } },
    };
    expect(mapGmailMessageToAcquire(html, MAILBOX).email.html.length).toBe(MAX_BODY_CHARS);
  });
});
