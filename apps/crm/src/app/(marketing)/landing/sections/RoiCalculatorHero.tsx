'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';

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
    <section className="bg-slate-950 pb-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/[0.06] p-6 md:p-8">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Kalkulačka návratnosti</p>
            <h3 className="mt-2 text-2xl font-extrabold text-slate-100" style={{ fontFamily: 'var(--font-syne)' }}>
              Koľko mesačne uniká bez AI a následných kontaktov?
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Nové dopyty / mesiac: {leadsPerMonth}</span>
                <input type="range" min={20} max={300} value={leadsPerMonth} onChange={(e) => setLeadsPerMonth(Number(e.target.value))} className="w-full accent-cyan-400" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Priemerná odpoveď (min): {responseMinutes}</span>
                <input type="range" min={2} max={360} value={responseMinutes} onChange={(e) => setResponseMinutes(Number(e.target.value))} className="w-full accent-cyan-400" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-400">Konverzia leadov na obchod (%): {dealRate}</span>
                <input type="range" min={2} max={20} value={dealRate} onChange={(e) => setDealRate(Number(e.target.value))} className="w-full accent-cyan-400" />
              </label>
            </div>

            <div className="rounded-2xl border border-cyan-300/25 bg-slate-950/70 p-4">
              <p className="text-xs text-slate-500">Odhad úniku mesačne</p>
              <p className="mt-1 text-3xl font-extrabold text-red-300">€{model.monthlyLeakEur.toLocaleString('sk-SK')}</p>
              <p className="mt-3 text-xs text-slate-500">Potenciálny zisk s Pro</p>
              <p className="mt-1 text-2xl font-bold text-cyan-300">+€{model.recoveredEur.toLocaleString('sk-SK')}</p>
              <p className="mt-3 text-xs text-slate-400">Projekcia uzavretých obchodov: {model.projectedDeals} / mes.</p>
              <Link href="/register" className="mt-4 inline-flex rounded-full bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300">
                Spustiť úvodné nastavenie Pro
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
