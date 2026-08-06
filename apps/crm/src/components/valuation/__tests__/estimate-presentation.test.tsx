/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  formatValuationPriceBand,
  ORIENTATION_COPY,
  ValuationEstimatePresentation,
} from "@/components/valuation/estimate-presentation";
import { ValuationWidgetForm } from "@/components/valuation/ValuationWidgetForm";
import type { ValuationEstimateResult } from "@/lib/valuation/types";
import type { ValuationPageContext } from "@/lib/valuation/tenant";

vi.mock("@/lib/valuation/analytics", () => ({
  trackValuationAbandon: vi.fn(),
  trackValuationContactSubmitted: vi.fn(),
  trackValuationLeadSubmitted: vi.fn(),
  trackValuationShown: vi.fn(),
  trackValuationStarted: vi.fn(),
  trackValuationStepCompleted: vi.fn(),
}));

const tenant: ValuationPageContext = {
  slug: "reality-smolko",
  brandName: "Test Agency",
  logoUrl: null,
  primaryColor: "#0F172A",
  calendlyUrl: null,
  isSandbox: false,
  agencyId: "11111111-1111-1111-1111-111111111111",
  headline: "Odhad",
  subhead: "Orientačný odhad",
  contactPromise: "Ozveme sa do 24 hodín.",
  privacyUrl: "/privacy",
};

function baseEstimate(
  overrides: Partial<ValuationEstimateResult> = {},
): ValuationEstimateResult {
  return {
    noEstimate: false,
    low: 145_000,
    high: 179_000,
    currency: "EUR",
    priceSource: "city",
    commentary: "Test commentary without price claim.",
    disclaimer: "Informatívny odhad — nie znalecký posudok.",
    ...overrides,
  };
}

/** Detects a numeric EUR price claim (band or leading/trailing €). */
function domHasEurPrice(root: HTMLElement): boolean {
  const text = root.textContent ?? "";
  if (/€\s*[\d\s]+|[\d\s]+\s*€/.test(text)) return true;
  if (/\d{1,3}(?:[ \u00a0]\d{3})+\s*[–-]\s*\d{1,3}(?:[ \u00a0]\d{3})+/.test(text)) {
    return true;
  }
  return false;
}

describe("formatValuationPriceBand", () => {
  it("formats Slovak band without leading €", () => {
    expect(formatValuationPriceBand(145_000, 179_000)).toBe("145 000 – 179 000 €");
  });
});

describe("ValuationEstimatePresentation", () => {
  it("renders orientation copy with Presnú cenu určí maklér", () => {
    render(<ValuationEstimatePresentation estimate={baseEstimate()} />);
    expect(screen.getByText(ORIENTATION_COPY)).toBeTruthy();
    expect(screen.getByTestId("valuation-estimate-presentation").textContent).toContain(
      "Presnú cenu určí maklér",
    );
    expect(screen.getByTestId("valuation-price-band").textContent).toBe(
      "145 000 – 179 000 €",
    );
  });

  it("adds national wider-range sentence when priceSource is national", () => {
    render(
      <ValuationEstimatePresentation
        estimate={baseEstimate({ priceSource: "national", low: 120_000, high: 200_000 })}
      />,
    );
    expect(screen.getByTestId("valuation-national-wider-copy").textContent).toContain(
      "rozpätie širšie",
    );
  });

  it("priceSource none shows no EUR price in DOM", () => {
    const { container } = render(
      <ValuationEstimatePresentation
        estimate={baseEstimate({
          noEstimate: true,
          priceSource: "none",
          low: undefined,
          high: undefined,
          commentary: "Should not appear as a price claim.",
        })}
      />,
    );
    expect(screen.getByTestId("valuation-individual-estimate").textContent).toContain(
      "pripravíme odhad individuálne",
    );
    expect(screen.queryByTestId("valuation-price-band")).toBeNull();
    expect(domHasEurPrice(container)).toBe(false);
  });
});

describe("ValuationWidgetForm insufficient_data contact", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          ok: true,
          estimate: baseEstimate({
            noEstimate: true,
            priceSource: "none",
            low: undefined,
            high: undefined,
          }),
        }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps contact form available after insufficient_data estimate", async () => {
    const { container } = render(
      <ValuationWidgetForm tenant={tenant} abVariant="B" sessionId="sess-pr2" />,
    );

    fireEvent.change(screen.getByPlaceholderText("Prešov"), {
      target: { value: "Xyzabc" },
    });
    const spinbuttons = screen.getAllByRole("spinbutton");
    // Úžitková plocha is the first number input on the property step
    fireEvent.change(spinbuttons[0]!, { target: { value: "70" } });
    fireEvent.click(screen.getByRole("button", { name: /Zobraziť môj odhad/i }));

    await waitFor(() => {
      expect(screen.getByTestId("valuation-individual-estimate")).toBeTruthy();
    });
    expect(domHasEurPrice(screen.getByTestId("valuation-estimate-presentation"))).toBe(
      false,
    );

    fireEvent.click(screen.getByRole("button", { name: /Pokračovať na kontakt/i }));

    expect(screen.getByText("Meno a priezvisko")).toBeTruthy();
    expect(container.querySelector('input[type="tel"]')).toBeTruthy();
    expect(container.querySelector('input[type="email"]')).toBeTruthy();
    expect(screen.getByRole("button", { name: /Odoslať dopyt/i })).toBeTruthy();
  });
});
