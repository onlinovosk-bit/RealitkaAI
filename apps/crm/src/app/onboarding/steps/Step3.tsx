"use client";
import { useOnboarding } from "../useOnboarding";
import { PrimaryBtn, SecondaryBtn, TagGroup } from "./shared";

export default function Step3({ slug }: { slug: string }) {
  const { formData, update, next, back, loaded } = useOnboarding(slug);
  if (!loaded) return <div className="animate-pulse text-gray-400">Načítavam...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">— KROK 3 ZO 8 —</p>
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Tvoj profil makléra 👤</h1>
      <p className="text-gray-500 mb-8">Klienti ťa spoznajú cez tvoj AI asistent. Čím lepší profil, tým dôveryhodnejší prvý dojem.</p>

      <div className="space-y-6 max-w-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Telefón *</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900"
              value={formData.phone} onChange={e => update({ phone: e.target.value })} placeholder="+421 XXX XXX XXX" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">LinkedIn profil</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900"
              value={formData.linkedin} onChange={e => update({ linkedin: e.target.value })} placeholder="linkedin.com/in/tvoje-meno" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Krátke bio (zobrazí sa klientom)</label>
          <textarea rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            value={typeof formData.bio === "string" ? formData.bio : ""}
            onChange={e => update({ bio: e.target.value })}
            placeholder="Napr: Pomáham rodinám nájsť domov v Bratislave od roku 2015..." />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-3">Špecializácia</label>
          <TagGroup
            options={["Byty","Rodinné domy","Luxusné nehnuteľnosti","Komerčné priestory","Pôda","Novostavby","Investície","Prenájom"]}
            selected={Array.isArray(formData.specializations) ? formData.specializations : []}
            onToggle={v => {
              const curr = Array.isArray(formData.specializations) ? formData.specializations : [];
              update({ specializations: curr.includes(v) ? curr.filter(x => x !== v) : [...curr, v] });
            }}
          />
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
        <PrimaryBtn onClick={next}>Pokračovať →</PrimaryBtn>
      </div>
    </div>
  );
}
