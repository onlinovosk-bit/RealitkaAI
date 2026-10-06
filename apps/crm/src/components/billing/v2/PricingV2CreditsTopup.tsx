"use client";

import { useState } from "react";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";
import { priceExtraCredits } from "@/lib/pricing-v2";
import type { PricingV2ConfigPayload } from "@/lib/pricing-v2-contract";
import { buildCreditsRequest, PRICING_V2_MESSAGES, submitPricingV2Checkout } from "./checkout";
import { formatEurCents } from "./format";

type Props = {
  config: PricingV2ConfigPayload;
  /** Presmerovanie na Stripe; v testoch sa nahrádza. */
  navigate?: (url: string) => void;
};

const defaultNavigate = (url: string) => {
  window.location.href = url;
};

/** Jednorazové dokúpenie kreditov (cenník v2): cena riadku ide z katalógu / `priceExtraCredits`, nie z ručného násobenia. */
export default function PricingV2CreditsTopup({ config, navigate = defaultNavigate }: Props) {
  const [credits, setCredits] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catalog = config.catalog;
  if (!catalog) return null;

  const amount = priceExtraCredits(credits, catalog.vatPercent);
  const canBuy = config.checkoutAvailable && amount !== null && !busy;

  async function buy() {
    if (!canBuy) return;
    setBusy(true);
    setError(null);
    const outcome = await submitPricingV2Checkout(buildCreditsRequest(credits));
    if (outcome.kind === "redirect") {
      navigate(outcome.url);
      return;
    }
    setError(outcome.message);
    setBusy(false);
  }

  return (
    <div
      data-testid="pricing-v2-credits"
      className="rounded-xl border p-6"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <h3 className="text-lg font-semibold mb-1" style={{ color: SLATE_HORIZON.ink }}>
        Doplniť kredity
      </h3>
      <p className="text-sm mb-4" style={{ color: SLATE_HORIZON.muted }}>
        Došli vám kredity skôr, než mesiac? Dokúpte presne toľko, koľko treba — jednorazovo, bez zmeny plánu.
        Jeden kredit stojí {formatEurCents(catalog.creditUnit.netCents)} bez DPH (
        {formatEurCents(catalog.creditUnit.grossCents)} s {catalog.vatPercent} % DPH).
      </p>

      {!config.checkoutAvailable && (
        <p role="status" className="mb-4 rounded-lg border p-3 text-sm" style={{ background: "#FEF3C7", borderColor: "#FCD34D", color: "#92400E" }}>
          {PRICING_V2_MESSAGES.unavailable}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="text-sm font-medium" style={{ color: SLATE_HORIZON.ink }}>
            Počet kreditov
          </span>
          <input
            type="number"
            min={1}
            step={1}
            value={Number.isFinite(credits) ? credits : ""}
            onChange={(e) => setCredits(e.target.value === "" ? Number.NaN : Number(e.target.value))}
            className="mt-1 block w-32 rounded-md border px-3 py-2"
            style={{ borderColor: SLATE_HORIZON.line }}
            aria-label="Počet kreditov"
          />
        </label>
        <div data-testid="credits-price" className="text-sm" style={{ color: SLATE_HORIZON.ink }}>
          {amount ? (
            <>
              <strong>{formatEurCents(amount.netCents)}</strong> bez DPH ·{" "}
              <strong>{formatEurCents(amount.grossCents)}</strong> s DPH jednorazovo
            </>
          ) : (
            "Zadajte celý počet kreditov od 1."
          )}
        </div>
        <button
          type="button"
          disabled={!canBuy}
          onClick={buy}
          className="rounded-md px-6 py-2 text-sm font-semibold text-white"
          style={{ background: SLATE_HORIZON.brand, opacity: canBuy ? 1 : 0.6 }}
        >
          {busy ? "Presmerovanie…" : "Dokúpiť kredity"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: SLATE_HORIZON.red, color: SLATE_HORIZON.danger }}>
          {error}
        </p>
      )}
    </div>
  );
}
