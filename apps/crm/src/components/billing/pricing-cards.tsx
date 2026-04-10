"use client";

import { useState } from "react";
import { fetchJson } from "@/lib/request-helpers";

type Plan = {
  key: string;
  name: string;
  priceLabel: string;
  originalPriceLabel?: string;
  description: string;
  recommended?: boolean;
};

export default function PricingCards({ plans }: { plans: Plan[] }) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  async function startCheckout(planKey: string) {
    setLoadingKey(planKey);
    try {
      const data = await fetchJson("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planKey }),
      });
      if (data?.result?.url) {
        window.location.href = data.result.url;
        return;
      }
      throw new Error("Stripe checkout URL nebola vrátená.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Nepodarilo sa spustiť checkout.");
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {plans.map((plan) => {
        const isPro = plan.key === "pro" || plan.recommended;
        return (
          <div
            key={plan.key}
            className={`relative rounded-3xl border p-8 shadow-sm ${
              isPro
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-900"
            }`}
          >
            {isPro && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-4 py-1 text-xs font-bold text-gray-900">
                ⭐ ODPORÚČANÉ
              </span>
            )}

            <h2 className="text-2xl font-bold">{plan.name}</h2>
            <p className={`mt-3 text-sm ${isPro ? "text-gray-300" : "text-gray-500"}`}>
              {plan.description}
            </p>

            <div className="mt-6">
              {plan.originalPriceLabel && (
                <p className={`text-sm line-through ${isPro ? "text-gray-500" : "text-gray-400"}`}>
                  {plan.originalPriceLabel}
                </p>
              )}
              <p className="text-4xl font-bold">{plan.priceLabel}</p>
              {plan.originalPriceLabel && (
                <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                  -50 % zľava
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => startCheckout(plan.key)}
              disabled={loadingKey === plan.key}
              className={`mt-8 w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
                isPro
                  ? "bg-white text-gray-900 hover:bg-gray-100"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              } disabled:opacity-60`}
            >
              {loadingKey === plan.key ? "Presmerovávam..." : "Vybrať plán"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
