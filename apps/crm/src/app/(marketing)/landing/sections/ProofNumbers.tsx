const stats = [
  { label: 'Odozva (95. percentil)', value: '< 2 min', note: 'AI prvá odpoveď na nový dopyt' },
  { label: 'Pokrytie následných kontaktov', value: '92%', note: 'Záujemcovia s aktívnym ďalším kontaktom' },
  { label: 'Nárast úspešnosti obchodov', value: '+34%', note: 'Pri kanceláriách s dokončeným úvodným nastavením' },
];

export default function ProofNumbers() {
  return (
    <section className="bg-slate-950 py-14">
      <div className="mx-auto max-w-6xl px-6">
        <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.05] p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">Dôkazové čísla</p>
          <h3 className="mt-2 text-2xl font-extrabold text-slate-100" style={{ fontFamily: 'var(--font-syne)' }}>
            Čísla, ktoré rozhodujú o nákupe
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
