"use client";
import { useState } from "react";

type FeatureRow = {
  category: string;
  feature: string;
  starter: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
  highlight?: boolean;
};

const FEATURES: FeatureRow[] = [
  // AI Asistent
  { category: "AI Asistent",
    feature: "Automatické odpovede",
    starter: "Pracovné hodiny", pro: "24/7", enterprise: "24/7 + vlastná persona",
    highlight: true },
  { category: "AI Asistent",
    feature: "Skóre pripravenosti záujemcu",
    starter: true, pro: true, enterprise: true },
  { category: "AI Asistent",
    feature: "Detekcia zámeru kúpy",
    starter: false, pro: true, enterprise: true },
  { category: "AI Asistent",
    feature: "Analýza hovoru (prepis + súhrn)",
    starter: false, pro: true, enterprise: true },

  // Príležitosti
  { category: "Príležitosti",
    feature: "Počet príležitostí",
    starter: "Do 100/mes", pro: "Neobmedzené", enterprise: "Neobmedzené" },
  { category: "Príležitosti",
    feature: "AI párovanie s nehnuteľnosťami",
    starter: "Do 10/mes", pro: "Neobmedzené", enterprise: "Neobmedzené" },
  { category: "Príležitosti",
    feature: "Automatické sledovacie kampane (7 dní)",
    starter: false, pro: true, enterprise: true },
  { category: "Príležitosti",
    feature: "Sledovanie rýchlosti postupu príležitostí",
    starter: false, pro: true, enterprise: true },

  // Analytika
  { category: "Analytika",
    feature: "Týždenný konverzný report",
    starter: true, pro: true, enterprise: true },
  { category: "Analytika",
    feature: "Predikcia príjmov (3 mesiace)",
    starter: false, pro: true, enterprise: true },
  { category: "Analytika",
    feature: "Mapa aktivity v oblasti",
    starter: false, pro: true, enterprise: true },
  { category: "Analytika",
    feature: "Hodnotenie výkonu maklérov",
    starter: false, pro: false, enterprise: true },
  { category: "Analytika",
    feature: "Prehľad majiteľa kancelárie",
    starter: false, pro: false, enterprise: true },

  // Tím
  { category: "Tím",
    feature: "Počet maklérov",
    starter: "Do 3", pro: "Neobmedzení", enterprise: "Neobmedzení" },
  { category: "Tím",
    feature: "Zdieľaná AI pamäť tímu",
    starter: false, pro: false, enterprise: true },
  { category: "Tím",
    feature: "Upozornenie na konkurenciu",
    starter: false, pro: false, enterprise: true },

  // Integrácie
  { category: "Integrácie",
    feature: "Portály (Nehnuteľnosti.sk, Reality.sk)",
    starter: false, pro: true, enterprise: true },
  { category: "Integrácie",
    feature: "API prístup",
    starter: false, pro: false, enterprise: true },
  { category: "Integrácie",
    feature: "Vlastné firemné logo (white-label)",
    starter: false, pro: false, enterprise: true },

  // Podpora
  { category: "Podpora",
    feature: "Reakčná doba podpory",
    starter: "48h", pro: "4h", enterprise: "1h" },
  { category: "Podpora",
    feature: "Dedikovaný správca účtu",
    starter: false, pro: false, enterprise: true },
  { category: "Podpora",
    feature: "Prístup k vzdelávacej akadémii",
    starter: "5 lekcií", pro: "20 modulov", enterprise: "Všetko + vlastný onboarding" },
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
                {["Štarter", "Pro", "Enterprise"].map((plan, i) => (
                  <th
                    key={plan}
                    className="p-4 text-center font-bold"
                    style={{ color: i === 1 ? "#22D3EE" : "#F0F9FF" }}
                  >
                    {i === 1 && <span className="mr-1">⭐</span>}
                    {plan}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <>
                  <tr key={`cat-${category}`} style={{ background: "#050914" }}>
                    <td
                      colSpan={4}
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
                        <Cell value={feature.starter} />
                      </td>
                      <td className="p-4 text-center">
                        <Cell value={feature.pro} />
                      </td>
                      <td className="p-4 text-center">
                        <Cell value={feature.enterprise} />
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
