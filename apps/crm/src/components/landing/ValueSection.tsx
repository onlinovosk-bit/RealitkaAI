const items = [
  {
    tag: "Eliminácia mŕtveho kapitálu",
    title: "Vracíme vám ROI z marketingu, ktorý ste už raz zaplatili.",
    body: "AI autonómne ohreje vašu databázu. Sleduje, kedy sa starý kontakt vráti na web, kedy si pozerá hypotéky alebo odhad ceny — a upozorní vás skôr, než zdvihne telefón konkurencii.",
    isEnterprise: true,
  },
  {
    tag: "AI Audit výkonnosti tímu",
    title: "High-Value List o 08:00 — 5 kontaktov s 85 %+ pravdepodobnosťou konverzie.",
    body: "AI nezabudne na top klienta namiesto makléra. Každé ráno dostanete objektívny prehľad priority bez emócií. Dohľad nad kvalitou práce tímu bez mikromanagementu.",
    isEnterprise: true,
  },
  {
    tag: "Mandate Hunter",
    title: "Exkluzívne mandáty v obývačke klienta — nie v aukcii na portáli.",
    body: "Revolis identifikuje signály predajného zámeru (latentný intent) týždne pred zverejnením inzerátu. Získajte mandát v čase, keď ešte neexistuje konkurencia.",
    isEnterprise: false,
  },
];

export function ValueSection() {
  return (
    <section className="relative py-12">
      {/* Radiant glow na pozadí */}
      <div
        className="pointer-events-none absolute inset-0 opacity-5"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(99,102,241,0.6), transparent)",
          filter: "blur(100px)",
        }}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className={`group relative overflow-hidden rounded-3xl border p-8 backdrop-blur-md transition-all duration-500 ${
              item.isEnterprise
                ? "border-indigo-500/30 bg-slate-900/80 hover:border-indigo-400/60 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                : "border-white/10 bg-slate-900/40 hover:border-cyan-500/30"
            }`}
          >
            {/* Enterprise tag */}
            {item.isEnterprise && (
              <div className="absolute right-5 top-4">
                <span className="text-gold-gradient text-[10px] font-black uppercase tracking-tight">
                  L99 Enterprise
                </span>
              </div>
            )}

            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/70">
              {item.tag}
            </p>
            <h3
              className="mb-3 text-base font-bold leading-snug"
              style={{ color: item.isEnterprise ? "#F0F9FF" : "#CBD5E1" }}
            >
              {item.title}
            </h3>

            <p className="text-sm leading-relaxed text-slate-400 transition-colors group-hover:text-slate-300">
              {item.body}
            </p>

            {/* Radiant linka na spodku pre Enterprise karty */}
            {item.isEnterprise && (
              <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-indigo-500 via-cyan-400 to-transparent transition-all duration-700 group-hover:w-full" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
