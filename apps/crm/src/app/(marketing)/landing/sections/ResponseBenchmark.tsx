'use client';
import { useMemo, useState } from 'react';

export default function ResponseBenchmark() {
  const [teamResponse, setTeamResponse] = useState(90);

  const score = useMemo(() => {
    const marketMedian = 95;
    const delta = marketMedian - teamResponse;
    if (delta >= 40) return { label: 'TOP 10%', color: 'text-emerald-300' };
    if (delta >= 15) return { label: 'Nad trhom', color: 'text-cyan-300' };
    if (delta >= -15) return { label: 'Priemer trhu', color: 'text-amber-300' };
    return { label: 'Pod trhom', color: 'text-red-300' };
  }, [teamResponse]);

  const market = 95;
  const bestInClass = 8;

  return (
    <section className="bg-slate-950 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="rounded-3xl border border-slate-700/70 bg-slate-900/50 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Porovnanie rýchlosti odpovede s trhom</p>
          <h3 className="mt-2 text-2xl font-extrabold text-slate-100" style={{ fontFamily: 'var(--font-syne)' }}>
            Tvoja realitka vs. trh (simulácia)
          </h3>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <p className="mb-2 text-xs text-slate-400">Tvoj priemerný čas do odpovede (min): {teamResponse}</p>
              <input type="range" min={2} max={240} value={teamResponse} onChange={(e) => setTeamResponse(Number(e.target.value))} className="w-full accent-cyan-400" />

              <div className="mt-5 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2">
                  <span className="text-slate-400">Best-in-class AI tímy</span>
                  <span className="font-semibold text-emerald-300">{bestInClass} min</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2">
                  <span className="text-slate-400">Trhový medián</span>
                  <span className="font-semibold text-amber-300">{market} min</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2">
                  <span className="text-slate-400">Tvoja simulácia</span>
                  <span className="font-semibold text-cyan-300">{teamResponse} min</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.06] p-4">
              <p className="text-xs text-slate-500">Výsledok oproti trhu</p>
              <p className={`mt-1 text-2xl font-bold ${score.color}`}>{score.label}</p>
              <p className="mt-2 text-xs text-slate-400">
                Každé skrátenie reakčného času o 30 minút zvyčajne zvyšuje šancu na ďalší kontakt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
