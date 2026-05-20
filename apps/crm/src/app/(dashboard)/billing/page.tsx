'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CreditCard, FileText, ShieldCheck, TrendingUp } from 'lucide-react';
import { getPlanLabel, type DisplayPlanKey } from '@/lib/plan-display';

const PLAN_PRICES: Record<DisplayPlanKey, string> = {
  free:               '0 €',
  starter:            '49 €',
  active_force:       '99 €',
  market_vision:      '199 €',
  protocol_authority: '449 €',
};

const SUPPORT_EMAIL = 'support@revolis.ai';

export default function BillingPage() {
  const [planKey, setPlanKey]               = useState<DisplayPlanKey | null>(null);
  const [planLabel, setPlanLabel]           = useState<string | null>(null);
  const [canManageInStripe, setCanManageInStripe] = useState(false);
  const [loading, setLoading]               = useState(true);
  const [portalLoading, setPortalLoading]   = useState(false);
  const [portalError, setPortalError]       = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/billing/plan')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const key = (d.planKey ?? 'free') as DisplayPlanKey;
          setPlanKey(key);
          setPlanLabel(d.planLabel ?? getPlanLabel(key, { uppercase: true }));
          setCanManageInStripe(Boolean(d.canManageInStripe));
        } else {
          setPlanKey('free');
          setPlanLabel('FREE');
        }
      })
      .catch(() => {
        setPlanKey('free');
        setPlanLabel('FREE');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleStripePortal() {
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
          `Váš program je spravovaný priamo Revolis tímom. Pre fakturáciu kontaktujte ${SUPPORT_EMAIL}.`,
        );
        return;
      }
      setPortalError(data.error ?? 'Nepodarilo sa otvoriť Stripe portál.');
    } catch {
      setPortalError('Nepodarilo sa otvoriť Stripe portál. Skúste znova neskôr.');
    } finally {
      setPortalLoading(false);
    }
  }

  const planName  = loading ? '…' : (planLabel ?? getPlanLabel(planKey, { uppercase: true }));
  const planPrice = loading ? '…' : (planKey ? PLAN_PRICES[planKey] ?? '—' : '—');

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-orange-50 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Billing Core
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                  Predplatné a licencie
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Spravujte svoj balík, fakturačné údaje a Stripe portál.
                </p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Aktuálna mesačná cena
                </p>
                <p className="mt-1 text-2xl font-black text-blue-700">
                  {planPrice}
                  <span className="text-sm font-semibold text-slate-500">/mes</span>
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <CreditCard className="h-5 w-5" aria-hidden />
                </div>
                <h2 className="text-lg font-semibold text-slate-950">Aktuálny program</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Kde mám peniaze dnes? Tu vidíte aktívny balík a vstup do fakturácie.
                </p>
                {!loading && (
                  <span className="mt-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
                    {planName}
                  </span>
                )}
              </div>
              {!loading && (
                <span className="text-right text-2xl font-black text-slate-950">
                  {planPrice}
                  <span className="text-sm font-semibold text-slate-500">/mes</span>
                </span>
              )}
            </div>
            <button
              onClick={handleStripePortal}
              disabled={portalLoading || loading}
              className="min-h-11 w-full rounded-full bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {portalLoading
                ? 'Otvára sa…'
                : canManageInStripe
                  ? 'Spravovať v Stripe'
                  : 'Kontaktovať podporu'}
            </button>
            {portalError && (
              <p className="mt-3 text-sm leading-6 text-red-600" role="alert">
                {portalError}{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold underline">
                  {SUPPORT_EMAIL}
                </a>
              </p>
            )}
            {!canManageInStripe && planKey && planKey !== 'free' && !portalError && (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Program je aktívny cez manuálnu zmluvu Revolis. Stripe portál nie je potrebný.
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <TrendingUp className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="text-lg font-semibold text-slate-950">Využitie zdrojov</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Prehľad spotreby AI tokenov bude dostupný v nasledujúcej verzii.
            </p>
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span className="font-semibold">Pripravované:</span> kontrola čerpania a upozornenia pred prekročením limitu.
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <FileText className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Fakturácia bez zásahu do práce makléra</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Stripe zostáva zdrojom pravdy pre platby a faktúry. Manuálne zmluvy (Protocol Authority) rieši Revolis tím.
                </p>
              </div>
            </div>
            <Link
              href="/settings"
              className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700"
            >
              Nastavenia plánu
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
