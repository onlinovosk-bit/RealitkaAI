import { describe, expect, it } from "vitest";
import {
  assistantQuestionForContext,
  generateAssistantMessage,
} from "@/lib/ai/assistant-script";
import { getLandingCtaCopy } from "@/lib/landing-cta-ab";
import { getSalesScript } from "@/lib/sales/sales-script";

describe("getSalesScript", () => {
  it("returns non-empty lines", () => {
    const s = getSalesScript();
    expect(s.length).toBeGreaterThanOrEqual(4);
    expect(s.every((line) => line.length > 0)).toBe(true);
  });
});

describe("generateAssistantMessage", () => {
  it("covers call, deal, default", () => {
    expect(generateAssistantMessage("call").length).toBeGreaterThan(10);
    expect(generateAssistantMessage("deal").length).toBeGreaterThan(10);
    expect(generateAssistantMessage("default").length).toBeGreaterThan(10);
  });
});

describe("assistantQuestionForContext", () => {
  it("returns distinct questions for API", () => {
    const qCall = assistantQuestionForContext("call");
    const qDeal = assistantQuestionForContext("deal");
    const qDef = assistantQuestionForContext("default");
    expect(qCall.length).toBeGreaterThan(20);
    expect(qDeal.length).toBeGreaterThan(20);
    expect(qDef.length).toBeGreaterThan(20);
    expect(qCall).not.toBe(qDeal);
  });
});

describe("getLandingCtaCopy", () => {
  it("differs between A and B", () => {
    const a = getLandingCtaCopy("a");
    const b = getLandingCtaCopy("b");
    expect(a.hero.primary).not.toBe(b.hero.primary);
    expect(a.finalCta.button).not.toBe(b.finalCta.button);
  });
});
