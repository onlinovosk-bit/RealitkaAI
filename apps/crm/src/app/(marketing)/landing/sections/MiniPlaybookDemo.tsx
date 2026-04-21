'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';

const mockLeads = [
  { id: '1', name: 'Martin Kováč', score: 94, action: 'Zavolať do 30 min.' },
  { id: '2', name: 'Jana Horáková', score: 89, action: 'Poslať následnú správu s termínom obhliadky.' },
  { id: '3', name: 'Peter Sloboda', score: 83, action: 'Potvrdiť financovanie a ďalší krok.' },
  { id: '4', name: 'Eva Machová', score: 79, action: 'Reaktivovať po 5+ dňoch bez kontaktu.' },
  { id: '5', name: 'Roman Bielik', score: 75, action: 'Navrhnúť alternatívnu nehnuteľnosť.' },
];

export default function MiniPlaybookDemo() {
  const [expanded, setExpanded] = useState(false);
  const topVisible = useMemo(() => mockLeads.slice(0, 3), []);
  const lockedCount = mockLeads.length - topVisible.length;

  return (
    <section className="bg-slate-950 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-3xl border border-cyan-400/20 bg-slate-900/60 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Interaktívny mini plán úloh</p>
          <h3 className="mt-2 text-2xl font-extrabold text-slate-100" style={{ fontFamily: 'var(--font-syne)' }}>
            Klikni a pozri top 3 príležitosti na dnes
          </h3>

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="mt-5 rounded-full border border-cyan-300/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200"
          >
            {expanded ? 'Skryť ukážku plánu' : 'Otvoriť ukážku plánu úloh'}
          </button>

          {expanded && (
            <div className="mt-5 space-y-3">
              {topVisible.map((lead) => (
                <div key={lead.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-100">{lead.name}</p>
                    <span className="text-xs font-bold text-cyan-300">BRI {lead.score}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{lead.action}</p>
                </div>
              ))}

              <div className="rounded-xl border border-cyan-300/25 bg-cyan-500/[0.08] p-3">
                <p className="text-sm font-semibold text-cyan-200">+{lockedCount} ďalších príležitostí</p>
                <p className="mt-1 text-xs text-slate-300">Odomkni plný plán úloh s AI v programe Pro.</p>
                <Link href="/billing" className="mt-3 inline-flex rounded-full bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300">
                  Odomknúť Pro
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
