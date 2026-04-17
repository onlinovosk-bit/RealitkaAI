"use client";
import { useOnboarding } from "../useOnboarding";
import { PrimaryBtn, SecondaryBtn, Toggle } from "./shared";

export default function Step4({ slug }: { slug: string }) {
  const { formData, update, next, back, loaded } = useOnboarding(slug);
  if (!loaded) return <div className="animate-pulse text-gray-400">Načítavam...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">— KROK 4 ZO 8 — KĽÚČOVÝ KROK</p>
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Nakonfiguruj AI asistenta 🤖</h1>
      <p className="text-gray-500 mb-8">Toto je srdce Revolisu. Tvoj AI obchodník bude pracovať za teba non-stop.</p>

      <p className="text-sm text-gray-700 mb-6 rounded-xl border border-cyan-100 bg-cyan-50/40 px-4 py-3 leading-relaxed">
        Podľa interných benchmarkov vie AI pokryť väčšinu opakovateľnej práce — odpovede na leady, lead scoring, párovanie nehnuteľností a follow-up
        cadencu. Na tebe ostáva ľudský kontakt pri obhliadkach, vyjednávaní a dlhodobých vzťahoch.
      </p>

      <div className="space-y-6 max-w-lg">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Meno tvojho AI asistenta</label>
          <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900"
            value={formData.aiName} onChange={e => update({ aiName: e.target.value })} />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-3">Tón komunikácie AI</label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "💼 PROFESIONÁLNY", emoji: "💼" },
              { id: "😊 PRIATEĽSKÝ",    emoji: "😊" },
              { id: "✨ LUXUSNÝ",        emoji: "✨" },
              { id: "⚡ ENERGICKÝ",     emoji: "⚡" },
              { id: "🎩 FORMÁLNY",      emoji: "🎩" },
            ].map(t => (
              <button key={t.id} type="button" onClick={() => update({ aiTone: t.id })}
                className={"border rounded-xl px-4 py-2.5 text-xs font-semibold flex flex-col items-center gap-1 min-w-[80px] transition-all " +
                  (formData.aiTone === t.id ? "border-2 border-gray-900 bg-gray-50" : "border-gray-200 text-gray-500 hover:border-gray-400")}>
                <span className="text-xl">{t.emoji}</span>
                <span>{t.id.split(" ")[1]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Primárny jazyk</label>
            <select className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none">
              <option>sk Slovenčina</option><option>cs Čeština</option><option>en Angličtina</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Oneskorenie auto-odpovede</label>
            <select className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none">
              <option>5 minút (odporúčané)</option><option>Okamžite</option><option>15 minút</option><option>30 minút</option>
            </select>
          </div>
        </div>

        <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
          {[
            { key: "autoReply",   emoji: "🤖", label: "Automatické odpovedanie",  desc: "AI odpovedá automaticky bez tvojho zásahu." },
            { key: "workHours",   emoji: "🕐", label: "Pracovné hodiny",           desc: "AI odpovedá len 8:00–18:00." },
            { key: "leadScoring", emoji: "⭐", label: "Smart lead scoring",        desc: "AI hodnotí leadov a upozorní na top priority." },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5">{item.emoji}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
              </div>
              <Toggle
                value={(formData as Record<string, unknown>)[item.key] as boolean}
                onChange={v => update({ [item.key]: v })} />
            </div>
          ))}
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-base">🤖</div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{formData.aiName}</div>
              <div className="text-xs text-green-600">● Online — odpovedá za 5 min</div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700">
            Dobrý deň! Som {formData.aiName}, digitálny asistent. Rád vám pomôžem nájsť nehnuteľnosť. Čo práve hľadáte?
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-gray-600">
          ⚡ <strong>Výsledok maklérov s Revolis AI:</strong> Priemerná odpoveď za 2 min (vs. 4 hod manuálne). Konverzný pomer +34%.
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
        <PrimaryBtn onClick={next}>Generovať AI & pokračovať →</PrimaryBtn>
      </div>
    </div>
  );
}
