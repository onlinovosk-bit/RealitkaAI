'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PushNotificationsToggle } from '@/components/settings/PushNotificationsToggle';
import { getPlanLabel } from '@/lib/plan-display';

const SUPPORT_EMAIL = 'support@revolis.ai';

export default function SettingsPage() {
  const [planKey, setPlanKey]               = useState<string | null>(null);
  const [planLabel, setPlanLabel]           = useState<string | null>(null);
  const [canManageInStripe, setCanManageInStripe] = useState(false);
  const [portalLoading, setPortalLoading]   = useState(false);
  const [portalError, setPortalError]       = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/billing/plan')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setPlanKey(d.planKey ?? 'free');
          setPlanLabel(d.planLabel ?? getPlanLabel(d.planKey, { uppercase: true }));
          setCanManageInStripe(Boolean(d.canManageInStripe));
        } else {
          setPlanKey('free');
          setPlanLabel('FREE');
        }
      })
      .catch(() => {
        setPlanKey('free');
        setPlanLabel('FREE');
      });
  }, []);

  async function handlePortal() {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res  = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.result?.url) {
        window.location.href = data.result.url;
        return;
      }
      if (data.code === 'NO_CUSTOMER') {
        setPortalError(
          `Váš program je spravovaný priamo Revolis tímom (manuálna zmluva). Pre fakturáciu alebo zmeny kontaktujte ${SUPPORT_EMAIL}.`,
        );
        return;
      }
      if (data.code === 'STRIPE_NOT_CONFIGURED') {
        setPortalError(`Platobný portál nie je dostupný. Kontaktujte ${SUPPORT_EMAIL}.`);
        return;
      }
      setPortalError(data.error ?? 'Nepodarilo sa otvoriť správu plánu.');
    } catch {
      setPortalError('Nepodarilo sa otvoriť správu plánu. Skúste znova neskôr.');
    } finally {
      setPortalLoading(false);
    }
  }

  const displayPlan = planLabel ?? (planKey ? getPlanLabel(planKey, { uppercase: true }) : '…');

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
                <p className="text-lg font-bold uppercase mt-0.5" style={{ color: "#A855F7" }}>{displayPlan}</p>
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
                {portalLoading ? 'Otvára sa…' : canManageInStripe ? 'Spravovať' : 'Kontaktovať podporu'}
              </button>
            </div>
            {portalError && (
              <p className="mt-3 text-sm leading-6" style={{ color: "#FCA5A5" }} role="alert">
                {portalError}{' '}
                {!canManageInStripe && (
                  <Link href="/billing" className="underline" style={{ color: "#93C5FD" }}>
                    Viac o fakturácii
                  </Link>
                )}
              </p>
            )}
            {!canManageInStripe && planKey && planKey !== 'free' && !portalError && (
              <p className="mt-3 text-xs leading-5" style={{ color: "#64748B" }}>
                Program je aktívny cez manuálnu zmluvu. Stripe portál nie je potrebný.
              </p>
            )}
          </div>
        </section>

        <PushNotificationsToggle />
      </div>
    </div>
  );
}
