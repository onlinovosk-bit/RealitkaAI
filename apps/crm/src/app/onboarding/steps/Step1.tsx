"use client";
import { useOnboarding } from "../useOnboarding";
import { PrimaryBtn, OptionCard } from "./shared";

export default function Step1({ slug }: { slug: string }) {
  const { formData, update, next, loaded } = useOnboarding(slug);
  if (!loaded) return <div className="animate-pulse text-gray-400">Načítavam...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">— KROK 1 ZO 8 —</p>
      <h1 className="text-4xl font-bold mb-3 tracking-tight">Vitaj v Revolis.AI 🚀</h1>
      <p className="text-gray-500 mb-10">Nastav si účet za 15 minút. Potom nechaj AI pracovať za teba — 24/7, bez oddychu.</p>

      <div className="space-y-6 max-w-md">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Tvoje meno *</label>
          <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900 text-base transition-all"
            value={formData.name} onChange={e => update({ name: e.target.value })} placeholder="Napr. Tomáš Novák" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-3">Si v realitách ako...</label>
          <div className="grid grid-cols-3 gap-3">
            <OptionCard id="owner" emoji="🏛️" label="Majiteľ kancelárie" desc="Vediem agentúru / tím"
              active={formData.role === "owner"} onClick={id => update({ role: id })} />
            <OptionCard id="agent" emoji="💛" label="Samostatný maklér" desc="Pracujem sám alebo pre kanceláriu"
              active={formData.role === "agent"} onClick={id => update({ role: id })} />
            <OptionCard id="manager" emoji="⚙️" label="Office Manager" desc="Spravujem systémy a tím"
              active={formData.role === "manager"} onClick={id => update({ role: id })} />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-3">Čo chceš dosiahnuť s Revolis? (vyber čo platí)</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "leads",      emoji: "📈", label: "Viac leadov",              desc: "Automaticky z portálov a webu" },
              { id: "ai",         emoji: "🤖", label: "AI predaj 24/7",           desc: "Asistent odpovedá za mňa" },
              { id: "fast",       emoji: "⚡", label: "Rýchlejšie uzatváranie",   desc: "Skrátiť čas deal → zmluva" },
              { id: "analytics",  emoji: "📊", label: "Analytika & prehľad",      desc: "Viem čo funguje a čo nie" },
              { id: "team",       emoji: "👥", label: "Riadenie tímu",            desc: "Prehľad nad celým tímom" },
              { id: "automation", emoji: "🔄", label: "Menej manuálnej práce",    desc: "Automatické follow-upy" },
            ].map(opt => (
              <OptionCard key={opt.id} id={opt.id} emoji={opt.emoji} label={opt.label} desc={opt.desc}
                active={formData.primaryGoal === opt.id} onClick={id => update({ primaryGoal: id })} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-gray-600 max-w-md">
        💡 <strong>Prečo Revolis nie je len ďalší CRM:</strong> Väčšina maklérov stráca 60% leadov len preto, že neodpíše dosť rýchlo. Revolis AI odpovedá do 30 sekúnd — 24 hodín denne, 7 dní v týždni.
      </div>

      <div className="mt-8">
        <PrimaryBtn disabled={!formData.name || !formData.role} onClick={next}>Začať nastavenie →</PrimaryBtn>
      </div>
    </div>
  );
}
