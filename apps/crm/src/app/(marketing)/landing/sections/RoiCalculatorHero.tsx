'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { SLATE_HORIZON, WORKDESK_CARD } from '@/lib/slate-horizon-theme';

export default function RoiCalculatorHero() {
  const [leadsPerMonth, setLeadsPerMonth] = useState(80);
  const [responseMinutes, setResponseMinutes] = useState(120);
  const [dealRate, setDealRate] = useState(8);

  const model = useMemo(() => {
    const avgRevenuePerDeal = 2400;
    const responsePenalty = Math.min(responseMinutes / 240, 1);
    const lostShare = 0.25 + responsePenalty * 0.35;
    const currentDeals = (leadsPerMonth * dealRate) / 100;
    const monthlyLeakEur = currentDeals * avgRevenuePerDeal * lostShare;

    const proLiftShare = 0.22;
    const recoveredEur = monthlyLeakEur * proLiftShare;
    const projectedDeals = currentDeals + recoveredEur / avgRevenuePerDeal;
    return {
      monthlyLeakEur: Math.round(monthlyLeakEur),
      recoveredEur: Math.round(recoveredEur),
      projectedDeals: Math.round(projectedDeals * 10) / 10,
    };
  }, [dealRate, leadsPerMonth, responseMinutes]);

  return (
    <section className="pb-10 pt-4" style={{ background: SLATE_HORIZON.bg }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div
          className="rounded-3xl border p-6 md:p-8"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: SLATE_HORIZON.softBorder,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.25em]" style={{ color: SLATE_HORIZON.brandDeep }}>
              Kalkulačka návratnosti
            </p>
            <h3 className="mt-2 text-2xl font-extrabold" style={{ color: SLATE_HORIZON.ink }}>
              Koľko mesačne uniká bez AI a následných kontaktov?
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <label className="block">
                <span className="mb-1 block text-xs" style={{ color: SLATE_HORIZON.muted }}>
                  Nové dopyty / mesiac: {leadsPerMonth}
                </span>
                <input
                  type="range"
                  min={20}
                  max={300}
                  value={leadsPerMonth}
                  onChange={(e) => setLeadsPerMonth(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs" style={{ color: SLATE_HORIZON.muted }}>
                  Priemerná odpoveď (min): {responseMinutes}
                </span>
                <input
                  type="range"
                  min={2}
                  max={360}
                  value={responseMinutes}
                  onChange={(e) => setResponseMinutes(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs" style={{ color: SLATE_HORIZON.muted }}>
                  Konverzia dopytov na obchod (%): {dealRate}
                </span>
                <input
                  type="range"
                  min={2}
                  max={20}
                  value={dealRate}
                  onChange={(e) => setDealRate(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </label>
            </div>

            <div
              className="overflow-hidden rounded-2xl border p-4"
              style={{ background: SLATE_HORIZON.bg, borderColor: SLATE_HORIZON.line }}
            >
              <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
                Odhad úniku mesačne
              </p>
              <p className="mt-1 text-2xl font-extrabold sm:text-3xl" style={{ color: SLATE_HORIZON.danger }}>
                €{model.monthlyLeakEur.toLocaleString('sk-SK')}
              </p>
              <p className="mt-3 text-xs" style={{ color: SLATE_HORIZON.muted }}>
                Potenciálny zisk s Pro
              </p>
              <p className="mt-1 text-xl font-bold sm:text-2xl" style={{ color: SLATE_HORIZON.brandDeep }}>
                +€{model.recoveredEur.toLocaleString('sk-SK')}
              </p>
              <p className="mt-3 text-xs" style={{ color: SLATE_HORIZON.deep }}>
                Projekcia uzavretých obchodov: {model.projectedDeals} / mes.
              </p>
              <Link
                href="/register"
                className={`mt-4 inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 py-2 text-xs font-bold text-white transition-opacity duration-200 hover:opacity-90 ${SLATE_HORIZON.focusRing}`}
                style={{ background: SLATE_HORIZON.ctaGradient }}
              >
                Spustiť úvodné nastavenie Pro
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
