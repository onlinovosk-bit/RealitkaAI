"use client";
import { Fragment } from "react";
import { useState } from "react";

type FeatureRow = {
  category: string;
  feature: string;
  smartStart: string | boolean;
  activeForce: string | boolean;
  marketVision: string | boolean;
  protocolAuthority: string | boolean;
  highlight?: boolean;
};

export const FEATURES: FeatureRow[] = [
  // Legacy migration mapping rule:
  // Starter -> Smart Start, Pro -> Market Vision, Enterprise -> Protocol Authority
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

  // 14+ nových L99 feature flagov podľa aktuálnej matice
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

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <span style={{ color: "#22D3EE" }}>✓</span>;
  if (value === false) return <span style={{ color: "#334155" }}>—</span>;
  return <span className="text-xs" style={{ color: "#94A3B8" }}>{value}</span>;
}

export default function FeatureComparisonTable() {
  const [open, setOpen] = useState(false);
  const categories = [...new Set(FEATURES.map((f) => f.category))];

  return (
    <div className="mt-8">
      <button
        onClick={() => setOpen(!open)}
        className="w-full rounded-2xl p-4 text-sm font-semibold transition-all"
        style={{
          background: "rgba(34,211,238,0.04)",
          border: "1px solid rgba(34,211,238,0.10)",
          color: "#22D3EE",
        }}
      >
        {open ? "▲ Skryť" : "▼ Zobraziť"} kompletné porovnanie funkcií
      </button>

      {open && (
        <div
          className="mt-4 overflow-hidden rounded-2xl"
          style={{ border: "1px solid #112240" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#0A1628" }}>
                <th className="p-4 text-left" style={{ color: "#64748B" }}>
                  Funkcia
                </th>
                {["Smart Start", "Active Force", "Market Vision", "Protocol Authority"].map((plan, i) => (
                  <th
                    key={plan}
                    className="p-4 text-center font-bold"
                    style={{ color: i === 3 ? "#EAB308" : i === 2 ? "#34D399" : "#F0F9FF" }}
                  >
                    {i === 2 && <span className="mr-1">⭐</span>}
                    {plan}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <Fragment key={`cat-group-${category}`}>
                  <tr style={{ background: "#050914" }}>
                    <td
                      colSpan={5}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider"
                      style={{ color: "#334155" }}
                    >
                      {category}
                    </td>
                  </tr>
                  {FEATURES.filter((f) => f.category === category).map((feature, i) => (
                    <tr
                      key={`${category}-${i}`}
                      className="border-t"
                      style={{
                        borderColor: "#0F1F3D",
                        background: feature.highlight
                          ? "rgba(34,211,238,0.03)"
                          : "#0A1628",
                      }}
                    >
                      <td className="p-4" style={{ color: "#CBD5E1" }}>
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
