"use client";
import { useOnboarding } from "../useOnboarding";
import { PrimaryBtn, SecondaryBtn, Toggle } from "./shared";

const PIPELINE_STAGES = ["1. Nový lead","2. Kontaktovaný","3. Kvalifikovaný","4. Prehliadka","5. Ponuka","6. Rokovanie","7. Zmluva"];
const STAGE_COLORS = ["bg-blue-500","bg-cyan-500","bg-violet-500","bg-orange-400","bg-yellow-400","bg-orange-500","bg-green-500"];

const AUTOMATIONS = [
  { key: "welcome",  emoji: "💬", label: "Auto-uvítacia správa pre nový lead" },
  { key: "followUp", emoji: "📩", label: "Follow-up ak 3 dni bez odpovede" },
  { key: "reminder", emoji: "📅", label: "Pripomienka prehliadky 1 deň vopred" },
  { key: "score",    emoji: "⭐", label: "Upozornenie keď lead dosiahne skóre 75+" },
  { key: "birthday", emoji: "🎂", label: "Gratulácia klientovi k narodeninám" },
];

export default function Step6({ slug }: { slug: string }) {
  const { formData, update, next, back, loaded } = useOnboarding(slug);
  if (!loaded) return <div className="animate-pulse text-gray-400">Načítavam...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">— KROK 6 ZO 8 —</p>
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Predajný pipeline 🏗️</h1>
      <p className="text-gray-500 mb-8">Revolis má prednastavený pipeline pre reality. Môžeš ho prispôsobiť alebo použiť tak ako je.</p>

      <div className="mb-2 text-sm font-semibold text-gray-700">Fázy predaja</div>
      <div className="border border-gray-100 rounded-xl overflow-hidden mb-6 max-w-lg">
        {PIPELINE_STAGES.map((stage, i) => (
          <div key={stage} className={"flex items-center justify-between px-4 py-3 text-sm " +
            (i < PIPELINE_STAGES.length - 1 ? "border-b border-gray-100" : "")}>
            <div className="flex items-center gap-3">
              <span className={"w-2.5 h-2.5 rounded-full shrink-0 " + STAGE_COLORS[i]} />
              <span className="font-medium text-gray-800">{stage}</span>
            </div>
            <span className="text-xs text-gray-400">0 leadov</span>
          </div>
        ))}
      </div>

      <div className="mb-2 text-sm font-semibold text-gray-700">Automatické akcie (zapni čo chceš)</div>
      <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 max-w-lg mb-6">
        {AUTOMATIONS.map(item => (
          <div key={item.key} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 text-sm font-medium text-gray-800">
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </div>
            <Toggle
              value={(formData.automation as Record<string, boolean>)[item.key]}
              onChange={v => update({ automation: { ...formData.automation, [item.key]: v } })} />
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-gray-600 max-w-lg">
        🏆 <strong>Makléri s automatickými follow-upmi</strong> uzatvárajú o 27% viac obchodov.
      </div>

      <div className="mt-8 flex gap-3">
        <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
        <PrimaryBtn onClick={next}>Pokračovať →</PrimaryBtn>
      </div>
    </div>
  );
}
