import { OUTCOME } from '@/lib/copy/outcome-copy';

const stats = [...OUTCOME.landingProof];

export default function ProofNumbers() {
  return (
    <section className="bg-slate-950 py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.05] p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">Čo dostanete prvý deň</p>
          <h3 className="mt-2 text-2xl font-extrabold text-slate-100" style={{ fontFamily: 'var(--font-syne)' }}>
            Istota zárobku — nie zoznam funkcií
          </h3>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4">
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="mt-1 text-3xl font-extrabold text-emerald-300">{s.value}</p>
                <p className="mt-1 text-xs text-slate-400">{s.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
