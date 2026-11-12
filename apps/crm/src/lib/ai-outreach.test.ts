import { afterEach, describe, expect, it, vi } from "vitest";

const { completeOutreachLlm } = vi.hoisted(() => ({
  completeOutreachLlm: vi.fn(),
}));

vi.mock("@/lib/ai/outreach-cost-governance", () => ({
  completeOutreachLlm,
  OutreachCostBlockedError: class OutreachCostBlockedError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = "OutreachCostBlockedError";
    }
  },
}));

import {
  generateOutreachEmail,
  OutreachCostBlockedError,
} from "@/lib/ai-outreach";

const lead = {
  id: "lead-1",
  name: "Test Lead",
  email: "lead@example.com",
  phone: "+421900000000",
  location: "Bratislava",
  budget: "200k",
  propertyType: "Byt",
  rooms: "3",
  financing: "Hypotéka",
  timeline: "Q2",
  status: "new",
  score: 50,
  note: "",
};

describe("generateOutreachEmail (gateway wiring)", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
    vi.clearAllMocks();
  });

  it("returns gateway cost and latency on successful completion", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    completeOutreachLlm.mockResolvedValue({
      text: '{"subject":"Subj","body":"Body text"}',
      costEur: 0.00012,
      ms: 640,
      model: "gpt-4.1-mini",
      tokensIn: 100,
      tokensOut: 50,
      attempts: 1,
    });

    const out = await generateOutreachEmail(lead);

    expect(completeOutreachLlm).toHaveBeenCalledOnce();
    expect(out.provider).toBe("openai:gpt-4.1-mini");
    expect(out.costEur).toBe(0.00012);
    expect(out.latencyMs).toBe(640);
    expect(out.model).toBe("gpt-4.1-mini");
  });

  it("rethrows OutreachCostBlockedError (no paid fallback)", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    completeOutreachLlm.mockRejectedValue(
      new OutreachCostBlockedError("unknown_price", "No price for model"),
    );

    await expect(generateOutreachEmail(lead)).rejects.toBeInstanceOf(
      OutreachCostBlockedError,
    );
  });
});
