import { describe, expect, it, vi, beforeEach } from "vitest";

import { triageLeadBatches } from "@/lib/ai/lead-triage-batch";
import { callClaude } from "@/lib/ai/claude";

type ClaudeMessage = Awaited<ReturnType<typeof callClaude>>;

vi.mock("@/lib/ai/claude", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/claude")>();
  return {
    ...actual,
    callClaude: vi.fn(),
  };
});

const sampleLead = {
  id: "lead-a",
  name: "Test",
  status: "Horúci",
  score: 92,
  budget: "420 000 €",
  last_contact: new Date().toISOString(),
  note: "",
  source: "web",
};

describe("triageLeadBatches production scenarios", () => {
  beforeEach(() => {
    vi.mocked(callClaude).mockReset();
  });

  it("Scenario A: AI returns valid JSON — použije model priority", async () => {
    const payload = {
      id: "m1",
      type: "message",
      role: "assistant",
      model: "claude-haiku-4-5-20251001",
      content: [
        {
          type: "text",
          text: JSON.stringify([
            {
              lead_id: "lead-a",
              priority: "Vysoká",
              reason: "Horúci lead, treba kontakt.",
            },
          ]),
        },
      ],
      stop_reason: "end_turn",
      usage: { input_tokens: 10, output_tokens: 20 },
    } as unknown as ClaudeMessage;
    vi.mocked(callClaude).mockResolvedValue(payload);

    const out = await triageLeadBatches([sampleLead]);
    expect(out).toHaveLength(1);
    expect(out[0].lead_id).toBe("lead-a");
    expect(out[0].priority).toBe("Vysoká");
    expect(out[0].reason).toContain("Horúci lead");
    expect(out[0].reason).not.toContain("Fallback skóre");
  });

  it("Scenario B: AI timeout / sieť — fallback pre každý lead, dôvod AI volanie zlyhalo", async () => {
    vi.mocked(callClaude).mockRejectedValue(new Error("timeout after 60000ms"));

    const out = await triageLeadBatches([
      sampleLead,
      { ...sampleLead, id: "lead-b", status: "Teplý", score: 40 },
    ]);
    expect(out).toHaveLength(2);
    for (const row of out) {
      expect(row.reason).toContain("Fallback skóre");
      expect(row.reason).toContain("AI volanie zlyhalo");
    }
    expect(out[0].priority).toBeDefined();
  });

  it("Scenario B (partial): neplatný JSON — fallback + Model nevrátil platný JSON", async () => {
    vi.mocked(callClaude).mockResolvedValue({
      id: "m2",
      type: "message",
      role: "assistant",
      model: "claude-haiku-4-5-20251001",
      content: [{ type: "text", text: "not-json" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 1 },
    } as unknown as ClaudeMessage);

    const out = await triageLeadBatches([sampleLead]);
    expect(out).toHaveLength(1);
    expect(out[0].reason).toContain("Fallback skóre");
    expect(out[0].reason).toContain("Model nevrátil platný JSON");
  });
});
