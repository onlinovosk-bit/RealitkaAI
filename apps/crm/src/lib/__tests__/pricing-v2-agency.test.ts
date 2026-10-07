import { describe, expect, it, vi } from "vitest";
import { fetchAgencyPricingV2, parseAgencyPricingV2 } from "../pricing-v2-agency";

describe("parseAgencyPricingV2 (fail-closed)", () => {
  it("v2 riadok s platným pásmom", () => {
    expect(parseAgencyPricingV2({ pricing_model: "v2", pricing_band: "office" })).toEqual({ bandId: "office" });
  });
  it("v2 riadok s neznámym / chýbajúcim pásmom -> bandId null (stále v2)", () => {
    expect(parseAgencyPricingV2({ pricing_model: "v2", pricing_band: "enterprise" })).toEqual({ bandId: null });
    expect(parseAgencyPricingV2({ pricing_model: "v2" })).toEqual({ bandId: null });
  });
  it("legacy / NULL / iné / chýbajúci riadok -> null", () => {
    for (const row of [{ pricing_model: null, pricing_band: "team" }, { pricing_model: "legacy" }, { pricing_model: "V2" }, {}, null, undefined]) {
      expect(parseAgencyPricingV2(row as never)).toBeNull();
    }
  });
});

describe("fetchAgencyPricingV2", () => {
  const client = (result: unknown, throws = false) =>
    ({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: throws ? vi.fn().mockRejectedValue(new Error("boom")) : vi.fn().mockResolvedValue(result),
          }),
        }),
      }),
    }) as never;

  it("vráti v2 stav z riadku", async () => {
    expect(await fetchAgencyPricingV2(client({ data: { pricing_model: "v2", pricing_band: "team" }, error: null }), "a1")).toEqual({ bandId: "team" });
  });
  it("chyba dotazu alebo výnimka = legacy (null)", async () => {
    expect(await fetchAgencyPricingV2(client({ data: null, error: { message: "column does not exist" } }), "a1")).toBeNull();
    expect(await fetchAgencyPricingV2(client(null, true), "a1")).toBeNull();
  });
});
