import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

const items = [
  {
    tag: "Eliminácia mŕtveho kapitálu",
    title: "Vraciame Vám ROI z marketingu, ktorý ste už raz zaplatili.",
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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="group relative overflow-hidden rounded-3xl border p-8 transition-all duration-200 hover:shadow-lg"
            style={{
              background: WORKDESK_CARD.background,
              borderColor: item.isEnterprise ? SLATE_HORIZON.softBorder : SLATE_HORIZON.line,
              boxShadow: WORKDESK_CARD.boxShadow,
            }}
          >
            {item.isEnterprise && (
              <div className="absolute right-5 top-4">
                <span className="text-[10px] font-black uppercase tracking-tight" style={{ color: SLATE_HORIZON.brandDeep }}>
                  AI Asistent
                </span>
              </div>
            )}

            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: SLATE_HORIZON.brand }}>
              {item.tag}
            </p>
            <h3 className="mb-3 text-base font-bold leading-snug" style={{ color: SLATE_HORIZON.ink }}>
              {item.title}
            </h3>

            <p className="text-sm leading-relaxed" style={{ color: SLATE_HORIZON.deep }}>
              {item.body}
            </p>

            {item.isEnterprise && (
              <div
                className="absolute bottom-0 left-0 h-[2px] w-0 transition-all duration-300 group-hover:w-full"
                style={{ background: `linear-gradient(90deg, ${SLATE_HORIZON.brand}, transparent)` }}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
