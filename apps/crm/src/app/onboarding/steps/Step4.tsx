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

      <div className="space-y-6 max-w-lg">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Meno tvojho AI asistenta</label>
          <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900"
            value={formData.aiName} onChange={e => update({ aiName: e.target.value })} />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-3">Tón komunikácie AI</label>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((t) => {
              const ToneIcon = t.Icon;
              return (
              <button
                key={t.id}
                type="button"
                onClick={() => update({ aiTone: t.id })}
                className={
                  "border rounded-xl px-4 py-2.5 text-xs font-semibold flex flex-col items-center gap-1.5 min-w-[80px] transition-all " +
                  (formData.aiTone === t.id
                    ? "border-2 border-gray-900 bg-gray-50 text-gray-900"
                    : "border-gray-200 text-gray-500 hover:border-gray-400")
                }
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <ToneIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
                <span>{t.short}</span>
              </button>
              );
            })}
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
          {(
            [
              {
                key: "autoReply",
                Icon: Bot,
                label: "Automatické odpovedanie",
                desc: "AI odpovedá automaticky bez tvojho zásahu.",
              },
              {
                key: "workHours",
                Icon: Clock,
                label: "Pracovné hodiny",
                desc: "AI odpovedá len 8:00–18:00.",
              },
              {
                key: "leadScoring",
                Icon: Star,
                label: "Inteligentné hodnotenie záujemcov",
                desc: "AI hodnotí záujemcov a upozorní na najvyššie priority.",
              },
            ] as const
          ).map((item) => {
            const RowIcon = item.Icon;
            return (
            <div key={item.key} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <RowIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
              </div>
              <Toggle
                value={(formData as Record<string, unknown>)[item.key] as boolean}
                onChange={(v) => update({ [item.key]: v })}
              />
            </div>
            );
          })}
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-800">
              <Bot className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{formData.aiName}</div>
              <div className="text-xs text-green-600">● Online — odpovedá za 5 min</div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700">
            Dobrý deň! Som {formData.aiName}, digitálny asistent. Rád vám pomôžem nájsť nehnuteľnosť. Čo práve hľadáte?
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-gray-600 flex gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <TrendingUp className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <span>
            <strong>Výsledok maklérov s Revolis AI:</strong> Priemerná odpoveď do 2 min (oproti 4 h pri manuálnej práci). Miera konverzie vyššia o približne
            34 %.
          </span>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
        <PrimaryBtn onClick={next}>Generovať AI & pokračovať →</PrimaryBtn>
      </div>
    </div>
  );
}
