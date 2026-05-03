"use client";
import { useOnboarding } from "../useOnboarding";
import { PrimaryBtn, SecondaryBtn } from "./shared";

const GOALS = [
  { id: "more_leads",   emoji: "📈", label: "Získať viac leadov",        desc: "Chcem viac záujemcov mesačne" },
  { id: "faster_close", emoji: "⚡", label: "Rýchlejšie zatváranie",     desc: "Skrátiť čas od kontaktu po zmluvu" },
  { id: "automate",     emoji: "🤖", label: "Automatizovať prácu",       desc: "Menej manuálnej správy" },
  { id: "analytics",    emoji: "📊", label: "Lepšia analytika",          desc: "Viem čo funguje, kde sa strácajú leady" },
];

const KPI_SLIDERS = [
  { key: "kpiLeads",      label: "Leadov mesačne",  desc: "Koľko nových záujemcov chceš mesačne?",          min: 5,  max: 200, unit: "" },
  { key: "kpiDays",       label: "Dni do uzavretia",desc: "Priemerný čas od prvého kontaktu po zmluvu",     min: 7,  max: 180, unit: "dní" },
  { key: "kpiConversion", label: "Konverzný pomer", desc: "Koľko % leadov sa ti darí previesť na klientov?",min: 1,  max: 50,  unit: "%" },
];

export default function Step8({ slug }: { slug: string }) {
  const { formData, update, next, back, loaded, patchChecklist } = useOnboarding(slug);
  if (!loaded) return <div className="animate-pulse text-gray-400">Načítavam...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">— KROK 8 ZO 8 — POSLEDNÝ KROK!</p>
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Definuj svoje ciele 🎯</h1>
      <p className="text-gray-500 mb-8">Revolis prispôsobí AI odporúčania podľa tvojich cieľov. Kde chceš byť o 6 mesiacov?</p>

      <div className="mb-3 text-sm font-semibold text-gray-700">Primárny cieľ</div>
      <div className="grid grid-cols-2 gap-3 max-w-lg mb-8">
        {GOALS.map(goal => (
          <button key={goal.id} type="button" onClick={() => update({ primaryGoal: goal.id })}
            className={"border rounded-xl p-4 text-left transition-all " +
              (formData.primaryGoal === goal.id ? "border-2 border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-400")}>
            <div className="text-xl mb-2">{goal.emoji}</div>
            <div className="text-sm font-semibold text-gray-900">{goal.label}</div>
            <div className="text-xs text-gray-400 mt-1">{goal.desc}</div>
          </button>
        ))}
      </div>

      <div className="mb-3 text-sm font-semibold text-gray-700">Cieľové KPI (nastav čísla)</div>
      <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 max-w-lg mb-6">
        {KPI_SLIDERS.map(kpi => (
          <div key={kpi.key} className="px-4 py-4">
            <div className="flex items-center gap-3 mb-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">{kpi.label}</div>
                <div className="text-xs text-gray-400">{kpi.desc}</div>
              </div>
              <div className="ml-auto text-lg font-bold text-gray-900 min-w-[48px] text-right">
                {(formData as unknown as Record<string, number>)[kpi.key]}{kpi.unit}
              </div>
            </div>
            <input type="range" min={kpi.min} max={kpi.max}
              value={(formData as unknown as Record<string, number>)[kpi.key]}
              onChange={e => update({ [kpi.key]: Number(e.target.value) })}
              className="w-full accent-gray-900" />
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-gray-600 max-w-lg">
        🚀 <strong>Revolis bude merať tvoj pokrok voči týmto cieľom</strong> a každý týždeň ti pošle report.
      </div>

      <div className="mt-8 flex gap-3">
        <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
        <PrimaryBtn onClick={() => {
          if (formData.primaryGoal !== "" || formData.kpiLeads > 0) {
            void patchChecklist({ goalsDefined: true }).then(() => next());
          } else {
            next();
          }
        }}>✨ Spustiť Revolis.AI</PrimaryBtn>
      </div>
    </div>
  );
}
