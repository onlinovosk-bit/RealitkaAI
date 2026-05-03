"use client";
import { useOnboarding } from "../useOnboarding";
import { PrimaryBtn, SecondaryBtn, TagGroup } from "./shared";

export default function Step2({ slug }: { slug: string }) {
  const { formData, update, next, back, loaded, patchChecklist } = useOnboarding(slug);
  if (!loaded) return <div className="animate-pulse text-gray-400">Načítavam...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">— KROK 2 ZO 8 —</p>
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Nastav svoju realitku 🏢</h1>
      <p className="text-gray-500 mb-8">Tieto info použijeme na personalizáciu AI asistenta a všetkých komunikácií smerom ku klientom.</p>

      <div className="space-y-6 max-w-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Názov realitnej kancelárie *</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900"
              value={formData.agencyName} onChange={e => update({ agencyName: e.target.value })} placeholder="Napr. Reality Novák s.r.o." />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Mesto / región *</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900"
              value={formData.city} onChange={e => update({ city: e.target.value })} placeholder="Napr. Bratislava" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-3">Čo momentálne používate (CRM / systém)?</label>
          <TagGroup
            options={["Nič / Excel", "Nehnuteľnosti.sk CRM", "Reality.sk systém", "Vlastné riešenie", "HubSpot", "Iné"]}
            selected={Array.isArray(formData.specializations) ? formData.specializations : []}
            onToggle={v => {
              const curr = Array.isArray(formData.specializations) ? formData.specializations : [];
              update({ specializations: curr.includes(v) ? curr.filter(x => x !== v) : [...curr, v] });
            }}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-3">Hlavné bolesti (vyber čo vás trápi)</label>
          <TagGroup
            options={["Leady sa strácajú","Pomalé odpovedanie","Žiadna analytika","Manuálne follow-upy","Zlá spolupráca v tíme","Drahá reklama bez výsledkov","Ťažká správa zákazníkov","Nedostatok času"]}
            selected={Array.isArray(formData.bio) ? formData.bio as string[] : []}
            onToggle={v => {
              const curr = Array.isArray(formData.bio) ? formData.bio as string[] : [];
              update({ bio: curr.includes(v) ? curr.filter(x => x !== v) : [...curr, v] });
            }}
          />
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-500">
          🔒 Vaše dáta sú bezpečné. Používame ich výhradne na personalizáciu vášho AI asistenta a nikdy ich nepredávame tretím stranám.
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
        <PrimaryBtn
          disabled={!formData.agencyName || !formData.city}
          onClick={() => { void patchChecklist({ configuredTeam: true }).then(() => next()); }}
        >Pokračovať →</PrimaryBtn>
      </div>
    </div>
  );
}
