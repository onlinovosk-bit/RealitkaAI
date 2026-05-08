'use client';
import React, { useState, useEffect } from 'react';
import { PushNotificationsToggle } from '@/components/settings/PushNotificationsToggle';

const PLAN_NAMES: Record<string, string> = {
  free:               'FREE',
  starter:            'SMART START',
  active_force:       'ACTIVE FORCE',
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
    <div className="mx-auto max-w-5xl p-4 md:p-10 font-sans" style={{ background: "#050914", minHeight: "100vh" }}>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: "#F0F9FF" }}>
          Nastavenia
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#64748B" }}>
          Správa plánu, notifikácií a preferencií.
        </p>
      </div>

      <div className="space-y-4">
        <section
          className="overflow-hidden rounded-2xl border"
          style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
        >
          <div className="border-b p-4 md:p-6" style={{ borderColor: "#0F1F3D" }}>
            <h3 className="text-base font-bold" style={{ color: "#F0F9FF" }}>Aktuálny plán</h3>
          </div>
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs" style={{ color: "#64748B" }}>Váš program</p>
                <p className="text-lg font-bold uppercase mt-0.5" style={{ color: "#A855F7" }}>{planName}</p>
              </div>
              <button
                onClick={handlePortal}
                disabled={portalLoading || !planKey}
                className="rounded-xl px-4 py-2.5 text-sm font-bold min-h-[44px]"
                style={{
                  background: "rgba(168,85,247,0.12)",
                  border: "1px solid rgba(168,85,247,0.3)",
                  color: "#A855F7",
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
