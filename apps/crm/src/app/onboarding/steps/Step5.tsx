"use client";
import { useOnboarding } from "../useOnboarding";
import { PrimaryBtn, SecondaryBtn } from "./shared";

const IMPORT_OPTIONS = [
  { id: "csv",           emoji: "📊", label: "CSV / Excel",      desc: "Vlastný súbor" },
  { id: "nehnutelnosti", emoji: "🏠", label: "Nehnuteľnosti.sk", desc: "Export z portálu" },
  { id: "reality",       emoji: "🏠", label: "Reality.sk",       desc: "Export z portálu" },
  { id: "topreality",    emoji: "⭐", label: "TopReality.sk",    desc: "Export z portálu" },
  { id: "manual",        emoji: "✏️", label: "Manuálne",         desc: "Pridám neskôr ručne" },
  { id: "skip",          emoji: "⏩", label: "Preskočiť",         desc: "Začnem od nuly" },
];

export default function Step5({ slug }: { slug: string }) {
  const { formData, update, next, back, skip, loaded, patchChecklist } = useOnboarding(slug);
  if (!loaded) return <div className="animate-pulse text-gray-400">Načítavam...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">— KROK 5 ZO 8 — VOLITEĽNÝ</p>
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Import kontaktov & leadov 📋</h1>
      <p className="text-gray-500 mb-8">Presuň existujúce kontakty do Revolisu. Môžeš to spraviť teraz alebo neskôr.</p>

      <div className="mb-3 text-sm font-semibold text-gray-700">Odkiaľ chceš importovať?</div>
      <div className="grid grid-cols-3 gap-4 max-w-lg mb-6">
        {IMPORT_OPTIONS.map(opt => (
          <button key={opt.id} type="button" onClick={() => update({ importSource: opt.id })}
            className={"border rounded-xl p-5 flex flex-col items-center text-center gap-2 transition-all " +
              (formData.importSource === opt.id ? "border-2 border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-400")}>
            <span className="text-3xl">{opt.emoji}</span>
            <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
            <span className="text-[11px] text-gray-400">{opt.desc}</span>
          </button>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-gray-600 max-w-lg">
        💡 <strong>Tip:</strong> Aj 20 starých kontaktov môže priniesť okamžité výsledky. Revolis AI automaticky osloví všetkých nevybavených leadov.
      </div>

      <div className="mt-8 flex items-center gap-4 flex-wrap">
        <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
        <button type="button" onClick={skip} className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2">
          Preskočiť na neskôr
        </button>
        <PrimaryBtn onClick={() => {
          const shouldMark = formData.importSource !== "" && formData.importSource !== "skip";
          void (shouldMark ? patchChecklist({ importedLeads: true }) : Promise.resolve(null)).then(() => next());
        }}>Pokračovať →</PrimaryBtn>
      </div>
    </div>
  );
}
