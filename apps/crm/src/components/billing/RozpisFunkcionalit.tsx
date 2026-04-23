"use client";

import { useState } from "react";
import { X } from "lucide-react";

// ─── Typy ─────────────────────────────────────────────────────────────────

type CellValue = boolean | string;

type Row = {
  label: string;
  desc:  string;
  cells: [CellValue, CellValue, CellValue, CellValue];
};

type Section = { title: string; rows: Row[] };

const Y = true;
const N = false;

// ─── Dáta ─────────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    title: "Licencie a prístup",
    rows: [
      {
        label: "Počet maklérov",
        desc:  "Určuje koľko maklérov môže aktívne používať systém pod jednou licenciou. Smart Start zvládne jedného makléra, Protocol Authority celý tím až 5 ľudí.",
        cells: ["1 maklér", "1 maklér", "1 owner + 1", "1 owner + 4"],
      },
      {
        label: "Owner dashboard",
        desc:  "Špeciálne rozhranie pre majiteľa kancelárie. Vidíš výkonnosť celého tímu, otvorené obchody, revenue a aktivitu každého makléra — na jednej obrazovke.",
        cells: [N, N, Y, Y],
      },
      {
        label: "Správa tímu",
        desc:  "Pridávanie a odoberanie maklérov, prideľovanie leadov, nastavenie prístupových práv. Všetko spravuješ bez IT oddelenia priamo v dashboarde.",
        cells: [N, N, Y, Y],
      },
    ],
  },
  {
    title: "AI Asistent",
    rows: [
      {
        label: "Ranný AI briefing (8:00)",
        desc:  "Každé ráno o 8:00 dostaneš 5 najdôležitejších akcií na dnes — zoradených podľa priority a obchodného dopadu. Žiadne prehliadanie, žiadne rozhodovanie čo robiť ako prvé.",
        cells: [Y, Y, Y, Y],
      },
      {
        label: "AI odpovede 24/7",
        desc:  "AI odpovedá na správy klientov kedykoľvek — aj o polnoci, cez víkend, počas dovolenky. Smart Start pokrýva pracovné hodiny, vyššie plány fungujú nepretržite.",
        cells: ["Prac. hodiny", Y, Y, Y],
      },
      {
        label: "Buyer Readiness Index",
        desc:  "AI skóre 0–100 pre každého klienta. Analyzuje správanie, reakcie a históriu komunikácie. Ukazuje kto je pripravený kúpiť teraz a na koho ešte počkať.",
        cells: [Y, Y, Y, Y],
      },
      {
        label: "Prediktívny deal scoring",
        desc:  "AI predpovedá pravdepodobnosť uzavretia každého obchodu. Zohľadňuje stovky signálov — čas odpovede, typ otázok, počet obhliadok. Vieš kde sústrediť energiu.",
        cells: [N, Y, Y, Y],
      },
      {
        label: "AI Ghostwriter (správy)",
        desc:  "AI navrhne celú správu pre klienta na základe kontextu rozhovoru. Ty ju jedným kliknutím schváliš alebo upravíš. Šetríš 30–60 minút denne na písaní.",
        cells: [N, Y, Y, Y],
      },
      {
        label: "Automatické follow-upy",
        desc:  "7-dňové sekvencie správ, ktoré AI posiela automaticky po každom kontakte. Nikdy nezabudneš na follow-up — systém to robí za teba aj keď spíš.",
        cells: [N, Y, Y, Y],
      },
      {
        label: "Analýza hovorov",
        desc:  "AI prepíše a analyzuje každý telefonický hovor. Odhalí námietky, mieru záujmu a navrhne konkrétny ďalší krok. Stačí nahrať hovor alebo zavolať cez appku.",
        cells: [N, Y, Y, Y],
      },
    ],
  },
  {
    title: "L99 Intelligence",
    rows: [
      {
        label: "Kataster radar",
        desc:  "Sleduje zmeny na listoch vlastníctva v tvojej oblasti v reálnom čase. Vieš o každom predaji, prevode alebo záložnom práve skôr ako to uvidíš na portáli.",
        cells: [N, Y, Y, Y],
      },
      {
        label: "Register úpadcov",
        desc:  "AI monitoruje exekúcie, konkurzy a dlhy. Automaticky identifikuje majiteľov nehnuteľností, ktorí potrebujú rýchly predaj — skôr ako to začnú inzerovať.",
        cells: [N, Y, Y, Y],
      },
      {
        label: "Stavebné povolenia",
        desc:  "Sleduje vydané stavebné povolenia v celom okrese. Kto stavia rodinný dom, čoskoro predá byt. Dostaneš kontakt skôr ako má vôbec čas hľadať makléra.",
        cells: [N, Y, Y, Y],
      },
      {
        label: "Ghost Resurrection",
        desc:  "Prebúdza klientov, ktorí ťa kontaktovali pred mesiacmi ale nekúpili ani nepredali. AI ich osloví znova v správny moment s personalizovanou správou.",
        cells: [N, N, Y, Y],
      },
      {
        label: "Register závierok (B2B)",
        desc:  "Prístup k účtovným závierkam firiem a živnostníkov. Identifikuje podnikateľov s dostatočnou likviditou na investičný alebo prémiový nákup nehnuteľnosti.",
        cells: [N, N, Y, Y],
      },
      {
        label: "Bio-Social demografika",
        desc:  "Analýza verejných profilov na sociálnych sieťach kombinovaná s demografickými dátami. Presne vieš kto býva v danej lokalite, čo hľadá a kedy plánuje zmenu.",
        cells: [N, N, N, Y],
      },
      {
        label: "Competition Heatmap",
        desc:  "Živá tepelná mapa aktivity konkurenčných maklérov. Vidíš kde majú najviac ponúk, kde sú slabí a kde je pre teba priestor vstúpiť s lepšou ponukou.",
        cells: [N, N, N, Y],
      },
      {
        label: "Ghost Mode Shield",
        desc:  "Anonymný režim pre citlivé transakcie a prieskum trhu. Konkurencia nevidí tvoju aktivitu na portáloch ani v katastri. Ideálne pre diskrétne akvizície.",
        cells: [N, N, N, Y],
      },
    ],
  },
  {
    title: "Podpora a SLA",
    rows: [
      {
        label: "Email podpora",
        desc:  "Technická podpora cez email dostupná pre všetky plány. Odpoveď do 48 hodín v pracovné dni. Pre bežné otázky a nastavenia systému.",
        cells: [Y, Y, Y, Y],
      },
      {
        label: "Prioritná podpora",
        desc:  "Prednostné vybavenie všetkých požiadaviek. Odpoveď do 4 hodín v pracovné dni. Tvoje tickety idú vždy na začiatok fronty.",
        cells: [N, N, Y, Y],
      },
      {
        label: "Dedikovaný Protocol Manager",
        desc:  "Osobný account manažér dostupný telefonicky aj online. Pomáha s onboardingom, optimalizáciou procesov a strategickým nastavením systému pre tvoju kanceláriu.",
        cells: [N, N, N, Y],
      },
      {
        label: "SLA uptime garancia",
        desc:  "Garantovaná dostupnosť systému zmluvne zakotvená. Smart Start a Active Force: 99.5%, Market Vision: 99.9%, Protocol Authority: 99.99% — to je výpadok max. 52 minút ročne.",
        cells: ["99.5%", "99.5%", "99.9%", "99.99%"],
      },
      {
        label: "30-dňová garancia vrátenia",
        desc:  "Ak nie si spokojný z akéhokoľvek dôvodu, vrátime ti celú sumu bez otázok do 30 dní od aktivácie. Žiadne podmienky, žiadna byrokracia.",
        cells: [Y, Y, Y, Y],
      },
    ],
  },
];

const PLANS = [
  { key: "starter",  name: "Smart Start",       price: "49 €",  featured: false, color: "#64748B" },
  { key: "pro",      name: "Active Force",       price: "99 €",  featured: false, color: "#60A5FA" },
  { key: "market",   name: "Market Vision",      price: "199 €", featured: false, color: "#CBD5E1" },
  { key: "protocol", name: "Protocol Authority", price: "449 €", featured: true,  color: "#EAB308" },
];

// ─── Modal ────────────────────────────────────────────────────────────────

function FeatureModal({ row, onClose }: { row: Row; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full rounded-3xl p-8"
        style={{ background: "#0A0A18", border: "1px solid rgba(255,255,255,0.10)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ color: "#475569" }}
        >
          <X size={16} />
        </button>

        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3">
          Detaily funkcie
        </p>
        <h3 className="text-xl font-black text-white uppercase italic mb-4">
          {row.label}
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          {row.desc}
        </p>

        {/* Dostupnosť */}
        <div className="flex flex-wrap gap-2">
          {PLANS.map((plan, i) => {
            const val = row.cells[i as 0 | 1 | 2 | 3];
            const active = val !== false;
            return (
              <span
                key={plan.key}
                className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider"
                style={
                  active
                    ? { background: `${plan.color}20`, color: plan.color, border: `1px solid ${plan.color}40` }
                    : { background: "rgba(255,255,255,0.04)", color: "#334155", border: "1px solid rgba(255,255,255,0.06)" }
                }
              >
                {active ? "✓ " : "✗ "}{plan.name}
              </span>
            );
          })}
        </div>

        <a
          href="/billing"
          className="mt-6 block w-full text-center py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all hover:opacity-80"
          style={{ background: "#2563EB", color: "#fff" }}
        >
          Aktivovať program →
        </a>
      </div>
    </div>
  );
}

// ─── Cell ─────────────────────────────────────────────────────────────────

function Cell({ value, featured }: { value: CellValue; featured: boolean }) {
  const fl = featured ? "0.5px solid rgba(234,179,8,0.18)" : undefined;
  const bg = featured ? "rgba(234,179,8,0.06)" : "transparent";

  if (value === true) {
    return (
      <td className="py-2.5 px-3 text-center" style={{ background: bg, borderLeft: fl, borderRight: fl }}>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ background: "rgba(234,179,8,0.15)" }}>
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#EAB308" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </span>
      </td>
    );
  }
  if (value === false) {
    return (
      <td className="py-2.5 px-3 text-center" style={{ background: bg, borderLeft: fl, borderRight: fl }}>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="#334155" strokeWidth="1.2" strokeLinecap="round"/></svg>
        </span>
      </td>
    );
  }
  return (
    <td className="py-2.5 px-3 text-center" style={{ background: bg, borderLeft: fl, borderRight: fl }}>
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
        style={{ background: featured ? "rgba(234,179,8,0.15)" : "rgba(255,255,255,0.06)", color: featured ? "#5AAF3C" : "#64748B" }}>
        {value}
      </span>
    </td>
  );
}

// ─── Component ────────────────────────────────────────────────────────────

export default function RozpisFunkcionalit() {
  const [selected, setSelected] = useState<Row | null>(null);

  return (
    <div className="min-h-screen bg-[#010103] text-slate-200 pb-20">
      {selected && <FeatureModal row={selected} onClose={() => setSelected(null)} />}

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tight text-white mb-3">
            ROZPIS <span className="text-blue-500">FUNKCIONALÍT</span>
          </h1>
          <p className="text-slate-500 text-sm uppercase tracking-wider">
            Klikni na ľubovoľnú funkcionalitu pre detailný popis
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <table className="w-full border-collapse" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th className="w-[200px] p-0" />
                {PLANS.map((plan) => (
                  <th key={plan.key} className="p-0 text-center" style={{ minWidth: 130 }}>
                    <div
                      className="px-3 py-5 relative"
                      style={{
                        background:   plan.featured ? "rgba(234,179,8,0.08)" : "rgba(255,255,255,0.02)",
                        borderLeft:   plan.featured ? "0.5px solid rgba(234,179,8,0.30)" : undefined,
                        borderRight:  plan.featured ? "0.5px solid rgba(234,179,8,0.30)" : undefined,
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {plan.featured && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap"
                          style={{ background: "linear-gradient(135deg,#EAB308,#CA8A04)", color: "#010103" }}>
                          Odporúčané
                        </div>
                      )}
                      <div className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: plan.color }}>{plan.name}</div>
                      <div className="text-xl font-black text-white">{plan.price}<span className="text-[10px] text-slate-500 font-normal"> / mes</span></div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {SECTIONS.map((section) => (
                <>
                  <tr key={`s-${section.title}`} style={{ background: "rgba(234,179,8,0.06)" }}>
                    <td colSpan={5} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest"
                      style={{ color: "#92400E", borderBottom: "0.5px solid rgba(234,179,8,0.15)" }}>
                      {section.title}
                    </td>
                  </tr>

                  {section.rows.map((row) => (
                    <tr key={row.label} className="transition-colors hover:bg-white/[0.02]"
                      style={{ borderBottom: "0.5px solid rgba(255,255,255,0.04)" }}>
                      <td className="py-2.5 px-4">
                        <button
                          onClick={() => setSelected(row)}
                          className="text-xs text-left transition-colors hover:text-blue-400 underline underline-offset-2 decoration-dotted"
                          style={{ color: "#94A3B8", cursor: "pointer" }}
                        >
                          {row.label}
                        </button>
                      </td>
                      {row.cells.map((cell, ci) => (
                        <Cell key={ci} value={cell} featured={PLANS[ci].featured} />
                      ))}
                    </tr>
                  ))}
                </>
              ))}

              <tr>
                <td />
                {PLANS.map((plan) => (
                  <td key={plan.key} className="px-3 py-4 text-center"
                    style={{
                      background:  plan.featured ? "rgba(234,179,8,0.08)" : undefined,
                      borderLeft:  plan.featured ? "0.5px solid rgba(234,179,8,0.30)" : undefined,
                      borderRight: plan.featured ? "0.5px solid rgba(234,179,8,0.30)" : undefined,
                      borderTop:   "1px solid rgba(255,255,255,0.06)",
                    }}>
                    <a href="/billing"
                      className="block w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:opacity-80"
                      style={plan.featured
                        ? { background: "linear-gradient(135deg,#EAB308,#CA8A04)", color: "#010103" }
                        : { border: "0.5px solid rgba(255,255,255,0.12)", color: "#64748B" }}>
                      Začať ↗
                    </a>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
