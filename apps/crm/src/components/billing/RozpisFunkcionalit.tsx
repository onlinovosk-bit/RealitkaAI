"use client";

import { useState, Fragment } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

type CellValue = boolean | string;

type Row = {
  label: string;
  desc: string;
  cells: [CellValue, CellValue, CellValue, CellValue];
};

type Section = { title: string; rows: Row[] };

const Y = true;
const N = false;

const SECTIONS: Section[] = [
  {
    title: "Licencie a prístup",
    rows: [
      {
        label: "Počet maklérov",
        desc: "Určuje koľko maklérov môže aktívne používať systém pod jednou licenciou. Smart Start zvládne jedného makléra, Protocol Authority celý tím až 5 ľudí.",
        cells: ["1 maklér", "1 maklér", "1 owner + 1", "1 owner + 4"],
      },
      {
        label: "Owner dashboard",
        desc: "Špeciálne rozhranie pre majiteľa kancelárie. Vidíš výkonnosť celého tímu, otvorené obchody, revenue a aktivitu každého makléra — na jednej obrazovke.",
        cells: [N, N, Y, Y],
      },
      {
        label: "Správa tímu",
        desc: "Pridávanie a odoberanie maklérov, prideľovanie leadov, nastavenie prístupových práv. Všetko spravuješ bez IT oddelenia priamo v dashboarde.",
        cells: [N, N, Y, Y],
      },
    ],
  },
  {
    title: "AI Asistent",
    rows: [
      {
        label: "Ranný AI briefing (8:00)",
        desc: "Každé ráno o 8:00 dostaneš 5 najdôležitejších akcií na dnes — zoradených podľa priority a obchodného dopadu.",
        cells: [Y, Y, Y, Y],
      },
      {
        label: "AI odpovede 24/7",
        desc: "AI odpovedá na správy klientov kedykoľvek — aj o polnoci, cez víkend, počas dovolenky.",
        cells: ["Prac. hodiny", Y, Y, Y],
      },
      {
        label: "Buyer Readiness Index",
        desc: "AI skóre 0–100 pre každého klienta. Ukazuje kto je pripravený kúpiť teraz a na koho ešte počkať.",
        cells: [Y, Y, Y, Y],
      },
      {
        label: "Prediktívny deal scoring",
        desc: "AI predpovedá pravdepodobnosť uzavretia každého obchodu na základe stoviek signálov.",
        cells: [N, Y, Y, Y],
      },
      {
        label: "AI Ghostwriter (správy)",
        desc: "AI navrhne celú správu pre klienta na základe kontextu rozhovoru. Ty ju jedným kliknutím schváliš alebo upravíš.",
        cells: [N, Y, Y, Y],
      },
      {
        label: "Automatické follow-upy",
        desc: "7-dňové sekvencie správ, ktoré AI posiela automaticky po každom kontakte.",
        cells: [N, Y, Y, Y],
      },
      {
        label: "Analýza hovorov",
        desc: "AI prepíše a analyzuje každý telefonický hovor. Odhalí námietky, mieru záujmu a navrhne ďalší krok.",
        cells: [N, Y, Y, Y],
      },
    ],
  },
  {
    title: "L99 Radar príležitostí",
    rows: [
      { label: "Kataster radar", desc: "Sleduje zmeny na listoch vlastníctva v tvojej oblasti v reálnom čase.", cells: [N, Y, Y, Y] },
      { label: "Register úpadcov", desc: "AI monitoruje exekúcie, konkurzy a dlhy.", cells: [N, Y, Y, Y] },
      { label: "Stavebné povolenia", desc: "Sleduje vydané stavebné povolenia v celom okrese.", cells: [N, Y, Y, Y] },
      { label: "Ghost Resurrection", desc: "Prebúdza klientov, ktorí ťa kontaktovali pred mesiacmi.", cells: [N, N, Y, Y] },
      { label: "Register závierok (B2B)", desc: "Prístup k účtovným závierkam firiem a živnostníkov.", cells: [N, N, Y, Y] },
      { label: "Bio-Social demografika", desc: "Analýza verejných profilov kombinovaná s demografickými dátami.", cells: [N, N, N, Y] },
      { label: "Competition Heatmap", desc: "Živá tepelná mapa aktivity konkurenčných maklérov.", cells: [N, N, N, Y] },
      { label: "Ghost Mode Shield", desc: "Anonymný režim pre citlivé transakcie a prieskum trhu.", cells: [N, N, N, Y] },
    ],
  },
  {
    title: "Podpora a SLA",
    rows: [
      { label: "Email podpora", desc: "Technická podpora cez email dostupná pre všetky plány.", cells: [Y, Y, Y, Y] },
      { label: "Prioritná podpora", desc: "Prednostné vybavenie všetkých požiadaviek do 4 hodín.", cells: [N, N, Y, Y] },
      { label: "Dedikovaný Protocol Manager", desc: "Osobný account manažér dostupný telefonicky aj online.", cells: [N, N, N, Y] },
      { label: "SLA uptime garancia", desc: "Garantovaná dostupnosť systému zmluvne zakotvená.", cells: ["99.5%", "99.5%", "99.9%", "99.99%"] },
      { label: "30-dňová garancia vrátenia", desc: "Ak nie si spokojný, vrátime celú sumu do 30 dní.", cells: [Y, Y, Y, Y] },
    ],
  },
];

const PLANS = [
  {
    key: "starter",
    name: "Smart Start",
    price: "49 €",
    featured: false,
    accentColor: SLATE_HORIZON.muted,
    cardBg: "#FFFFFF",
    cardBorder: SLATE_HORIZON.line,
  },
  {
    key: "pro",
    name: "Active Force",
    price: "99 €",
    featured: false,
    accentColor: SLATE_HORIZON.brandDeep,
    cardBg: "#FFFFFF",
    cardBorder: "#BFDBFE",
  },
  {
    key: "market",
    name: "Market Vision",
    price: "199 €",
    featured: false,
    accentColor: "#4338CA",
    cardBg: "#FFFFFF",
    cardBorder: "#C7D2FE",
  },
  {
    key: "protocol",
    name: "Protocol Authority",
    price: "449 €",
    featured: true,
    accentColor: "#B45309",
    cardBg: "linear-gradient(160deg, #FFFBEB 0%, #FFFFFF 72%)",
    cardBorder: "#FDE68A",
  },
] as const;

function FeatureModal({ row, onClose }: { row: Row; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full rounded-3xl border p-8"
        style={{
          background: WORKDESK_CARD.background,
          borderColor: WORKDESK_CARD.borderColor,
          boxShadow: WORKDESK_CARD.boxShadow,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-100"
          style={{ color: SLATE_HORIZON.muted }}
        >
          <X size={16} />
        </button>

        <p className="mb-3 text-[10px] font-black uppercase tracking-widest" style={{ color: SLATE_HORIZON.brandDeep }}>
          Detaily funkcie
        </p>
        <h3 className="mb-4 text-xl font-black uppercase italic" style={{ color: SLATE_HORIZON.ink }}>
          {row.label}
        </h3>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
          {row.desc}
        </p>

        <div className="flex flex-wrap gap-2">
          {PLANS.map((plan, i) => {
            const val = row.cells[i as 0 | 1 | 2 | 3];
            const active = val !== false;
            return (
              <span
                key={plan.key}
                className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
                style={
                  active
                    ? { background: SLATE_HORIZON.soft, color: plan.accentColor, border: `1px solid ${plan.cardBorder}` }
                    : { background: SLATE_HORIZON.bg, color: SLATE_HORIZON.muted, border: `1px solid ${SLATE_HORIZON.line}` }
                }
              >
                {active ? "✓ " : "✗ "}
                {plan.name}
              </span>
            );
          })}
        </div>

        <Link
          href="/billing"
          className="mt-6 block w-full rounded-xl py-3 text-center text-[11px] font-black uppercase tracking-widest text-white transition-opacity hover:opacity-90"
          style={{ background: SLATE_HORIZON.brandDeep }}
        >
          Aktivovať program →
        </Link>
      </div>
    </div>
  );
}

function Cell({ value, color, featured }: { value: CellValue; color: string; featured: boolean }) {
  const bg = featured ? "rgba(255,251,235,0.55)" : "transparent";

  if (value === true) {
    return (
      <td className="px-3 py-2.5 text-center" style={{ background: bg }}>
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full"
          style={{ background: SLATE_HORIZON.soft }}
        >
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l2.5 2.5L9 1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </td>
    );
  }
  if (value === false) {
    return (
      <td className="px-3 py-2.5 text-center" style={{ background: bg }}>
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full"
          style={{ background: SLATE_HORIZON.bg }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2l6 6M8 2l-6 6" stroke={SLATE_HORIZON.line} strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
      </td>
    );
  }
  return (
    <td className="px-3 py-2.5 text-center" style={{ background: bg }}>
      <span
        className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold"
        style={{ background: SLATE_HORIZON.soft, color }}
      >
        {value}
      </span>
    </td>
  );
}

export default function RozpisFunkcionalit() {
  const [selected, setSelected] = useState<Row | null>(null);

  return (
    <div className="min-h-full pb-20" style={{ background: SLATE_HORIZON.bg, color: SLATE_HORIZON.ink }}>
      {selected && <FeatureModal row={selected} onClose={() => setSelected(null)} />}

      <div className="mx-auto max-w-6xl px-4 py-12 md:px-8">
        <div className="mb-10">
          <h1 className="mb-3 text-3xl font-black uppercase italic tracking-tight md:text-5xl" style={{ color: SLATE_HORIZON.ink }}>
            ROZPIS <span style={{ color: SLATE_HORIZON.brand }}>FUNKCIONALÍT</span>
          </h1>
          <p className="text-sm uppercase tracking-wider" style={{ color: SLATE_HORIZON.muted }}>
            Klikni na ľubovoľnú funkcionalitu pre detailný popis
          </p>
        </div>

        <div
          className="overflow-x-auto rounded-2xl border"
          style={{
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
            background: WORKDESK_CARD.background,
          }}
        >
          <table className="w-full border-collapse" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th className="w-[200px] p-0" />
                {PLANS.map((plan) => (
                  <th key={plan.key} className="p-0 text-center" style={{ minWidth: 130 }}>
                    <div
                      className="relative px-3 py-5"
                      style={{
                        background: plan.cardBg,
                        borderBottom: `1px solid ${plan.cardBorder}`,
                        boxShadow: plan.featured ? "0 8px 24px rgba(245,158,11,0.12)" : undefined,
                      }}
                    >
                      {plan.featured && (
                        <div
                          className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest"
                          style={{
                            background: "linear-gradient(135deg, #F59E0B, #D97706)",
                            color: SLATE_HORIZON.inkDeep,
                          }}
                        >
                          Odporúčané
                        </div>
                      )}
                      <div className="mb-1 text-[10px] font-black uppercase tracking-wider" style={{ color: plan.accentColor }}>
                        {plan.name}
                      </div>
                      <div className="text-xl font-black" style={{ color: SLATE_HORIZON.ink }}>
                        {plan.price}
                        <span className="text-[10px] font-normal" style={{ color: SLATE_HORIZON.muted }}>
                          {" "}
                          / mes
                        </span>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {SECTIONS.map((section) => (
                <Fragment key={section.title}>
                  <tr style={{ background: SLATE_HORIZON.soft }}>
                    <td
                      colSpan={5}
                      className="px-4 py-2 text-[10px] font-black uppercase tracking-widest"
                      style={{ color: SLATE_HORIZON.brandDeep, borderBottom: `1px solid ${SLATE_HORIZON.softBorder}` }}
                    >
                      {section.title}
                    </td>
                  </tr>

                  {section.rows.map((row) => (
                    <tr
                      key={row.label}
                      className="transition-colors hover:bg-slate-50/80"
                      style={{ borderBottom: `1px solid ${SLATE_HORIZON.line}` }}
                    >
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => setSelected(row)}
                          className="text-left text-xs underline decoration-dotted underline-offset-2 transition-colors hover:opacity-80"
                          style={{ color: SLATE_HORIZON.navText }}
                        >
                          {row.label}
                        </button>
                      </td>
                      {row.cells.map((cell, ci) => (
                        <Cell key={ci} value={cell} color={PLANS[ci].accentColor} featured={PLANS[ci].featured} />
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}

              <tr>
                <td />
                {PLANS.map((plan) => (
                  <td
                    key={plan.key}
                    className="px-3 py-4 text-center"
                    style={{
                      background: plan.featured ? "rgba(255,251,235,0.55)" : SLATE_HORIZON.bg,
                      borderTop: `1px solid ${SLATE_HORIZON.line}`,
                    }}
                  >
                    <Link
                      href="/billing"
                      className="block w-full rounded-xl py-2 text-[10px] font-black uppercase tracking-wider transition-opacity hover:opacity-90"
                      style={
                        plan.featured
                          ? { background: "linear-gradient(135deg, #F59E0B, #D97706)", color: SLATE_HORIZON.inkDeep }
                          : { background: SLATE_HORIZON.brandDeep, color: "#FFFFFF" }
                      }
                    >
                      Začať ↗
                    </Link>
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
