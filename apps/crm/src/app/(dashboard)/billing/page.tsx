'use client';
import React, { useState, useEffect } from 'react';
import ModuleShell from '@/components/shared/module-shell';
import CreditsTopupPanel from '@/components/billing/CreditsTopupPanel';
import { SLATE_HORIZON, WORKDESK_CARD } from '@/lib/slate-horizon-theme';
import { usePricingV2Catalog } from '@/components/marketing/pricing-v2-context';
import { formatEurFromCents, grossPriceLine } from '@/components/marketing/pricing-v2-copy';
import { useAgencyPricingV2 } from '@/components/billing/v2/agency-pricing-context';

const PLAN_NAMES: Record<string, string> = {
  free:               'FREE',
  starter:            'SOLO SEAT',
  active_force:       'TEAM SEAT',
  enterprise:         'OFFICE SEAT',
  market_vision:      'OFFICE SEAT',
  protocol_authority: 'ENTERPRISE SEAT',
};

const PLAN_PRICES: Record<string, string> = {
  free:               '0 €',
  starter:            '79 €',
  active_force:       '71 €',
  enterprise:         '63 €',
  market_vision:      '63 €',
  protocol_authority: 'Custom',
};

export default function BillingPage() {
  const [planKey, setPlanKey]         = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  // Cenník v2: zákazník s v2 predplatným nesmie vidieť legacy cenu (79/71/63 €) podľa planKey.
  const pricingV2Catalog = usePricingV2Catalog();
  const agencyV2 = useAgencyPricingV2();
  const v2Band = pricingV2Catalog && agencyV2 ? pricingV2Catalog.bands.find((b) => b.id === agencyV2.bandId) : undefined;
  const isV2Customer = Boolean(pricingV2Catalog && agencyV2);

  useEffect(() => {
    fetch('/api/billing/plan')
      .then(r => r.json())
      .then(d => setPlanKey(d.planKey ?? 'free'))
      .catch(() => setPlanKey('free'))
      .finally(() => setLoading(false));
  }, []);

  async function handleStripePortal() {
    setPortalLoading(true);
    try {
      const res  = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.result?.url) {
        window.location.href = data.result.url;
      }
    } finally {
      setPortalLoading(false);
    }
  }

  const planName  = loading ? '…' : isV2Customer ? (v2Band ? v2Band.label : 'Plán') : (PLAN_NAMES[planKey!]  ?? planKey!.toUpperCase());
  const planPrice = loading
    ? '…'
    : isV2Customer
      ? (v2Band ? `${v2Band.isFromPrice ? 'od ' : ''}${formatEurFromCents(v2Band.netCents)}` : '—')
      : (PLAN_PRICES[planKey!] ?? '—');

  return (
    <div style={{ background: SLATE_HORIZON.bg, minHeight: '100vh' }}>
      <ModuleShell
        title="Predplatné a licencie"
        description="Spravujte seat-based plán, kreditový zostatok a fakturačné údaje Revolis."
      >
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div
              className="rounded-xl border p-6"
              style={{
                background: WORKDESK_CARD.background,
                borderColor: WORKDESK_CARD.borderColor,
                boxShadow: WORKDESK_CARD.boxShadow,
              }}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: SLATE_HORIZON.ink }}>Aktuálny program</h3>
                  {!loading && (
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ background: SLATE_HORIZON.soft, color: SLATE_HORIZON.brandDeep }}
                    >
                      {planName}
                    </span>
                  )}
                </div>
                {!loading && (
                  <span className="text-2xl font-bold" style={{ color: SLATE_HORIZON.ink }}>
                    {planPrice}<span className="text-sm font-normal" style={{ color: SLATE_HORIZON.muted }}>{isV2Customer && v2Band ? '/mes bez DPH' : '/mes'}</span>
                    {isV2Customer && v2Band && pricingV2Catalog && (
                      <span className="block text-right text-xs font-normal" style={{ color: SLATE_HORIZON.muted }}>
                        {grossPriceLine(v2Band, pricingV2Catalog.vatPercent)}
                      </span>
                    )}
                  </span>
                )}
              </div>
              <button
                onClick={handleStripePortal}
                disabled={portalLoading || loading}
                className="w-full rounded-md py-2 font-semibold text-white transition"
                style={{
                  background: SLATE_HORIZON.topbarGradient,
                  opacity: (portalLoading || loading) ? 0.6 : 1,
                  cursor: (portalLoading || loading) ? 'not-allowed' : 'pointer',
                }}
              >
                {portalLoading ? 'Otvára sa…' : 'Spravovať v Stripe'}
              </button>
            </div>

            <div
              className="rounded-xl border p-6"
              style={{
                background: WORKDESK_CARD.background,
                borderColor: WORKDESK_CARD.borderColor,
                boxShadow: WORKDESK_CARD.boxShadow,
              }}
            >
              <h3 className="mb-4 text-lg font-semibold" style={{ color: SLATE_HORIZON.ink }}>Seat program</h3>
              <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
                Zmena počtu seatov alebo Owner Cockpit — na stránke upgrade programu.
              </p>
              <a
                href="/upgrade"
                className="mt-4 inline-block text-sm font-semibold underline"
                style={{ color: SLATE_HORIZON.brandDeep }}
              >
                Upgrade programu →
              </a>
            </div>
          </div>

          <CreditsTopupPanel />
        </div>
      </ModuleShell>
    </div>
  );
}
