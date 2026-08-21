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
  mapGmailMessageToAcquire,
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
    });
    expect(result).toEqual({ ok: true, pulled: 2, posted: 2, errors: [] });

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
    });
    expect(result).toMatchObject({ ok: true, posted: 0, pulled: 1 });
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
