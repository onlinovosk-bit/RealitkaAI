"use client";
import { Fragment } from "react";
import { useState } from "react";
import { Check, Minus } from "lucide-react";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

export type FeatureRow = {
  category: string;
  feature: string;
  smartStart: string | boolean;
  activeForce: string | boolean;
  marketVision: string | boolean;
  protocolAuthority: string | boolean;
  highlight?: boolean;
};

export const FEATURES: FeatureRow[] = [
  {
    category: "Základné Funkcie",
    feature: "AI pomocník počas dňa (rýchle odpovede klientom)",
    smartStart: true,
    activeForce: true,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Základné Funkcie",
    feature: "Skóre: kto kúpi najskôr (0-100)",
    smartStart: true,
    activeForce: true,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Základné Funkcie",
    feature: "Ranný plán o 8:00: kde sú peniaze dnes",
    smartStart: true,
    activeForce: true,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Základné Funkcie",
    feature: "Horúci alert (skóre 75+): komu volať hneď",
    smartStart: true,
    activeForce: true,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Základné Funkcie",
    feature: "Týždenný report: čo zarába a čo brzdí predaj",
    smartStart: true,
    activeForce: true,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Základné Funkcie",
    feature: "Revolis škola: krátke návody, ako zarobiť viac",
    smartStart: true,
    activeForce: true,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "AI analýza predaja",
    feature: "AI pomocník 24/7 (aj večer a cez víkend)",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "AI analýza predaja",
    feature: "Predpoveď: ktorý obchod sa uzavrie",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "AI analýza predaja",
    feature: "AI analýza hovorov: čo povedať, aby klient kúpil",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "AI analýza predaja",
    feature: "Detekcia záujmu: kto to myslí vážne",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "AI analýza predaja",
    feature: "Automatické pripomenutie klienta (follow-up)",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "AI analýza predaja",
    feature: "Prehľad rajónu: kde sa oplatí loviť klientov",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "AI analýza predaja",
    feature: "Predpoveď tržieb: koľko zarobíš tento mesiac",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "AI analýza predaja",
    feature: "Portálové integrácie",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Tím a firma",
    feature: "Prehľad pre majiteľa: kde tím zarába dnes",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
  },
  {
    category: "Tím a firma",
    feature: "AI mozog tímu: spoločné rozhodnutia",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
  },
  {
    category: "Tím a firma",
    feature: "Upozornenie na konkurenciu",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
  },
  {
    category: "Tím a firma",
    feature: "Vlastný AI štýl tvojej kancelárie",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
  },
  {
    category: "Tím a firma",
    feature: "API Prístup",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
  },
  {
    category: "Tím a firma",
    feature: "Vlastná značka (bez loga Revolis)",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
  },
  {
    category: "Tím a firma",
    feature: "Osobný človek na pomoc (account manažér)",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
  },
  {
    category: "Tím a firma",
    feature: "Garancia dostupnosti 99.9%",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
  },
  {
    category: "Živé Obchody",
    feature: "Živý radar obchodov: kde sú peniaze práve teraz",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Živé Obchody",
    feature: "Návrat starých klientov (Ghost 2.0)",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Živé Obchody",
    feature: "Kataster naživo (limit 100)",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Živé Obchody",
    feature: "Kataster naživo bez limitu",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Živé Obchody",
    feature: "Auto import dát bez klikania",
    smartStart: false,
    activeForce: true,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Živé Obchody",
    feature: "Denný súhrn z radaru: čo riešiť ako prvé",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Trhová Prevaha",
    feature: "AI skóre leadov: komu volať teraz",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Trhová Prevaha",
    feature: "Mapa horúcich ulíc (kde je najväčší dopyt)",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Trhová Prevaha",
    feature: "Detektor kde konkurencia spí",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Trhová Prevaha",
    feature: "AI návrh ceny: aby si predal rýchlo a dobre",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Trhová Prevaha",
    feature: "Skryté ponuky mimo bežných portálov",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Trhová Prevaha",
    feature: "Report trhovej medzery: kde chýbajú ponuky",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
  },
  {
    category: "Hodnota Značky",
    feature: "Profil makléra: prečo ti majú veriť",
    smartStart: true,
    activeForce: true,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Hodnota Značky",
    feature: "Overený certifikát dôveryhodnosti",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Hodnota Značky",
    feature: "AI tréner: čo robiť, aby si predal viac",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Hodnota Značky",
    feature: "Digitálny štart bez chaosu",
    smartStart: false,
    activeForce: true,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Hodnota Značky",
    feature: "Ochrana tímu a dát (Integrity Monitor)",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
  },
  {
    category: "Hodnota Značky",
    feature: "Analytika výkonu: kde zarábaš a kde strácaš",
    smartStart: false,
    activeForce: true,
    marketVision: true,
    protocolAuthority: true,
  },
];

const PLAN_COLORS = ["#64748B", SLATE_HORIZON.brandDeep, "#4338CA", "#B45309"] as const;

function Cell({ value }: { value: string | boolean }) {
  if (value === true) {
    return <Check size={14} style={{ color: SLATE_HORIZON.brandDeep, margin: "0 auto" }} />;
  }
  if (value === false) {
    return <Minus size={14} style={{ color: SLATE_HORIZON.line, margin: "0 auto" }} />;
  }
  return (
    <span className="block text-center text-xs font-medium" style={{ color: SLATE_HORIZON.navText }}>
      {value}
    </span>
  );
}

export default function FeatureComparisonTable() {
  const [open, setOpen] = useState(false);
  const categories = [...new Set(FEATURES.map((f) => f.category))];

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-2xl border p-4 text-sm font-semibold transition-all hover:opacity-90"
        style={{
          background: SLATE_HORIZON.soft,
          borderColor: SLATE_HORIZON.softBorder,
          color: SLATE_HORIZON.brandDeep,
        }}
      >
        {open ? "▲ Skryť" : "▼ Zobraziť"} kompletné porovnanie funkcií
      </button>

      {open && (
        <div
          className="mt-4 overflow-hidden rounded-2xl border"
          style={{
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
            background: WORKDESK_CARD.background,
          }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: SLATE_HORIZON.bg, borderBottom: `1px solid ${SLATE_HORIZON.line}` }}>
                <th className="p-4 text-left font-semibold" style={{ color: SLATE_HORIZON.muted }}>
                  Funkcia
                </th>
                {["Smart Start", "Active Force", "Market Vision", "Protocol Authority"].map((plan, i) => (
                  <th
                    key={plan}
                    className="p-4 text-center text-xs font-bold uppercase tracking-wide"
                    style={{ color: PLAN_COLORS[i] }}
                  >
                    {i === 3 && <span className="mr-1">★</span>}
                    {plan}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <Fragment key={`cat-group-${category}`}>
                  <tr style={{ background: SLATE_HORIZON.soft }}>
                    <td
                      colSpan={5}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider"
                      style={{ color: SLATE_HORIZON.brandDeep }}
                    >
                      {category}
                    </td>
                  </tr>
                  {FEATURES.filter((f) => f.category === category).map((feature, i) => (
                    <tr
                      key={`${category}-${i}`}
                      className="border-t transition-colors hover:bg-slate-50/80"
                      style={{
                        borderColor: SLATE_HORIZON.line,
                        background: feature.highlight ? "rgba(255,251,235,0.45)" : "#FFFFFF",
                      }}
                    >
                      <td className="p-4 text-sm" style={{ color: SLATE_HORIZON.navText }}>
                        {feature.feature}
                      </td>
                      <td className="p-4 text-center">
                        <Cell value={feature.smartStart} />
                      </td>
                      <td className="p-4 text-center">
                        <Cell value={feature.activeForce} />
                      </td>
                      <td className="p-4 text-center">
                        <Cell value={feature.marketVision} />
                      </td>
                      <td className="p-4 text-center">
                        <Cell value={feature.protocolAuthority} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
