/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { buildPricingV2Catalog } from "@/lib/pricing-v2";
import type { PricingV2ConfigPayload } from "@/lib/pricing-v2-contract";
import PricingV2Plans from "./PricingV2Plans";

function config(over: Partial<PricingV2ConfigPayload> = {}): PricingV2ConfigPayload {
  return { enabled: true, checkoutAvailable: true, yearlyAvailable: true, missingPriceEnvKeys: [], catalog: buildPricingV2Catalog(), ...over };
}

afterEach(() => {
  cleanup();
});

describe("PricingV2Plans", () => {
  it("neukazuje promo banner ani pri ročnom období, keď katalóg promo vypína", () => {
    render(<PricingV2Plans config={config()} navigate={vi.fn()} />);

    expect(screen.getByTestId("yearly-note")).toBeTruthy();
    expect(screen.queryByTestId("promo-note")).toBeNull();
  });

  it("pri nedostupnom checkout-e blokuje nákup a ukáže fail-closed správu", () => {
    render(<PricingV2Plans config={config({ checkoutAvailable: false, missingPriceEnvKeys: ["STRIPE_PRICE_V3_TEAM_MONTHLY"] })} navigate={vi.fn()} />);

    expect(screen.getByRole("status").textContent).toContain("Objednávka nie je zatiaľ dostupná");
    expect(screen.getByRole("button", { name: /pokračovať k objednávke/i })).toBeDisabled();
  });
});
