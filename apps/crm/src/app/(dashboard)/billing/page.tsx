'use client';
import React, { useState, useEffect } from 'react';

const PLAN_NAMES: Record<string, string> = {
  free:               'FREE',
  starter:            'SMART START',
  active_force:       'ACTIVE FORCE',
  market_vision:      'MARKET VISION',
  protocol_authority: 'PROTOCOL AUTHORITY',
};

const PLAN_PRICES: Record<string, string> = {
  free:               '0 €',
  starter:            '49 €',
  active_force:       '99 €',
  market_vision:      '199 €',
  protocol_authority: '449 €',
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
      style={{ background: "#050914", minHeight: "100vh" }}
    >
      <header
        className="mb-8 border-b pb-4"
        style={{ borderColor: "#0F1F3D" }}
      >
        <h1 className="text-3xl font-bold" style={{ color: "#F0F9FF" }}>Predplatné a licencie</h1>
        <p style={{ color: "#64748B" }}>Spravujte svoj balík a fakturačné údaje pre Reality Monopol.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div
          className="rounded-xl border p-6"
          style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: "#F0F9FF" }}>Aktuálny program</h3>
              {!loading && (
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ background: "rgba(34,211,238,0.12)", color: "#22D3EE" }}
                >
                  {planName}
                </span>
              )}
            </div>
            {!loading && (
              <span className="text-2xl font-bold" style={{ color: "#F0F9FF" }}>
                {planPrice}<span className="text-sm font-normal" style={{ color: "#64748B" }}>/mes</span>
              </span>
            )}
          </div>
          <button
            onClick={handleStripePortal}
            disabled={portalLoading || loading}
            className="w-full rounded-md py-2 font-semibold transition"
            style={{
              background: "linear-gradient(135deg, #22D3EE, #0EA5E9)",
              color: "#050914",
              opacity: (portalLoading || loading) ? 0.6 : 1,
              cursor: (portalLoading || loading) ? 'not-allowed' : 'pointer',
            }}
          >
            {portalLoading ? 'Otvára sa…' : 'Spravovať v Stripe'}
          </button>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
        >
          <h3 className="mb-4 text-lg font-semibold" style={{ color: "#F0F9FF" }}>Využitie zdrojov</h3>
          <p className="text-sm" style={{ color: "#64748B" }}>
            Prehľad spotreby AI tokenov bude dostupný v nasledujúcej verzii.
          </p>
        </div>
      </div>
    </div>
  );
}
