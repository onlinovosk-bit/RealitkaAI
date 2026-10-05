import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const { emitMock, resendSendMock } = vi.hoisted(() => ({
  emitMock: vi.fn(),
  resendSendMock: vi.fn(),
}));

vi.mock("@/lib/platform-events-server", () => ({ emitPlatformEventServer: emitMock }));
vi.mock("@/lib/auto-error-capture", () => ({ autoErrorCapture: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSendMock };
  },
}));

import { runInboundLeadAutoResponse } from "@/lib/acquire/inbound-lead-auto-response";
import { safeErrorName } from "@/lib/acquire/auto-response-outcome";
import {
  classifyResendError,
  sendInboundAutoResponse,
} from "@/lib/acquire/send-inbound-auto-response";
import * as sendModule from "@/lib/acquire/send-inbound-auto-response";

const LEAD_EMAIL = "petra.novakova@example.com";
const LEAD_NAME = "Petra Nováková";

type SupaOpts = {
  leadRead?: { data: unknown; error: unknown };
  sentAt?: string | null;
  enabled?: boolean;
  /** Flag sa nedá prečítať: chýbajúci stĺpec (`42703`), chýbajúci riadok, alebo NULL. */
  flagRead?: { data: unknown; error: unknown };
  agencyEmail?: string | null;
  owners?: Array<{ email: string | null; phone: string | null }>;
  updateError?: unknown;
};

function makeSupa(opts: SupaOpts = {}) {
  const updates: unknown[] = [];
  const supa = {
    from(table: string) {
      if (table === "leads") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () =>
                opts.leadRead ?? {
                  data: {
                    auto_response_sent_at: opts.sentAt ?? null,
                    name: LEAD_NAME,
                    assigned_agent: "Demo Makler 1",
                    ai_reason: "Byt v centre.",
                    ai_priority: "Vysoká",
                    source: "portal:Nehnuteľnosti.sk",
                  },
                  error: null,
                },
            }),
          }),
          update: (v: unknown) => {
            updates.push(v);
            return { eq: () => ({ is: async () => ({ error: opts.updateError ?? null }) }) };
          },
        };
      }
      if (table === "agencies") {
        return {
          select: (cols: string) => ({
            eq: () => ({
              maybeSingle: async () => {
                if (cols === "name") return { data: { name: "Smolko" }, error: null };
                if (cols === "auto_response_enabled") {
                  return (
                    opts.flagRead ?? {
                      data: { auto_response_enabled: opts.enabled ?? true },
                      error: null,
                    }
                  );
                }
                return {
                  data: {
                    email: opts.agencyEmail === undefined ? "office@test.sk" : opts.agencyEmail,
                    phone: null,
                  },
                  error: null,
                };
              },
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              or: () => ({ limit: async () => ({ data: opts.owners ?? [], error: null }) }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as SupabaseClient;
  return { supa, updates };
}

async function run(opts: SupaOpts = {}, email = LEAD_EMAIL) {
  const { supa, updates } = makeSupa(opts);
  await runInboundLeadAutoResponse(
    supa,
    { id: "lead-1", agency_id: "agency-1" },
    { agencyId: "agency-1", name: LEAD_NAME, email },
  );
  return { updates };
}

function recorded() {
  expect(emitMock).toHaveBeenCalledTimes(1);
  return emitMock.mock.calls[0][0] as {
    agencyId: string | null;
    eventType: string;
    payload: Record<string, unknown>;
  };
}

describe("AUTO-RESPONSE-VISIBLE — každý pokus zanechá jeden záznam", () => {
  beforeEach(() => {
    emitMock.mockReset();
    emitMock.mockResolvedValue(undefined);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // špión na odosielač nesmie pretiecť do testov skutočného odosielača
    vi.restoreAllMocks();
  });

  it("sent: e-mail odišiel a značka sa zapísala (v udalosti je doména odosielateľa)", async () => {
    vi.spyOn(sendModule, "sendInboundAutoResponse").mockResolvedValue({ ok: true, fromDomain: "revolis.ai" });
    const { updates } = await run();

    const ev = recorded();
    expect(ev.eventType).toBe("inbound.auto_response");
    expect(ev.agencyId).toBe("agency-1");
    expect(ev.payload).toEqual({
      lead_id: "lead-1",
      outcome: "sent",
      reason: null,
      http_status: null,
      error_name: null,
      from_domain: "revolis.ai",
    });
    expect(updates).toHaveLength(1);
  });

  it("sent_unmarked: e-mail odišiel, ale značku sa nepodarilo zapísať", async () => {
    vi.spyOn(sendModule, "sendInboundAutoResponse").mockResolvedValue({ ok: true, fromDomain: "revolis.ai" });
    await run({ updateError: { message: "db down" } });

    expect(recorded().payload).toMatchObject({
      outcome: "sent_unmarked",
      reason: "dedup_update_failed",
      from_domain: "revolis.ai",
    });
  });

  it("skipped_no_email: lead bez e-mailu", async () => {
    const send = vi.spyOn(sendModule, "sendInboundAutoResponse");
    await run({}, "   ");

    expect(recorded().payload).toMatchObject({ outcome: "skipped_no_email" });
    expect(send).not.toHaveBeenCalled();
  });

  it("skipped_already_sent: dedup", async () => {
    const send = vi.spyOn(sendModule, "sendInboundAutoResponse");
    await run({ sentAt: "2026-09-30T07:05:00Z" });

    expect(recorded().payload).toMatchObject({ outcome: "skipped_already_sent" });
    expect(send).not.toHaveBeenCalled();
  });

  it("skipped_disabled: auto-odpoveď vypnutá pre agentúru", async () => {
    const send = vi.spyOn(sendModule, "sendInboundAutoResponse");
    await run({ enabled: false });

    expect(recorded().payload).toMatchObject({ outcome: "skipped_disabled" });
    expect(send).not.toHaveBeenCalled();
  });

  it("failed_no_reply_to: agentúra ani vlastník nemá e-mail", async () => {
    const send = vi.spyOn(sendModule, "sendInboundAutoResponse");
    await run({ agencyEmail: null, owners: [{ email: null, phone: null }] });

    expect(recorded().payload).toMatchObject({ outcome: "failed_no_reply_to" });
    expect(send).not.toHaveBeenCalled();
  });

  it("failed_send: nesie dôvod, HTTP status a názov chyby — nie text chyby", async () => {
    vi.spyOn(sendModule, "sendInboundAutoResponse").mockResolvedValue({
      ok: false,
      error: `The revolis.ai domain is not verified (to: ${LEAD_EMAIL})`,
      failure: {
        reason: "domain_not_verified",
        httpStatus: 403,
        errorName: "validation_error",
        fromDomain: "gmail.com",
      },
    });
    const { updates } = await run();

    expect(recorded().payload).toEqual({
      lead_id: "lead-1",
      outcome: "failed_send",
      reason: "domain_not_verified",
      http_status: 403,
      error_name: "validation_error",
      from_domain: "gmail.com",
    });
    expect(updates).toHaveLength(0);
  });

  it("failed_send: mock bez `failure` (starší tvar) sa zapíše ako unknown", async () => {
    vi.spyOn(sendModule, "sendInboundAutoResponse").mockResolvedValue({
      ok: false,
      error: "boom",
    } as never);
    await run();

    expect(recorded().payload).toMatchObject({ outcome: "failed_send", reason: "unknown" });
  });

  it("failed_error/migration_required: chýba stĺpec v PROD", async () => {
    await run({ leadRead: { data: null, error: { code: "42703", message: "column missing" } } });

    expect(recorded().payload).toMatchObject({
      outcome: "failed_error",
      reason: "migration_required",
    });
  });

  it("failed_error/unexpected: výnimka sa zapíše ako názov, nie ako text", async () => {
    await run({
      leadRead: { data: null, error: { code: "XX000", message: `row for ${LEAD_EMAIL} exploded` } },
    });

    const ev = recorded();
    expect(ev.payload).toMatchObject({
      outcome: "failed_error",
      reason: "unexpected",
      error_name: "Error",
    });
    expect(JSON.stringify(ev)).not.toContain(LEAD_EMAIL);
  });

  it("do záznamu nikdy nepatrí e-mail ani meno leadu", async () => {
    vi.spyOn(sendModule, "sendInboundAutoResponse").mockResolvedValue({
      ok: false,
      error: `Invalid to: ${LEAD_EMAIL} ${LEAD_NAME}`,
      failure: { reason: "validation", httpStatus: 422, errorName: "validation_error" },
    });
    await run();

    const json = JSON.stringify(recorded());
    expect(json).not.toContain(LEAD_EMAIL);
    expect(json).not.toContain("Petra");
    expect(json).not.toContain("Nov");
  });

  it("nikdy nehádže, ani keď zápis udalosti zlyhá", async () => {
    vi.spyOn(sendModule, "sendInboundAutoResponse").mockResolvedValue({ ok: true });
    emitMock.mockRejectedValue(new Error("platform_events down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(run()).resolves.toBeDefined();
    expect(warn).toHaveBeenCalled();
  });
});

describe("classifyResendError", () => {
  const cases: Array<[string, unknown, string]> = [
    [
      "doména nie je overená (403)",
      {
        name: "validation_error",
        statusCode: 403,
        message: "The revolis.ai domain is not verified. Please, add and verify your domain",
      },
      "domain_not_verified",
    ],
    [
      "doména nenájdená",
      { name: "validation_error", statusCode: 403, message: "The domain mg.revolis.ai was not found" },
      "domain_not_verified",
    ],
    ["neplatný kľúč", { name: "invalid_api_key", statusCode: 401, message: "API key is invalid" }, "auth"],
    ["chýba kľúč", { name: "missing_api_key", statusCode: 401, message: "Missing API key" }, "config"],
    ["403 bez domény", { name: "restricted_api_key", statusCode: 403, message: "x" }, "auth"],
    ["neplatný odosielateľ", { name: "invalid_from_address", statusCode: 422, message: "x" }, "invalid_from"],
    ["limit", { name: "rate_limit_exceeded", statusCode: 429, message: "x" }, "rate_limit"],
    ["denná kvóta", { name: "daily_quota_exceeded", statusCode: 429, message: "x" }, "rate_limit"],
    ["validácia", { name: "validation_error", statusCode: 422, message: "x" }, "validation"],
    ["server", { name: "internal_server_error", statusCode: 500, message: "x" }, "server_error"],
    ["neznáma chyba", { name: "something_new", statusCode: 418, message: "x" }, "unknown"],
    ["nie je objekt", "string error", "unknown"],
    ["null", null, "unknown"],
  ];

  it.each(cases)("%s → %s", (_label, err, reason) => {
    expect(classifyResendError(err).reason).toBe(reason);
  });

  it("výstup nikdy nenesie text správy", () => {
    const out = classifyResendError({
      name: "validation_error",
      statusCode: 422,
      message: `Invalid \`to\` field: ${LEAD_EMAIL}`,
    });
    expect(JSON.stringify(out)).not.toContain(LEAD_EMAIL);
    expect(out).toEqual({ reason: "validation", httpStatus: 422, errorName: "validation_error" });
  });

  it("názov chyby, ktorý nevyzerá ako kód, sa zahodí", () => {
    expect(safeErrorName(`Chyba pre ${LEAD_EMAIL}`)).toBeNull();
    expect(safeErrorName({ name: "TypeError" })).toBe("TypeError");
    expect(safeErrorName(undefined)).toBeNull();
  });
});

describe("sendInboundAutoResponse — dôvod zlyhania z Resendu", () => {
  const payload = {
    to: LEAD_EMAIL,
    leadName: LEAD_NAME,
    agencyName: "Smolko",
    replyTo: "office@test.sk",
  };
  let prevKey: string | undefined;

  beforeEach(() => {
    prevKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "re_test_key";
    resendSendMock.mockReset();
  });

  afterEach(() => {
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
  });

  it("chýbajúci alebo neplatný kľúč → config", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await sendInboundAutoResponse(payload);
    expect(res).toMatchObject({ ok: false, failure: { reason: "config" } });
    expect(resendSendMock).not.toHaveBeenCalled();

    process.env.RESEND_API_KEY = "not-a-resend-key";
    expect(await sendInboundAutoResponse(payload)).toMatchObject({
      ok: false,
      failure: { reason: "config" },
    });
  });

  it("Resend vráti chybu domény → domain_not_verified so statusom", async () => {
    resendSendMock.mockResolvedValue({
      data: null,
      error: {
        name: "validation_error",
        statusCode: 403,
        message: "The revolis.ai domain is not verified.",
      },
    });
    const res = await sendInboundAutoResponse(payload);
    expect(res).toEqual({
      ok: false,
      error: "The revolis.ai domain is not verified.",
      failure: {
        reason: "domain_not_verified",
        httpStatus: 403,
        errorName: "validation_error",
        fromDomain: "mg.revolis.ai", // predvolený odosielateľ, keď OUTREACH_FROM_EMAIL nie je nastavený
      },
    });
  });

  it("vyhodená sieťová chyba sa nezosype, ale vráti network", async () => {
    resendSendMock.mockRejectedValue(new TypeError("fetch failed"));
    const res = await sendInboundAutoResponse(payload);
    expect(res).toMatchObject({
      ok: false,
      failure: { reason: "network", httpStatus: null, errorName: "TypeError" },
    });
  });

  it("úspech → ok", async () => {
    resendSendMock.mockResolvedValue({ data: { id: "em_1" }, error: null });
    expect(await sendInboundAutoResponse(payload)).toEqual({ ok: true, fromDomain: "mg.revolis.ai" });
  });
});

// ================================================================
// FAIL-CLOSED: nečitateľný súhlas sa v audite nesmie stratiť
//
// `loadAgencyAutoResponseContext` sa kedysi inicializovalo na `true` a testovalo
// `!== false`, takže chýbajúci stĺpec, chýbajúci riadok agentúry aj NULL
// znamenali POSIELAJ — e-mail klientovi agentúry bez jej súhlasu. Opt-in default
// z migrácie 20261001100000 sa tým dal obísť.
//
// Preskočenie je teraz správne, ale nestačí: v `platform_events` sa musí dať
// odlíšiť „agentúra si to vedome vypla" od „súhlas sme nevedeli prečítať".
// ================================================================
describe("AUTO-RESPONSE-FAIL-CLOSED — dôvod preskočenia je v audite", () => {
  beforeEach(() => {
    emitMock.mockReset();
    emitMock.mockResolvedValue(undefined);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("chýbajúci stĺpec → skipped_disabled + consent_unknown, nič sa neposiela", async () => {
    const sendSpy = vi.spyOn(sendModule, "sendInboundAutoResponse");

    await run({ flagRead: { data: null, error: { code: "42703", message: "column missing" } } });

    expect(sendSpy).not.toHaveBeenCalled();
    const ev = recorded();
    expect(ev.payload.outcome).toBe("skipped_disabled");
    expect(ev.payload.reason).toBe("consent_unknown");
  });

  it("chýbajúci riadok agentúry → consent_unknown", async () => {
    const sendSpy = vi.spyOn(sendModule, "sendInboundAutoResponse");

    await run({ flagRead: { data: null, error: null } });

    expect(sendSpy).not.toHaveBeenCalled();
    expect(recorded().payload.reason).toBe("consent_unknown");
  });

  it("NULL nie je súhlas → consent_unknown", async () => {
    const sendSpy = vi.spyOn(sendModule, "sendInboundAutoResponse");

    await run({ flagRead: { data: { auto_response_enabled: null }, error: null } });

    expect(sendSpy).not.toHaveBeenCalled();
    expect(recorded().payload.reason).toBe("consent_unknown");
  });

  it("vedomé vypnutie → skipped_disabled BEZ consent_unknown", async () => {
    // Rozlíšenie je celý zmysel toho dôvodu: toto nie je chyba čítania.
    const sendSpy = vi.spyOn(sendModule, "sendInboundAutoResponse");

    await run({ enabled: false });

    expect(sendSpy).not.toHaveBeenCalled();
    const ev = recorded();
    expect(ev.payload.outcome).toBe("skipped_disabled");
    expect(ev.payload.reason).not.toBe("consent_unknown");
  });

  it("výslovné true stále posiela", async () => {
    // Fail-closed nesmie vypnúť agentúru, ktorá súhlas naozaj dala.
    const sendSpy = vi
      .spyOn(sendModule, "sendInboundAutoResponse")
      .mockResolvedValue({ ok: true, messageId: "em_ok", fromDomain: "mg.revolis.ai" } as never);

    await run({ enabled: true });

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(recorded().payload.outcome).toBe("sent");
  });
});
