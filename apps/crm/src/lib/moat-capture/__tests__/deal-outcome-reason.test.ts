import { describe, it, expect } from "vitest";
import {
  isDealOutcomeTerminalLeadStatus,
  isReasonValidForDealOutcome,
  reasonCodesForDealOutcome,
} from "@/lib/moat-capture/deal-outcome-reason";

describe("deal-outcome-reason helpers", () => {
  it("detects terminal CRM statuses for moat capture", () => {
    expect(isDealOutcomeTerminalLeadStatus("Uzavretý")).toBe(true);
    expect(isDealOutcomeTerminalLeadStatus("Stratený")).toBe(true);
    expect(isDealOutcomeTerminalLeadStatus("Ponuka")).toBe(false);
  });

  it("validates won/lost reason codes separately", () => {
    expect(isReasonValidForDealOutcome("won", "cena")).toBe(true);
    expect(isReasonValidForDealOutcome("won", "konkurencia")).toBe(false);
    expect(isReasonValidForDealOutcome("lost", "konkurencia")).toBe(true);
    expect(reasonCodesForDealOutcome("won")).toContain("exkluzivita");
  });
});
