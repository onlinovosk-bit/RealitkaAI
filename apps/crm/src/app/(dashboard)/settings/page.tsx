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
    <div className="mx-auto max-w-5xl px-4 py-6 font-sans md:px-10 md:py-10">
      <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
          Revolis core
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
          Nastavenia
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Správa plánu, notifikácií a preferencií pre tím maklérov.
        </p>
      </div>

      <div className="space-y-4">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 md:p-6">
            <h3 className="text-base font-bold text-slate-950">Aktuálny plán</h3>
          </div>
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Váš program</p>
                <p className="mt-0.5 text-lg font-bold uppercase text-blue-700">{planName}</p>
              </div>
              <button
                onClick={handlePortal}
                disabled={portalLoading || !planKey}
                className="min-h-[44px] rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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
