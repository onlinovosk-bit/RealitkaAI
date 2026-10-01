"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

type TopupKey = "start" | "rast" | "pro" | "mega";

type CreditsPlan = {
  creditsBalance: number;
  grantBalance: number;
  purchasedBalance: number;
  monthlyGrantCredits: number;
};

type TopupPackage = {
  key: TopupKey;
  label: string;
  credits: number;
  priceEur: number;
  featured?: boolean;
};

type CheckoutConfig = {
  topupCheckoutAvailable: boolean;
  topupPackages: TopupPackage[];
};

function formatCredits(n: number): string {
  return `${n} ${n === 1 ? "kredit" : n >= 2 && n <= 4 ? "kredity" : "kreditov"}`;
}

export default function CreditsTopupPanel() {
  const [plan, setPlan] = useState<CreditsPlan | null>(null);
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/billing/plan").then((r) => r.json()),
      fetch("/api/billing/checkout-config").then((r) => r.json()),
    ])
      .then(([planRes, configRes]) => {
        if (planRes.ok) {
          setPlan({
            creditsBalance: planRes.creditsBalance ?? 0,
            grantBalance: planRes.grantBalance ?? 0,
            purchasedBalance: planRes.purchasedBalance ?? 0,
            monthlyGrantCredits: planRes.monthlyGrantCredits ?? 0,
          });
        }
        if (configRes.ok) {
          setConfig({
            topupCheckoutAvailable: Boolean(configRes.topupCheckoutAvailable),
            topupPackages: configRes.topupPackages ?? [],
          });
        }
      })
      .catch(() => {
        setPlan(null);
        setConfig(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const startTopupCheckout = useCallback(async (packageKey: TopupKey) => {
    setCheckoutLoading(packageKey);
    setError(null);
    try {
      const res = await fetch("/api/billing/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutType: "topup", topupPackage: packageKey }),
      });
      const data = await res.json();
      if (data.ok && data.result?.url) {
        window.location.href = data.result.url;
        return;
      }
      setError(data.error ?? "Checkout nie je dostupný.");
    } catch {
      setError("Nepodarilo sa spustiť checkout.");
    } finally {
      setCheckoutLoading(null);
    }
  }, []);

  const balance = plan?.creditsBalance ?? 0;
  const zeroBalance = !loading && balance === 0;

  return (
    <section id="topup" className="scroll-mt-8 space-y-6">
      <div
        className="rounded-xl border p-6"
        style={{
          background: WORKDESK_CARD.background,
          borderColor: WORKDESK_CARD.borderColor,
          boxShadow: WORKDESK_CARD.boxShadow,
        }}
      >
        <h2 className="text-xl font-semibold mb-1" style={{ color: SLATE_HORIZON.ink }}>
          Kreditový zostatok
        </h2>
        {loading ? (
          <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
            Načítavam zostatok…
          </p>
        ) : (
          <>
            <p className="text-2xl font-bold" style={{ color: SLATE_HORIZON.brandDeep }}>
              Kreditový zostatok: {balance} kr
            </p>
            {zeroBalance && (
              <p className="mt-2 text-sm font-medium" style={{ color: SLATE_HORIZON.danger }}>
                0 kreditov — AI akcie sú pozastavené
              </p>
            )}
            {plan && (
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt style={{ color: SLATE_HORIZON.muted }}>Mesačný grant (pool)</dt>
                  <dd className="font-medium" style={{ color: SLATE_HORIZON.ink }}>
                    {formatCredits(plan.grantBalance)}
                    {plan.monthlyGrantCredits > 0 && (
                      <span className="font-normal" style={{ color: SLATE_HORIZON.muted }}>
                        {" "}
                        · mesačný grant {plan.monthlyGrantCredits} kr
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt style={{ color: SLATE_HORIZON.muted }}>Zakúpené (neexpirujú)</dt>
                  <dd className="font-medium" style={{ color: SLATE_HORIZON.ink }}>
                    {formatCredits(plan.purchasedBalance)}
                  </dd>
                </div>
              </dl>
            )}
          </>
        )}
      </div>

      {error && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: SLATE_HORIZON.red, color: SLATE_HORIZON.danger }}
        >
          {error}
        </div>
      )}

      <div
        className="rounded-xl border p-6"
        style={{
          background: WORKDESK_CARD.background,
          borderColor: WORKDESK_CARD.borderColor,
          boxShadow: WORKDESK_CARD.boxShadow,
        }}
      >
        <h3 className="text-lg font-semibold mb-2" style={{ color: SLATE_HORIZON.ink }}>
          Doplniť kredity
        </h3>
        <p className="text-sm mb-4" style={{ color: SLATE_HORIZON.muted }}>
          Jednorazové balíčky kreditov. Zakúpené kredity neexpirujú.
        </p>

        {loading && (
          <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
            Načítavam balíčky…
          </p>
        )}

        {!loading && !config?.topupCheckoutAvailable && (
          <div
            className="rounded-lg border p-4 text-sm"
            style={{
              background: "#FEF3C7",
              borderColor: "#FCD34D",
              color: "#92400E",
            }}
          >
            Online doplnenie kreditov momentálne nie je dostupné v tomto prostredí. Kontaktujte
            podporu alebo uplatnite kód zo štartovacieho balíka na{" "}
            <Link href="/upgrade" className="font-semibold underline">
              stránke upgrade
            </Link>
            .
          </div>
        )}

        {config?.topupCheckoutAvailable && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {config.topupPackages.map((pkg) => (
              <div
                key={pkg.key}
                className="rounded-lg border p-4 flex flex-col"
                style={{
                  borderColor: pkg.featured ? SLATE_HORIZON.brand : SLATE_HORIZON.line,
                  background: pkg.featured ? SLATE_HORIZON.soft : "#fff",
                }}
              >
                {pkg.featured && (
                  <span
                    className="text-xs font-semibold mb-1"
                    style={{ color: SLATE_HORIZON.brandDeep }}
                  >
                    Odporúčané
                  </span>
                )}
                <div className="font-semibold" style={{ color: SLATE_HORIZON.ink }}>
                  {pkg.label}
                </div>
                <div className="text-lg font-bold" style={{ color: SLATE_HORIZON.ink }}>
                  {pkg.credits} kr
                </div>
                <div className="text-sm mb-4" style={{ color: SLATE_HORIZON.muted }}>
                  {pkg.priceEur} € jednorazovo
                </div>
                <button
                  type="button"
                  disabled={!!checkoutLoading}
                  onClick={() => startTopupCheckout(pkg.key)}
                  className="mt-auto w-full rounded-md py-2 text-sm font-semibold text-white"
                  style={{
                    background: SLATE_HORIZON.brand,
                    opacity: checkoutLoading ? 0.6 : 1,
                  }}
                >
                  {checkoutLoading === pkg.key
                    ? "Presmerovanie…"
                    : `Kúpiť balík ${pkg.label} (${pkg.credits} kr)`}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
