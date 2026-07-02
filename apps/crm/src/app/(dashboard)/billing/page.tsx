'use client';
import React, { useState, useEffect } from 'react';
import { SLATE_HORIZON, WORKDESK_CARD } from '@/lib/slate-horizon-theme';

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

  const planName  = loading ? '…' : (PLAN_NAMES[planKey!]  ?? planKey!.toUpperCase());
  const planPrice = loading ? '…' : (PLAN_PRICES[planKey!] ?? '—');

  return (
    <div
      className="mx-auto max-w-4xl py-8 px-6"
      style={{ background: SLATE_HORIZON.bg, minHeight: "100vh" }}
    >
      <header
        className="mb-8 border-b pb-4"
        style={{ borderColor: SLATE_HORIZON.line }}
      >
        <h1 className="text-3xl font-bold" style={{ color: SLATE_HORIZON.ink }}>Predplatné a licencie</h1>
        <p style={{ color: SLATE_HORIZON.muted }}>Spravujte seat-based plán a fakturačné údaje Revolis.</p>
      </header>

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
                {planPrice}<span className="text-sm font-normal" style={{ color: SLATE_HORIZON.muted }}>/mes</span>
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
          <h3 className="mb-4 text-lg font-semibold" style={{ color: SLATE_HORIZON.ink }}>Využitie zdrojov</h3>
          <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
            Prehľad spotreby AI tokenov bude dostupný v nasledujúcej verzii.
          </p>
        </div>
      </div>
    </div>
  );
}
