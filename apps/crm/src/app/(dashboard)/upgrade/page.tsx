'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SLATE_HORIZON, WORKDESK_CARD } from '@/lib/slate-horizon-theme';

type SeatTierKey = 'solo' | 'team' | 'office';
type TopupKey = 'start' | 'rast' | 'pro' | 'mega';

type CheckoutConfig = {
  seatCheckoutAvailable: boolean;
  topupCheckoutAvailable: boolean;
  checkoutAvailable: boolean;
  migrationDfyAvailable: boolean;
  migrationDfy: {
    label: string;
    priceEur: number;
  };
  founderCockpitEligible: boolean;
  founderCockpitRemaining: number;
  seatTiers: Array<{
    key: SeatTierKey;
    label: string;
    priceEur: number;
    minSeats: number;
    defaultSeats: number;
    monthlyGrantPerSeat: number;
  }>;
  cockpit: {
    liteMinSeats: number;
    ownerPriceEur: number;
    ownerFounderPriceEur: number;
  };
  topupPackages: Array<{
    key: TopupKey;
    label: string;
    credits: number;
    priceEur: number;
    featured?: boolean;
  }>;
};

export default function UpgradePage() {
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [seatTier, setSeatTier] = useState<SeatTierKey>('team');
  const [seatCount, setSeatCount] = useState(3);
  const [includeCockpit, setIncludeCockpit] = useState(false);
  const [includeMigrationDfy, setIncludeMigrationDfy] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/billing/checkout-config')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.data) setConfig(d.data);
      })
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, []);

  const tierMeta = useMemo(
    () => config?.seatTiers.find((t) => t.key === seatTier),
    [config, seatTier],
  );

  useEffect(() => {
    if (tierMeta) setSeatCount(tierMeta.defaultSeats);
  }, [tierMeta?.key]);

  const cockpitEligible = (tierMeta?.minSeats ?? 3) <= seatCount && seatCount >= 3;
  const cockpitPrice = config?.founderCockpitEligible
    ? config.cockpit.ownerFounderPriceEur
    : config?.cockpit.ownerPriceEur ?? 349;

  const monthlyTotal = useMemo(() => {
    if (!tierMeta) return 0;
    let total = tierMeta.priceEur * seatCount;
    if (includeCockpit && cockpitEligible) total += cockpitPrice;
    return total;
  }, [tierMeta, seatCount, includeCockpit, cockpitEligible, cockpitPrice]);

  const startCheckout = useCallback(
    async (body: Record<string, unknown>, key: string) => {
      setCheckoutLoading(key);
      setError(null);
      try {
        const res = await fetch('/api/billing/credits/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.ok && data.data?.result?.url) {
          window.location.href = data.data.result.url;
          return;
        }
        setError(data.error ?? 'Checkout nie je dostupný.');
      } catch {
        setError('Nepodarilo sa spustiť checkout.');
      } finally {
        setCheckoutLoading(null);
      }
    },
    [],
  );

  const unavailable = !loading && !config?.checkoutAvailable;

  return (
    <div
      className="mx-auto max-w-5xl py-8 px-6"
      style={{ background: SLATE_HORIZON.bg, minHeight: '100vh' }}
    >
      <header className="mb-8 border-b pb-4" style={{ borderColor: SLATE_HORIZON.line }}>
        <h1 className="text-3xl font-bold" style={{ color: SLATE_HORIZON.ink }}>
          Upgrade programu
        </h1>
        <p style={{ color: SLATE_HORIZON.muted }}>
          Seat-based predplatné, Owner Cockpit a doplnkové kredity.
        </p>
      </header>

      {loading && (
        <p style={{ color: SLATE_HORIZON.muted }}>Načítavam možnosti checkoutu…</p>
      )}

      {unavailable && (
        <div
          className="mb-8 rounded-xl border p-6"
          style={{
            background: '#FEF3C7',
            borderColor: '#FCD34D',
            color: '#92400E',
          }}
        >
          <h2 className="text-lg font-semibold mb-2">Checkout momentálne nedostupný</h2>
          <p className="text-sm">
            Stripe ceny pre seat alebo top-up balíčky nie sú nakonfigurované v tomto prostredí.
            Kontaktujte podporu alebo skúste neskôr.
          </p>
          <Link
            href="/billing"
            className="mt-4 inline-block text-sm font-medium underline"
            style={{ color: SLATE_HORIZON.brandDeep }}
          >
            Späť na fakturáciu
          </Link>
        </div>
      )}

      {error && (
        <div
          className="mb-6 rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: SLATE_HORIZON.red, color: SLATE_HORIZON.danger }}
        >
          {error}
        </div>
      )}

      {config?.seatCheckoutAvailable && (
        <section
          className="mb-8 rounded-xl border p-6"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: SLATE_HORIZON.ink }}>
            Seat program
          </h2>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            {config.seatTiers.map((tier) => (
              <button
                key={tier.key}
                type="button"
                onClick={() => setSeatTier(tier.key)}
                className="rounded-lg border p-4 text-left transition"
                style={{
                  borderColor: seatTier === tier.key ? SLATE_HORIZON.brand : SLATE_HORIZON.line,
                  background: seatTier === tier.key ? SLATE_HORIZON.soft : '#fff',
                }}
              >
                <div className="font-semibold" style={{ color: SLATE_HORIZON.ink }}>
                  {tier.label}
                </div>
                <div className="text-2xl font-bold mt-1" style={{ color: SLATE_HORIZON.brandDeep }}>
                  {tier.priceEur} €
                  <span className="text-sm font-normal" style={{ color: SLATE_HORIZON.muted }}>
                    /seat/mes
                  </span>
                </div>
                <p className="text-xs mt-2" style={{ color: SLATE_HORIZON.muted }}>
                  min. {tier.minSeats} seat{tier.minSeats > 1 ? 'y' : ''} · {tier.monthlyGrantPerSeat} kr/seat/mes
                </p>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-4 mb-6">
            <label className="block">
              <span className="text-sm font-medium" style={{ color: SLATE_HORIZON.ink }}>
                Počet seatov
              </span>
              <input
                type="number"
                min={tierMeta?.minSeats ?? 1}
                value={seatCount}
                onChange={(e) =>
                  setSeatCount(Math.max(tierMeta?.minSeats ?? 1, Number(e.target.value) || 1))
                }
                className="mt-1 block w-28 rounded-md border px-3 py-2"
                style={{ borderColor: SLATE_HORIZON.line }}
              />
            </label>

            {cockpitEligible && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCockpit}
                  onChange={(e) => setIncludeCockpit(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm" style={{ color: SLATE_HORIZON.ink }}>
                  Owner Cockpit (+{cockpitPrice} €/mes
                  {config.founderCockpitEligible && (
                    <span style={{ color: SLATE_HORIZON.greenDark }}>
                      {' '}
                      · founder {config.founderCockpitRemaining} voľných
                    </span>
                  )}
                  )
                </span>
              </label>
            )}
          </div>

          {config.migrationDfyAvailable && (
            <label
              className="mb-6 block cursor-pointer rounded-lg border p-4 transition"
              style={{
                borderColor: includeMigrationDfy ? SLATE_HORIZON.brand : SLATE_HORIZON.line,
                background: includeMigrationDfy ? SLATE_HORIZON.soft : '#fff',
              }}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={includeMigrationDfy}
                  onChange={(e) => setIncludeMigrationDfy(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <div className="font-semibold" style={{ color: SLATE_HORIZON.ink }}>
                    {config.migrationDfy.label} — {config.migrationDfy.priceEur} € jednorazovo
                  </div>
                  <p className="text-sm mt-1" style={{ color: SLATE_HORIZON.muted }}>
                    Pošlete nám export z portálu alebo CRM — do 48 h máte dáta v Revolise,
                    skontrolované a zoradené.
                  </p>
                </div>
              </div>
            </label>
          )}

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
                Odhad mesačne
              </span>
              <div className="text-2xl font-bold" style={{ color: SLATE_HORIZON.ink }}>
                {monthlyTotal} €
              </div>
            </div>
            <button
              type="button"
              disabled={!!checkoutLoading}
              onClick={() =>
                startCheckout(
                  {
                    checkoutType: 'seat',
                    seatTier,
                    quantity: seatCount,
                    includeOwnerCockpit: includeCockpit && cockpitEligible,
                    includeMigrationDfy: includeMigrationDfy && config.migrationDfyAvailable,
                  },
                  'seat',
                )
              }
              className="rounded-md px-6 py-2.5 font-semibold text-white"
              style={{
                background: SLATE_HORIZON.topbarGradient,
                opacity: checkoutLoading ? 0.6 : 1,
              }}
            >
              {checkoutLoading === 'seat' ? 'Presmerovanie…' : 'Pokračovať do Stripe'}
            </button>
          </div>
        </section>
      )}

      {config?.topupCheckoutAvailable && (
        <section
          className="rounded-xl border p-6"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: SLATE_HORIZON.ink }}>
            Doplniť kredity
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {config.topupPackages.map((pkg) => (
              <div
                key={pkg.key}
                className="rounded-lg border p-4 flex flex-col"
                style={{
                  borderColor: pkg.featured ? SLATE_HORIZON.brand : SLATE_HORIZON.line,
                  background: pkg.featured ? SLATE_HORIZON.soft : '#fff',
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
                  onClick={() =>
                    startCheckout(
                      { checkoutType: 'topup', topupPackage: pkg.key },
                      `topup-${pkg.key}`,
                    )
                  }
                  className="mt-auto w-full rounded-md py-2 text-sm font-semibold text-white"
                  style={{
                    background: SLATE_HORIZON.brand,
                    opacity: checkoutLoading ? 0.6 : 1,
                  }}
                >
                  {checkoutLoading === `topup-${pkg.key}` ? '…' : 'Kúpiť'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
