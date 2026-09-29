import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { extractDemand, type ClaudeCall } from "../extract";
import { inquiryTextFromNote, redactForModel } from "../redact";
import { demandExtractionEnabled } from "../store";
import { knownFields } from "../contract";

function reply(text: string, stop: Anthropic.Message["stop_reason"] = "end_turn"): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5-20251001",
    content: [{ type: "text", text, citations: null }],
    stop_reason: stop,
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  } as unknown as Anthropic.Message;
}

const INQUIRY =
  "Dobrý deň, som Ján Novák, hľadám 2-izbový byt v Petržalke do 180 000 €. " +
  "Kontakt: jan.novak@example.sk, 0903 123 456.";

describe("redaction — no unnecessary PII to the model", () => {
  it("masks e-mail, phone and the lead's own name", () => {
    const out = redactForModel(INQUIRY, "Ján Novák");
    expect(out).not.toContain("jan.novak@example.sk");
    expect(out).not.toContain("0903 123 456");
    expect(out).not.toMatch(/Ján|Novák/);
    expect(out).toContain("2-izbový byt v Petržalke do 180 000 €");
  });

  it("takes only the inquirer's words out of an acquire note", () => {
    const note = "[portal:Nehnuteľnosti.sk] Mám záujem o obhliadku | inzerát: 12345 | intent: viewing (keyword)";
    expect(inquiryTextFromNote(note)).toBe("Mám záujem o obhliadku");
    expect(inquiryTextFromNote("volal, chce dom")).toBe("volal, chce dom");
    expect(inquiryTextFromNote(null)).toBe("");
  });
});

describe("extractDemand", () => {
  it("sends only redacted text to the model", async () => {
    const call = vi.fn<ClaudeCall>(async () => reply("{}"));
    await extractDemand({ inquiryText: INQUIRY, leadName: "Ján Novák" }, call);
    const sent = JSON.stringify(call.mock.calls[0][0]);
    expect(sent).not.toContain("jan.novak@example.sk");
    expect(sent).not.toContain("Novák");
    expect(call.mock.calls[0][0].model).toBe("claude-haiku-4-5-20251001");
  });

  it("keeps proven values and turns guesses into unknowns", async () => {
    const call: ClaudeCall = async () =>
      reply(
        JSON.stringify({
          property_type: { value: "byt", confidence: 1, evidence: "2-izbový byt" },
          location: { value: "Petržalke", confidence: 1, evidence: "v Petržalke" },
          budget_max: { value: 180000, confidence: 1, evidence: "do 180 000 €" },
          financing: { value: "hypoteka", confidence: 0.9, evidence: "na hypotéku" }, // not in text
          rooms_min: { value: 2, confidence: 1, evidence: "2-izbový" },
        }),
      );
    const rec = await extractDemand({ inquiryText: INQUIRY, leadName: "Ján Novák" }, call);
    expect(rec.status).toBe("ok");
    expect(rec.contract_version).toBe("v1");
    expect(knownFields(rec.demand).sort()).toEqual(["budget_max", "location", "property_type", "rooms_min"]);
    expect(rec.demand.financing).toMatchObject({ value: null, rejected: "evidence_not_in_text" });
  });

  it("reports no_text without calling the model", async () => {
    const call = vi.fn<ClaudeCall>();
    const rec = await extractDemand({ inquiryText: "  [EMAIL_1] " }, call);
    expect(rec.status).toBe("no_text");
    expect(call).not.toHaveBeenCalled();
  });

  it("never throws: model error, bad JSON, truncated output", async () => {
    const boom: ClaudeCall = async () => {
      throw new Error("overloaded");
    };
    expect((await extractDemand({ inquiryText: INQUIRY }, boom)).status).toBe("llm_error");
    expect((await extractDemand({ inquiryText: INQUIRY }, async () => reply("not json"))).status).toBe(
      "invalid_output",
    );
    expect((await extractDemand({ inquiryText: INQUIRY }, async () => reply("[]"))).status).toBe(
      "invalid_output",
    );
    expect(
      (await extractDemand({ inquiryText: INQUIRY }, async () => reply('{"a":', "max_tokens"))).status,
    ).toBe("invalid_output");
  });
});

describe("production switch", () => {
  it("is off unless explicitly enabled and a key exists", () => {
    expect(demandExtractionEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(demandExtractionEnabled({ DEMAND_EXTRACTION_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(
      demandExtractionEnabled({ DEMAND_EXTRACTION_ENABLED: "1", ANTHROPIC_API_KEY: "k" } as unknown as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      demandExtractionEnabled({ DEMAND_EXTRACTION_ENABLED: "true", ANTHROPIC_API_KEY: "k" } as unknown as NodeJS.ProcessEnv),
    ).toBe(true);
  });
});
