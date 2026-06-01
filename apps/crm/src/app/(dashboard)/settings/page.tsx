'use client';
import React, { useState, useEffect } from 'react';
import { PushNotificationsToggle } from '@/components/settings/PushNotificationsToggle';
import { SLATE_HORIZON, WORKDESK_CARD } from '@/lib/slate-horizon-theme';

const PLAN_NAMES: Record<string, string> = {
  free:               'FREE',
  starter:            'SMART START',
  active_force:       'ACTIVE FORCE',
  enterprise:         'MARKET VISION',
  market_vision:      'MARKET VISION',
  protocol_authority: 'PROTOCOL AUTHORITY',
};

export default function SettingsPage() {
  const [planKey, setPlanKey]             = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch('/api/billing/plan')
      .then(r => r.json())
      .then(d => setPlanKey(d.planKey ?? 'free'))
      .catch(() => setPlanKey('free'));
  }, []);

  async function handlePortal() {
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

  const planName = planKey ? (PLAN_NAMES[planKey] ?? planKey.toUpperCase()) : '…';

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-10 font-sans" style={{ background: SLATE_HORIZON.bg, minHeight: "100vh" }}>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: SLATE_HORIZON.ink }}>
          Nastavenia
        </h1>
        <p className="mt-2 text-sm" style={{ color: SLATE_HORIZON.muted }}>
          Správa plánu, notifikácií a preferencií.
        </p>
      </div>

      <div className="space-y-4">
        <section
          className="overflow-hidden rounded-2xl border"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          <div className="border-b p-4 md:p-6" style={{ borderColor: WORKDESK_CARD.borderColor }}>
            <h3 className="text-base font-bold" style={{ color: SLATE_HORIZON.ink }}>Aktuálny plán</h3>
          </div>
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>Váš program</p>
                <p className="text-lg font-bold uppercase mt-0.5" style={{ color: SLATE_HORIZON.brandDeep }}>{planName}</p>
              </div>
              <button
                onClick={handlePortal}
                disabled={portalLoading || !planKey}
                className="rounded-xl px-4 py-2.5 text-sm font-bold min-h-[44px]"
                style={{
                  background: SLATE_HORIZON.soft,
                  border: `1px solid ${SLATE_HORIZON.softBorder}`,
                  color: SLATE_HORIZON.brandDeep,
                  opacity: (portalLoading || !planKey) ? 0.6 : 1,
                  cursor: (portalLoading || !planKey) ? 'not-allowed' : 'pointer',
                }}
              >
                {portalLoading ? 'Otvára sa…' : 'Spravovať'}
              </button>
            </div>
          </div>
        </section>

        <PushNotificationsToggle />
      </div>
    </div>
  );
}
