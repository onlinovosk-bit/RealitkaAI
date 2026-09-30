import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

/**
 * `generateAutoReply` vracia deterministickú zálohu pri každom zlyhaní LLM. Toto sú testy
 * na to, že záloha nesie DÔVOD — bez neho sa `llm_fallback` v logu nedá rozlíšiť
 * (kľúč, kredit, timeout).
 */

const mockCallClaude = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/claude", () => ({
  CLAUDE_HAIKU: "claude-haiku-4-5-20251001",
  callClaude: (...a: unknown[]) => mockCallClaude(...a),
  extractJson: (t: string) => JSON.parse(t),
}));

import { generateAutoReply } from "../auto-reply";

const INPUT = { leadName: "Ján Novák", source: "portal:Nehnuteľnosti.sk", message: "Chcem obhliadku" };

let warn: MockInstance;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  warn.mockRestore();
});

const reply = (text: string) => ({ content: [{ type: "text", text }] });

describe("generateAutoReply — dôvod zlyhania", () => {
  it("úspech nesie text modelu a žiadny `failure` ani `fallback`", async () => {
    mockCallClaude.mockResolvedValue(reply(JSON.stringify({ subject: "S", body: "B" })));
    const res = await generateAutoReply(INPUT, { timeoutMs: 8_000 });
    expect(res).toEqual({ subject: "S", body: "B" });
    expect(warn).not.toHaveBeenCalled();
  });

  it("odmietnuté volanie → záloha s dôvodom (auth, 401, request-id)", async () => {
    mockCallClaude.mockRejectedValue(
      Object.assign(new Error("invalid x-api-key"), { status: 401, requestID: "req_42", type: "authentication_error" }),
    );
    const res = await generateAutoReply(INPUT, { timeoutMs: 8_000 });
    expect(res.fallback).toBe(true);
    expect(res.failure).toMatchObject({
      reason: "auth",
      httpStatus: 401,
      errorType: "authentication_error",
      requestId: "req_42",
    });
  });

  it("nedostatok kreditu sa rozpozná ako billing", async () => {
    mockCallClaude.mockRejectedValue(
      Object.assign(new Error("Your credit balance is too low to access the Anthropic API."), { status: 400 }),
    );
    const res = await generateAutoReply(INPUT, { timeoutMs: 8_000 });
    expect(res.failure?.reason).toBe("billing");
  });

  it("chýbajúci ANTHROPIC_API_KEY je config", async () => {
    mockCallClaude.mockRejectedValue(new Error("ANTHROPIC_API_KEY nie je nastavený"));
    const res = await generateAutoReply(INPUT, { timeoutMs: 8_000 });
    expect(res.failure?.reason).toBe("config");
  });

  it("vypršané okno → záloha s dôvodom timeout", async () => {
    mockCallClaude.mockReturnValue(new Promise(() => {}));
    const p = generateAutoReply(INPUT, { timeoutMs: 500 });
    await vi.advanceTimersByTimeAsync(500);
    const res = await p;
    expect(res.fallback).toBe(true);
    expect(res.failure?.reason).toBe("timeout");
  });

  it("nespracovateľný výstup modelu → bad_output", async () => {
    mockCallClaude.mockResolvedValue(reply("toto nie je JSON"));
    const res = await generateAutoReply(INPUT, { timeoutMs: 8_000 });
    expect(res.fallback).toBe(true);
    expect(res.failure?.reason).toBe("bad_output");
  });

  it("záloha ostáva tá istá — text sa nemení, len pribudne dôvod", async () => {
    mockCallClaude.mockRejectedValue(Object.assign(new Error("x"), { status: 500 }));
    const res = await generateAutoReply(INPUT, { timeoutMs: 8_000 });
    expect(res.subject).toBe("Ďakujeme za váš záujem, Ján Novák");
    expect(res.body).toContain("Náš maklér vás bude kontaktovať čo najskôr.");
  });
});
