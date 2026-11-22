import { describe, expect, it, vi } from "vitest";
import { fetchPublicBuyerIntent } from "@/lib/public-listings/fetch-buyer-intent";

function mockClient(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eqAgency = vi.fn(() => ({ maybeSingle }));
  const eqId = vi.fn(() => ({ eq: eqAgency }));
  const select = vi.fn(() => ({ eq: eqId }));
  const from = vi.fn(() => ({ select }));
  return {
    client: { from } as never,
    from,
    select,
    eqId,
    eqAgency,
    maybeSingle,
  };
}

describe("fetchPublicBuyerIntent", () => {
  it("rejects non-UUID intent ids without querying", async () => {
    const { client, from } = mockClient({ data: null, error: null });
    await expect(
      fetchPublicBuyerIntent(client, "not-a-uuid", "agency-1"),
    ).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("scopes the lookup to the public listing agency via leads!inner", async () => {
    const intentId = "11111111-1111-4111-8111-111111111111";
    const agencyId = "22222222-2222-4222-8222-222222222222";
    const { client, from, select, eqId, eqAgency } = mockClient({
      data: {
        id: intentId,
        lead_id: "lead-1",
        deal_type: "buy",
        property_type: "flat",
        primary_city: "Bratislava",
        budget_min: 0,
        budget_max: 250000,
        time_horizon_months: "3-6",
        new_build_only: false,
        needs_mortgage_help: true,
        raw_focus_text: "2-izbový pri Dunaji",
        client_segment: "relocator",
        buyer_readiness_score: 70,
        created_at: "2026-11-01T00:00:00.000Z",
        updated_at: "2026-11-01T00:00:00.000Z",
      },
      error: null,
    });

    const intent = await fetchPublicBuyerIntent(client, intentId, agencyId);
    expect(from).toHaveBeenCalledWith("buyer_intents");
    expect(select).toHaveBeenCalledWith(
      expect.stringContaining("leads!inner(agency_id)"),
    );
    expect(eqId).toHaveBeenCalledWith("id", intentId);
    expect(eqAgency).toHaveBeenCalledWith("leads.agency_id", agencyId);
    expect(intent?.rawFocusText).toBe("2-izbový pri Dunaji");
    expect(intent?.budgetMax).toBe(250000);
  });

  it("returns null when the intent belongs to another agency (no row)", async () => {
    const { client } = mockClient({ data: null, error: null });
    await expect(
      fetchPublicBuyerIntent(
        client,
        "11111111-1111-4111-8111-111111111111",
        "agency-other",
      ),
    ).resolves.toBeNull();
  });
});
