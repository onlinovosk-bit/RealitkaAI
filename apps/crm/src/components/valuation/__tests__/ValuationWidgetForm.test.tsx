/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ValuationWidgetForm } from "@/components/valuation/ValuationWidgetForm";
import { INDIVIDUAL_ESTIMATE_COPY } from "@/components/valuation/estimate-presentation";
import type { ValuationPageContext } from "@/lib/valuation/tenant";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/valuation/analytics", () => ({
  trackValuationAbandon: vi.fn(),
  trackValuationContactSubmitted: vi.fn(),
  trackValuationLeadSubmitted: vi.fn(),
  trackValuationShown: vi.fn(),
  trackValuationStarted: vi.fn(),
  trackValuationStepCompleted: vi.fn(),
}));

const tenant: ValuationPageContext = {
  slug: "demo",
  brandName: "Demo Agency",
  logoUrl: null,
  primaryColor: "#0F766E",
  calendlyUrl: null,
  isSandbox: true,
  agencyId: "00000000-0000-0000-0000-000000000001",
  headline: "Odhad",
  subhead: "Test",
  contactPromise: "Ozveme sa do 24 h.",
  privacyUrl: "/privacy",
};

async function fillPropertyAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  city: string,
) {
  await user.type(screen.getByPlaceholderText("Prešov"), city);
  const sqmInput = screen.getAllByRole("spinbutton")[0];
  await user.clear(sqmInput);
  await user.type(sqmInput, "70");
  await user.click(screen.getByRole("button", { name: /Zobraziť môj odhad/i }));
}

describe("ValuationWidgetForm admitted range", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ok: true,
          estimate: {
            noEstimate: true,
            currency: "EUR",
            commentary: "insufficient_data",
            disclaimer: "Orientačný odhad.",
            priceSource: "none",
          },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows individual copy without EUR and keeps contact form reachable on insufficient_data", async () => {
    const user = userEvent.setup();
    render(<ValuationWidgetForm tenant={tenant} abVariant="B" sessionId="test-session" />);

    await fillPropertyAndSubmit(user, "Xyzabc");

    await waitFor(() => {
      expect(screen.getByText(INDIVIDUAL_ESTIMATE_COPY)).toBeTruthy();
    });
    expect(screen.queryByTestId("valuation-price-band")).toBeNull();
    const estimatePanel = screen.getByTestId("valuation-estimate-presentation");
    expect(estimatePanel.textContent).not.toMatch(/€\s*\d/);
    expect(estimatePanel.textContent).not.toMatch(/\d[\d\s\u00a0]*€/);

    await user.click(screen.getByRole("button", { name: /Pokračovať na kontakt/i }));

    const contactForm = screen.getByRole("button", { name: /Odoslať dopyt/i }).closest("form");
    expect(contactForm).toBeTruthy();
    expect(within(contactForm as HTMLElement).getByText(/Meno a priezvisko/i)).toBeTruthy();
    expect(within(contactForm as HTMLElement).getByText(/^Telefón$/i)).toBeTruthy();
    expect(within(contactForm as HTMLElement).getByText(/^E-mail$/i)).toBeTruthy();
    expect(within(contactForm as HTMLElement).getAllByRole("textbox").length).toBeGreaterThanOrEqual(2);
    expect(within(contactForm as HTMLElement).getByRole("checkbox", { name: /ochrane osobných údajov/i })).toBeTruthy();
  });

  it("renders Presnú cenu určí maklér when a numeric band is returned", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ok: true,
          estimate: {
            noEstimate: false,
            low: 145000,
            high: 179000,
            currency: "EUR",
            commentary: "Komentár",
            disclaimer: "Disclaimer",
            priceSource: "city",
          },
        }),
      ),
    );

    const user = userEvent.setup();
    render(<ValuationWidgetForm tenant={tenant} abVariant="B" sessionId="test-session-2" />);

    await fillPropertyAndSubmit(user, "Poprad");

    await waitFor(() => {
      expect(screen.getByText(/Presnú cenu určí maklér/)).toBeTruthy();
    });
    expect(screen.getByTestId("valuation-price-band").textContent).toMatch(/145/);
    expect(screen.getByTestId("valuation-price-band").textContent).toMatch(/€$/);
  });
});
