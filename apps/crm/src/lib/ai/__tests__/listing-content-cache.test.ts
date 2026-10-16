import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCallClaude = vi.hoisted(() => vi.fn());

vi.mock("../claude", () => ({
  CLAUDE_HAIKU: "claude-haiku-4-5-20251001",
  CLAUDE_SONNET: "claude-sonnet-4-6",
  callClaude: (...a: unknown[]) => mockCallClaude(...a),
  extractJson: (t: string) => JSON.parse(t),
}));

import { generateListingContent } from "../listing-content";
import type { PropertyInput } from "../listing-content";

const property: PropertyInput = {
  type: "byt",
  location: "Prešov",
  size_m2: 72,
  price: 149_000,
  condition: "po rekonštrukcii",
  features: ["balkón"],
};

const listingJson = JSON.stringify({
  portal_text: "x".repeat(80),
  fb_ad_copy: "fb",
  ig_caption: "ig",
  email_subject: "subj",
  email_body: "body",
  seo_keywords: ["a", "b", "c", "d", "e", "f"],
});

describe("generateListingContent prompt cache", () => {
  beforeEach(() => {
    mockCallClaude.mockReset();
    mockCallClaude.mockResolvedValue({
      content: [{ type: "text", text: listingJson }],
      usage: {
        input_tokens: 220,
        output_tokens: 900,
        cache_creation_input_tokens: 18_031,
        cache_read_input_tokens: 0,
      },
    });
  });

  it("sends cache_control on the stable system prompt and exposes cache usage", async () => {
    const { audit } = await generateListingContent(property, "GENERAL");

    const params = mockCallClaude.mock.calls[0]?.[0] as {
      model: string;
      system: Array<{ type: string; text: string; cache_control?: { type: string } }>;
      messages: Array<{ role: string; content: string }>;
    };
    expect(params.model).toBe("claude-sonnet-4-6");
    expect(params.system[0]?.cache_control).toEqual({ type: "ephemeral" });
    expect(params.messages[0]?.content).toContain("NEHNUTEĽNOSŤ NA PREDAJ");
    expect(params.system[0]?.text).not.toContain("NEHNUTEĽNOSŤ NA PREDAJ");

    expect(audit.cacheCreationInputTokens).toBe(18_031);
    expect(audit.cacheReadInputTokens).toBe(0);
    expect(audit.inputTokens).toBe(220);
    expect(audit.outputTokens).toBe(900);
    expect(audit.costEur).toBeGreaterThan(0);
  });
});
