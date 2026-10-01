import { describe, expect, it, vi } from "vitest";
import {
  isTerminalLeadStatus,
  mapLeadStatusToGenomeOutcome,
  outcomeValueEurForDecision,
  resolveOpenDecisionsForLead,
  type OutcomeWriterClient,
} from "@/lib/agents/followup/outcomeWriter";

const AGENCY = "11111111-1111-1111-1111-111111111111";
const LEAD = "imp_smolko_test_lead";

function buildClient(openRows: { id: string; expected_value_eur: number | null }[]) {
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });
  const single = vi
    .fn()
    .mockResolvedValueOnce({ data: { id: "out-1" }, error: null })
    .mockResolvedValueOnce({ data: { id: "out-2" }, error: null });
  const insertSelect = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select: insertSelect });
  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    then: undefined as unknown,
  };
  selectChain.eq = vi.fn(function (this: typeof selectChain) {
    return this;
  });
  const finalEq = vi.fn().mockResolvedValue({ data: openRows, error: null });
  const select = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: finalEq,
      }),
    }),
  });

  const client = {
    from: vi.fn((table: string) => {
      if (table === "decisions") return { select, update };
      if (table === "exclusivity_outcomes") return { insert };
      throw new Error(`unexpected table ${table}`);
    }),
  } as unknown as OutcomeWriterClient;

  return { client, update, insert, finalEq };
}

describe("outcomeWriter", () => {
  it("isTerminalLeadStatus recognizes closed CRM statuses", () => {
    expect(isTerminalLeadStatus("Uzavretý")).toBe(true);
    expect(isTerminalLeadStatus("Teplý")).toBe(false);
  });

  it("mapLeadStatusToGenomeOutcome maps won/lost", () => {
    expect(mapLeadStatusToGenomeOutcome("Uzavretý").outcome).toBe("lead_won");
    expect(mapLeadStatusToGenomeOutcome("Stratený").outcome).toBe("lead_lost");
  });

  it("outcomeValueEurForDecision uses EV on win only", () => {
    expect(outcomeValueEurForDecision("Uzavretý", { id: "d1", expected_value_eur: 420, expected_outcome: null })).toBe(420);
    expect(outcomeValueEurForDecision("Stratený", { id: "d1", expected_value_eur: 420, expected_outcome: null })).toBe(0);
  });

  it("skips non-terminal lead status", async () => {
    const { client } = buildClient([{ id: "dec-1", expected_value_eur: 100 }]);
    const result = await resolveOpenDecisionsForLead({
      leadId: LEAD,
      agencyId: AGENCY,
      newStatus: "Horúci",
      client,
    });
    expect(result.resolved).toBe(0);
  });

  it("resolves open decisions on Uzavretý", async () => {
    const { client, insert, update } = buildClient([{ id: "dec-1", expected_value_eur: 420 }]);
    const result = await resolveOpenDecisionsForLead({
      leadId: LEAD,
      agencyId: AGENCY,
      newStatus: "Uzavretý",
      client,
    });
    expect(result.resolved).toBe(1);
    expect(result.outcomeIds).toEqual(["out-1"]);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        agency_id: AGENCY,
        decision_id: "dec-1",
        lead_id: LEAD,
        outcome: "lead_won",
        outcome_value_eur: 420,
      }),
    );
    expect(update).toHaveBeenCalledWith({ status: "resolved" });
  });

  it("resolves multiple open decisions", async () => {
    const { client } = buildClient([
      { id: "dec-1", expected_value_eur: 420 },
      { id: "dec-2", expected_value_eur: 310 },
    ]);
    const result = await resolveOpenDecisionsForLead({
      leadId: LEAD,
      agencyId: AGENCY,
      newStatus: "Stratený",
      client,
    });
    expect(result.resolved).toBe(2);
    expect(result.outcomeIds).toHaveLength(2);
  });
});
