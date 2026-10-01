import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resendSendMock } = vi.hoisted(() => ({ resendSendMock: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSendMock };
  },
}));

import {
  PUBLIC_MAILBOX_DOMAINS,
  buildInboundAutoResponseContent,
  emailDomain,
  safeGreetingName,
  sendInboundAutoResponse,
} from "@/lib/acquire/send-inbound-auto-response";

const base = {
  to: "klient@example.com",
  leadName: "Ján Novák",
  agencyName: "Reality Smolko s.r.o.",
  agencyPhone: null,
  replyTo: "office@smolko.example",
  assignedAgent: null,
  aiPriority: "Nízka",
  source: "portal:Bazoš.sk",
};

/** Zachytený interný text z 1. 10. 2026 (Resend Logs, 403) — nesmie sa nikdy dostať do e-mailu. */
const INTERNAL_REASON =
  "Generická správa bez identifikácie konkrétnej nehnuteľnosti, bez kontaktu a bez ďalších údajov.";

describe("šablóna auto-odpovede — žiadny interný text, len overené fakty", () => {
  it("ai_reason sa do e-mailu nedostane, ani keď ho volajúci pošle (starý tvar)", () => {
    const { subject, body } = buildInboundAutoResponseContent({
      ...base,
      aiReason: INTERNAL_REASON,
    } as never);

    const all = `${subject}\n${body}`;
    expect(all).not.toContain("Generická");
    expect(all).not.toContain("identifikácie");
    expect(all).not.toContain("Viem, že hľadáte");
    expect(all).not.toContain("bez kontaktu");
  });

  it("ukážka finálneho znenia: portál Bazoš, nízka priorita, podpis kanceláriou", () => {
    const { subject, body } = buildInboundAutoResponseContent(base);

    expect(subject).toBe("Váš dopyt bol prijatý — Reality Smolko s.r.o.");
    expect(body).toBe(
      [
        "Dobrý deň, Ján Novák,",
        "",
        "váš dopyt z portálu Bazoš.sk mi prišiel. Pozriem sa naň a ozvem sa vám v priebehu dňa.",
        "",
        "Ak medzitým chcete niečo doplniť alebo sa opýtať, pokojne mi napíšte na office@smolko.example.",
        "",
        "Reality Smolko s.r.o.",
      ].join("\n"),
    );
  });

  it("ukážka finálneho znenia: Nehnuteľnosti.sk, vysoká priorita, maklér s telefónom", () => {
    const { body } = buildInboundAutoResponseContent({
      ...base,
      source: "portal:Nehnuteľnosti.sk",
      aiPriority: "Vysoká",
      assignedAgent: "Eva Horváthová",
      agencyPhone: "+421900111222",
    });

    expect(body).toBe(
      [
        "Dobrý deň, Ján Novák,",
        "",
        "váš dopyt z portálu Nehnuteľnosti.sk mi prišiel. Pozriem sa naň a ozvem sa vám dnes.",
        "",
        "Ak medzitým chcete niečo doplniť alebo sa opýtať, pokojne mi napíšte na office@smolko.example alebo zavolajte na +421900111222.",
        "",
        "Eva Horváthová",
        "+421900111222",
      ].join("\n"),
    );
  });

  it("ukážka finálneho znenia: webový formulár (bez portálu), nepoužiteľné meno, stredná priorita", () => {
    const { body } = buildInboundAutoResponseContent({
      ...base,
      source: "web_form",
      leadName: "klient@example.com",
      aiPriority: "Stredná",
    });

    expect(body.startsWith("Dobrý deň,\n")).toBe(true);
    expect(body).toContain("váš dopyt mi prišiel. Pozriem sa naň a ozvem sa vám v najbližších hodinách.");
    expect(body).not.toContain("z portálu");
  });

  it("formulácie sú rodovo neutrálne (žiadne dostal som ani dostala som)", () => {
    const { subject, body } = buildInboundAutoResponseContent({ ...base, assignedAgent: "Eva Horváthová" });
    expect(`${subject}\n${body}`).not.toMatch(/dostal|dostala/i);
  });
});

describe("safeGreetingName — oslovenie len ak to vyzerá ako meno", () => {
  it.each([
    ["Ján Novák", "Ján Novák"],
    ["Ľubomír Šťastný", "Ľubomír Šťastný"],
    ["Anna-Mária Kováčová", "Anna-Mária Kováčová"],
    ["  Peter   Hudák ", "Peter Hudák"],
  ])("%s → ponechané", (input, expected) => {
    expect(safeGreetingName(input)).toBe(expected);
  });

  it.each([
    ["e-mail", "klient@example.com"],
    ["telefón", "+421 900 111 222"],
    ["číslica v mene", "Klient 4821"],
    ["Unknown", "Unknown"],
    ["Neznámy", "Neznámy"],
    ["prázdne", "   "],
    ["príliš dlhé", "A".repeat(70)],
    ["zalomenie riadku", "Ján\nNovák"],
  ])("%s → bez mena", (_label, input) => {
    expect(safeGreetingName(input)).toBe("");
  });

  it("null / undefined → bez mena", () => {
    expect(safeGreetingName(null)).toBe("");
    expect(safeGreetingName(undefined)).toBe("");
  });
});

describe("sendInboundAutoResponse — odosielateľ na verejnej poštovej doméne", () => {
  let prevKey: string | undefined;
  let prevFrom: string | undefined;

  beforeEach(() => {
    prevKey = process.env.RESEND_API_KEY;
    prevFrom = process.env.OUTREACH_FROM_EMAIL;
    process.env.RESEND_API_KEY = "re_test_key";
    resendSendMock.mockReset();
    resendSendMock.mockResolvedValue({ data: { id: "em_1" }, error: null });
  });

  afterEach(() => {
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
    if (prevFrom === undefined) delete process.env.OUTREACH_FROM_EMAIL;
    else process.env.OUTREACH_FROM_EMAIL = prevFrom;
  });

  it("gmail.com odosielateľ (zachytený 1. 10.) sa zamietne PRED volaním Resendu s invalid_from", async () => {
    process.env.OUTREACH_FROM_EMAIL = "Revolis <revoliscrm@gmail.com>";
    const res = await sendInboundAutoResponse({ ...base, replyTo: "ra.ktorysi@gmail.com" });

    expect(res).toMatchObject({
      ok: false,
      failure: { reason: "invalid_from", httpStatus: null, fromDomain: "gmail.com" },
    });
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("zamietne sa každá verejná doména, aj s veľkými písmenami", async () => {
    for (const domain of PUBLIC_MAILBOX_DOMAINS) {
      process.env.OUTREACH_FROM_EMAIL = `Test <Info@${domain.toUpperCase()}>`;
      const res = await sendInboundAutoResponse({ ...base, replyTo: "x@gmail.com" });
      expect(res).toMatchObject({ ok: false, failure: { reason: "invalid_from", fromDomain: domain } });
    }
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("odosielateľ na vlastnej doméne prejde a vráti fromDomain", async () => {
    process.env.OUTREACH_FROM_EMAIL = "Revolis <hello@revolis.ai>";
    const res = await sendInboundAutoResponse({ ...base, replyTo: "x@gmail.com" });

    expect(res).toEqual({ ok: true, fromDomain: "revolis.ai" });
    expect(resendSendMock).toHaveBeenCalledTimes(1);
    expect(resendSendMock.mock.calls[0][0].from).toContain("hello@revolis.ai");
  });

  it("chyba z Resendu nesie fromDomain (aby sa príčina 403 nemusela hádať)", async () => {
    process.env.OUTREACH_FROM_EMAIL = "Revolis <hello@revolis.ai>";
    resendSendMock.mockResolvedValue({
      data: null,
      error: { name: "validation_error", statusCode: 403, message: "The revolis.ai domain is not verified." },
    });
    const res = await sendInboundAutoResponse({ ...base, replyTo: "x@gmail.com" });

    expect(res).toMatchObject({
      ok: false,
      failure: { reason: "domain_not_verified", httpStatus: 403, fromDomain: "revolis.ai" },
    });
  });

  it("emailDomain: malé písmená a orezanie", () => {
    expect(emailDomain("Info@RevoLis.AI")).toBe("revolis.ai");
    expect(emailDomain("bez-zavinaca")).toBe("");
  });
});
