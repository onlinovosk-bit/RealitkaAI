
"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";

// Simple toast (replace with your toast lib if needed)
function showToast(msg: string) {
  if (typeof window !== "undefined") {
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.position = "fixed";
    el.style.bottom = "32px";
    el.style.left = "50%";
    el.style.transform = "translateX(-50%)";
    el.style.background = "#222";
    el.style.color = "#fff";
    el.style.padding = "12px 24px";
    el.style.borderRadius = "8px";
    el.style.zIndex = "9999";
    el.style.fontSize = "15px";
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 3200);
  }
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 mb-4">{children}</div>;
}
function PrimaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700">{children}</button>;
}
function SecondaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">{children}</button>;
}
function Toggle({ on, onToggle, label, desc, emoji }: { on: boolean; onToggle: () => void; label: string; desc: string; emoji: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-3">
        <span>{emoji}</span>
        <div>
          <div className="text-sm font-medium text-gray-900">{label}</div>
          {desc && <div className="text-xs text-gray-500">{desc}</div>}
        </div>
      </div>
      <button type="button" onClick={onToggle} className={"relative inline-flex h-6 w-11 items-center rounded-full " + (on ? "bg-gray-900" : "bg-gray-300")}>
        <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform " + (on ? "translate-x-6" : "translate-x-1")} />
      </button>
    </div>
  );
}
function TagGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onToggle(opt)}
          className={"border rounded px-3 py-1 text-sm " + (selected.includes(opt) ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-700 hover:bg-gray-50")}>
          {opt}
        </button>
      ))}
    </div>
  );
}
function OptionCard({ id, emoji, label, desc, active, onClick }: { id: string; emoji: string; label: string; desc: string; active: boolean; onClick: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onClick(id)}
      className={"border rounded-lg p-4 flex flex-col items-center text-center gap-1 w-full " + (active ? "border-2 border-gray-900 bg-gray-50" : "border border-gray-200 hover:border-gray-400")}>
      <span className="text-2xl">{emoji}</span>
      <span className="text-sm font-medium text-gray-900">{label}</span>
      {desc && <span className="text-xs text-gray-500">{desc}</span>}
    </button>
  );
}

const sidebarSteps = [
  { id: 1, emoji: "🚀", label: "Vitaj", duration: "1 min" },
  { id: 2, emoji: "🏢", label: "Realitka", duration: "3 min" },
  { id: 3, emoji: "👤", label: "Profil", duration: "2 min" },
  { id: 4, emoji: "🤖", label: "AI Asistent", duration: "4 min" },
  { id: 5, emoji: "📋", label: "Import", duration: "3 min" },
  { id: 6, emoji: "🏗️", label: "Pipeline", duration: "2 min" },
  { id: 7, emoji: "🔗", label: "Prepojenia", duration: "2 min" },
  { id: 8, emoji: "🎯", label: "Ciele", duration: "1 min" },
  { id: 9, emoji: "✓", label: "Hotovo!", duration: "" },
];


export default function TestDbClient() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "", role: "", goals: [] as string[],
    agencyName: "", city: "", agentCount: "", monthlyLeads: "",
    currentCrm: [] as string[], pains: [] as string[],
    officePhone: "", website: "",
    phone: "", linkedin: "", bio: "",
    specializations: [] as string[], languages: ["Slovenčina"] as string[],
    aiName: "Sofia", aiTone: "💼 PROFESIONÁLNY", autoReply: true, workHours: false, leadScoring: true,
    importSource: "",
    pipelineToggles: { welcome: true, followUp: true, reminder: true, score: true, birthday: false },
    connections: [] as string[], primaryGoal: "",
    kpiLeads: 30, kpiDays: 45, kpiConversion: 15,
  });
  const [loading, setLoading] = useState(true);
  const sessionIdRef = useRef<string | null>(null);

  // --- Hydration on mount ---
  useEffect(() => {
    const hydrate = async () => {
      let sessionId = localStorage.getItem("onboarding_session_id");
      if (!sessionId) {
        setLoading(false);
        return;
      }
      sessionIdRef.current = sessionId;
      // Fetch from Supabase
      const { data, error } = await supabaseClient
        .from("onboarding_sessions")
        .select("step, form_data")
        .eq("session_id", sessionId)
        .single();
      if (data) {
        setStep(data.step || 1);
        setFormData(data.form_data || {});
      }
      setLoading(false);
    };
    hydrate();
  }, []);

  // --- Save progress to Supabase ---
  const saveProgress = async (nextStep: number, nextFormData: any) => {
    let sessionId = sessionIdRef.current;
    if (!sessionId) {
      sessionId = uuidv4();
      sessionIdRef.current = sessionId;
      localStorage.setItem("onboarding_session_id", sessionId);
    }
    const { error } = await supabaseClient
      .from("onboarding_sessions")
      .upsert([
        {
          session_id: sessionId,
          step: nextStep,
          form_data: nextFormData,
          updated_at: new Date().toISOString(),
        },
      ]);
    if (error) {
      showToast("Nepodarilo sa uložiť postup. Skúste znova neskôr.");
    }
  };

  // --- Step navigation ---
  const update = (fields: object) => setFormData(prev => ({ ...prev, ...fields }));
  const next = async () => {
    const nextStep = Math.min(step + 1, 9);
    setStep(nextStep);
    saveProgress(nextStep, formData);
  };
  const back = () => setStep(s => Math.max(s - 1, 1));
  const progress = ((step - 1) / 8) * 100;

  // --- On first step, ensure sessionId exists ---
  useEffect(() => {
    if (step === 1 && !sessionIdRef.current) {
      let sessionId = localStorage.getItem("onboarding_session_id");
      if (!sessionId) {
        sessionId = uuidv4();
        localStorage.setItem("onboarding_session_id", sessionId);
      }
      sessionIdRef.current = sessionId;
    }
  }, [step]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Načítavam...</div>;
  }

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="hidden lg:flex flex-col w-52 border-r border-gray-200 p-4 shrink-0">
        <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">POSTUP</div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-6">
          <div className="bg-gray-900 h-1.5 rounded-full" style={{ width: progress + "%" }} />
        </div>
        <nav className="space-y-1">
          {sidebarSteps.map(s => (
            <div key={s.id} className={"flex items-center gap-2 px-3 py-2 rounded-lg text-sm " + (s.id === step ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-400")}>
              <span>{s.emoji}</span>
              <span>{s.label}</span>
              {s.duration && <span className="ml-auto text-xs">{s.duration}</span>}
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-8 max-w-2xl">
        {step <= 8 && (
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">— KROK {step} ZO 8 —</p>
        )}

        {step === 1 && (
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Vitaj v Revolis.AI 🚀</h1>
            <p className="text-gray-600 mb-6">Nastav si účet za 15 minút. Potom nechaj AI pracovať za teba — 24/7, bez oddychu.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tvoje meno *</label>
              <input className="border border-gray-300 rounded-lg px-3 py-2 w-full text-base" placeholder="Napr. Tomáš Novák" value={formData.name} onChange={e => update({ name: e.target.value })} />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-3">Si v realitách ako...</p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { id: "owner", emoji: "🏛️", label: "Majiteľ kancelárie", desc: "Vediem agentúru / tím" },
                { id: "agent", emoji: "💛", label: "Samostatný maklér", desc: "Pracujem sám alebo pre kanceláriu" },
                { id: "manager", emoji: "⚙️", label: "Office Manager", desc: "Spravujem systémy a tím" },
              ].map(c => (
                <OptionCard key={c.id} {...c} active={formData.role === c.id} onClick={id => update({ role: id })} />
              ))}
            </div>
            <p className="text-sm font-medium text-gray-700 mb-3">Čo chceš dosiahnuť s Revolis? (vyber čo platí)</p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { id: "leads", emoji: "📊", label: "Viac leadov", desc: "Automaticky z portálov a webu" },
                { id: "ai247", emoji: "🤖", label: "AI predaj 24/7", desc: "Asistent odpovedá za mňa" },
                { id: "close", emoji: "⚡", label: "Rýchlejšie uzatváranie", desc: "Skrátiť čas deal → zmluva" },
                { id: "analytics", emoji: "📈", label: "Analytika & prehľad", desc: "Viem čo funguje a čo nie" },
                { id: "team", emoji: "👥", label: "Riadenie tímu", desc: "Prehľad nad celým tímom" },
                { id: "auto", emoji: "🔄", label: "Menej manuálnej práce", desc: "Automatické follow-upy" },
              ].map(c => (
                <OptionCard key={c.id} {...c} active={formData.goals.includes(c.id)} onClick={id => update({ goals: formData.goals.includes(id) ? formData.goals.filter(g => g !== id) : [...formData.goals, id] })} />
              ))}
            </div>
            <InfoBox>💡 Prečo Revolis nie je len ďalší CRM: Väčšina maklérov stráca 60% leadov len preto, že neodpíše dosť rýchlo. Revolis AI odpovedá do 30 sekúnd — 24 hodín denne, 7 dní v týždni.</InfoBox>
            <PrimaryBtn onClick={next}>Začať nastavenie →</PrimaryBtn>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Nastav svoju realitku 🏢</h1>
            <p className="text-gray-600 mb-6">Tieto info použijeme na personalizáciu AI asistenta a všetkých komunikácií smerom ku klientom.</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Názov realitnej kancelárie *</label>
                <input className="border border-gray-300 rounded-lg px-3 py-2 w-full" placeholder="Napr. Reality Novák s.r.o." value={formData.agencyName} onChange={e => update({ agencyName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mesto / región *</label>
                <input className="border border-gray-300 rounded-lg px-3 py-2 w-full" placeholder="Napr. Bratislava" value={formData.city} onChange={e => update({ city: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Počet maklérov v tíme</label>
                <select className="border border-gray-300 rounded-lg px-3 py-2 w-full" value={formData.agentCount} onChange={e => update({ agentCount: e.target.value })}>
                  <option value="">Vyber...</option>
                  <option>1</option><option>2-5</option><option>6-10</option><option>11-20</option><option>20+</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mesačný počet leadov (odhadom)</label>
                <select className="border border-gray-300 rounded-lg px-3 py-2 w-full" value={formData.monthlyLeads} onChange={e => update({ monthlyLeads: e.target.value })}>
                  <option value="">Vyber...</option>
                  <option>1-10</option><option>11-30</option><option>31-60</option><option>60+</option>
                </select>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-2">Čo momentálne používate (CRM / systém)?</p>
            <div className="mb-4">
              <TagGroup options={["Nič / Excel", "Nehnuteľnosti.sk CRM", "Reality.sk systém", "Vlastné riešenie", "HubSpot", "Iné"]} selected={formData.currentCrm} onToggle={v => update({ currentCrm: formData.currentCrm.includes(v) ? formData.currentCrm.filter(x => x !== v) : [...formData.currentCrm, v] })} />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-2">Hlavné bolesti (vyber čo vás trápi)</p>
            <div className="mb-4">
              <TagGroup options={["Leady sa strácajú", "Pomalé odpovedanie", "Žiadna analytika", "Manuálne follow-upy", "Zlá spolupráca v tíme", "Drahá reklama bez výsledkov", "Ťažká správa zákazníkov", "Nedostatok času"]} selected={formData.pains} onToggle={v => update({ pains: formData.pains.includes(v) ? formData.pains.filter(x => x !== v) : [...formData.pains, v] })} />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefón kancelárie</label>
                <input className="border border-gray-300 rounded-lg px-3 py-2 w-full" placeholder="+421 XXX XXX XXX" value={formData.officePhone} onChange={e => update({ officePhone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Web stránka</label>
                <input className="border border-gray-300 rounded-lg px-3 py-2 w-full" placeholder="https://vasarealitka.sk" value={formData.website} onChange={e => update({ website: e.target.value })} />
              </div>
            </div>
            <InfoBox>🔒 Vaše dáta sú bezpečné. Používame ich výhradne na personalizáciu vášho AI asistenta a nikdy ich nepredávame tretím stranám.</InfoBox>
            <div className="flex gap-3"><SecondaryBtn onClick={back}>← Späť</SecondaryBtn><PrimaryBtn onClick={next}>Pokračovať →</PrimaryBtn></div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Tvoj profil makléra 👤</h1>
            <p className="text-gray-600 mb-6">Klienti ťa spoznajú cez tvoj AI asistent. Čím lepší profil, tým dôveryhodnejší prvý dojem.</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefón *</label>
                <input className="border border-gray-300 rounded-lg px-3 py-2 w-full" placeholder="+421 XXX XXX XXX" value={formData.phone} onChange={e => update({ phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn profil</label>
                <input className="border border-gray-300 rounded-lg px-3 py-2 w-full" placeholder="linkedin.com/in/tvoje-meno" value={formData.linkedin} onChange={e => update({ linkedin: e.target.value })} />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Krátke bio (zobrazí sa klientom)</label>
              <textarea className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm" rows={4} placeholder="Napr: Pomáhám rodinám nájsť domov v Bratislave od roku 2015. Špecializujem sa na nové byty a rodinné domy..." value={formData.bio} onChange={e => update({ bio: e.target.value })} />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-2">Špecializácia</p>
            <div className="mb-4">
              <TagGroup options={["Byty", "Rodinné domy", "Luxusné nehnuteľnosti", "Komerčné priestory", "Pôda", "Novostavby", "Investície", "Prenájom"]} selected={formData.specializations} onToggle={v => update({ specializations: formData.specializations.includes(v) ? formData.specializations.filter(x => x !== v) : [...formData.specializations, v] })} />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-2">Jazyky komunikácie</p>
            <div className="mb-4">
              <TagGroup options={["Slovenčina", "Čeština", "Angličtina", "Nemčina", "Ruština", "Maďarčina"]} selected={formData.languages} onToggle={v => update({ languages: formData.languages.includes(v) ? formData.languages.filter(x => x !== v) : [...formData.languages, v] })} />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-2">Fotografia profilu</p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4 cursor-pointer hover:border-gray-400">
              <div className="text-3xl mb-2">📷</div>
              <p className="text-sm font-medium text-gray-700">Nahraj svoju profilovú fotku</p>
              <p className="text-xs text-gray-500">PNG, JPG do 5MB — lepšia foto = viac dôvery od klientov</p>
            </div>
            <div className="flex gap-3"><SecondaryBtn onClick={back}>← Späť</SecondaryBtn><PrimaryBtn onClick={next}>Pokračovať →</PrimaryBtn></div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Nakonfiguruj AI asistenta 🤖</h1>
            <p className="text-gray-600 mb-6">Toto je srdce Revolisu. Tvoj AI obchodník bude pracovať za teba non-stop. Nastav mu osobnosť a správanie.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Meno tvojho AI asistenta</label>
              <input className="border border-gray-300 rounded-lg px-3 py-2 w-full" value={formData.aiName} onChange={e => update({ aiName: e.target.value })} />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-2">Tón komunikácie AI</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {["💼 PROFESIONÁLNY", "😊 PRIATEĽSKÝ", "✨ LUXUSNÝ", "⚡ ENERGICKÝ", "🎩 FORMÁLNY"].map(tone => (
                <button key={tone} type="button" onClick={() => update({ aiTone: tone })} className={"rounded-lg px-3 py-2 text-xs font-medium " + (formData.aiTone === tone ? "border-2 border-gray-900 bg-gray-50 text-gray-900" : "border border-gray-200 text-gray-600 hover:bg-gray-50")}>{tone}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primárny jazyk</label>
                <select className="border border-gray-300 rounded-lg px-3 py-2 w-full">
                  <option>sk Slovenčina</option><option>cs Čeština</option><option>en Angličtina</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Oneskorenie auto-odpovede</label>
                <select className="border border-gray-300 rounded-lg px-3 py-2 w-full">
                  <option>5 minút (odporúčané)</option><option>Okamžite</option><option>15 minút</option><option>30 minút</option>
                </select>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg px-4 mb-4">
              <Toggle emoji="🤖" label="Automatické odpovedanie" desc="AI odpovedá na každý dotaz automaticky bez tvojho zásahu." on={formData.autoReply} onToggle={() => update({ autoReply: !formData.autoReply })} />
              <Toggle emoji="🕐" label="Pracovné hodiny" desc="AI odpovedá len počas pracovných hodín (napr. 8:00–18:00)." on={formData.workHours} onToggle={() => update({ workHours: !formData.workHours })} />
              <Toggle emoji="⭐" label="Smart lead scoring" desc="AI automaticky hodnotí pripravenosť leadov a upozorní na top prioritné." on={formData.leadScoring} onToggle={() => update({ leadScoring: !formData.leadScoring })} />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg">🤖</div>
                <div>
                  <div className="font-medium text-sm">{formData.aiName}</div>
                  <div className="text-xs text-green-600">● Online — odpovedá za 5 min</div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                Dobrý deň! Som {formData.aiName}, digitálny asistent našej realitnej kancelárie. Rád vám pomôžem nájsť nehnuteľnosť podľa vašich predstáv. Čo práve hľadáte?
              </div>
            </div>
            <InfoBox>⚡ Výsledok maklérov s Revolis AI: Priemerná odpoveď na lead za 2 min (vs. 4 hodiny manuálne). Konverzný pomer leadov +34%.</InfoBox>
            <div className="flex gap-3"><SecondaryBtn onClick={back}>← Späť</SecondaryBtn><PrimaryBtn onClick={next}>Generovať AI & pokračovať →</PrimaryBtn></div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Import kontaktov & leadov 📋</h1>
            <p className="text-gray-600 mb-6">Presuň existujúce kontakty do Revolis. Môžeš to spraviť teraz alebo neskôr — systém bude fungovať aj bez importu.</p>
            <p className="text-sm font-medium text-gray-700 mb-3">Odkiaľ chceš importovať?</p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { id: "csv", emoji: "📊", label: "CSV / Excel", desc: "Vlastný súbor" },
                { id: "nhsk", emoji: "🏠", label: "Nehnuteľnosti.sk", desc: "Export z portálu" },
                { id: "resk", emoji: "🏠", label: "Reality.sk", desc: "Export z portálu" },
                { id: "topre", emoji: "⭐", label: "TopReality.sk", desc: "Export z portálu" },
                { id: "manual", emoji: "✏️", label: "Manuálne", desc: "Pridám neskôr ručne" },
                { id: "skip", emoji: "⏩", label: "Preskočiť", desc: "Začnem od nuly" },
              ].map(c => (
                <OptionCard key={c.id} {...c} active={formData.importSource === c.id} onClick={id => update({ importSource: id })} />
              ))}
            </div>
            <InfoBox>💡 Tip: Aj 20 starých kontaktov môže priniesť okamžité výsledky. Revolis AI automaticky osloví všetkých nevybavených leadov s personalizovanou správou.</InfoBox>
            <div className="flex gap-3">
              <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
              <SecondaryBtn onClick={next}>Preskočiť na neskôr</SecondaryBtn>
              <PrimaryBtn onClick={next}>Pokračovať →</PrimaryBtn>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Predajný pipeline 🏗️</h1>
            <p className="text-gray-600 mb-6">Revolis má prednastavený pipeline pre reality. Môžeš ho prispôsobiť alebo použiť tak ako je.</p>
            <p className="text-sm font-medium text-gray-700 mb-2">Fázy predaja</p>
            <div className="space-y-2 mb-6">
              {["1. Nový lead", "2. Kontaktovaný", "3. Kvalifikovaný", "4. Prehliadka", "5. Ponuka", "6. Rokovanie", "7. Zmluva"].map(stage => (
                <div key={stage} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                    <span className="text-sm font-medium text-gray-900">{stage}</span>
                  </div>
                  <span className="text-xs text-gray-500">0 leadov</span>
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-gray-700 mb-2">Automatické akcie (zapni čo chceš)</p>
            <div className="border border-gray-200 rounded-lg px-4 mb-4">
              <Toggle emoji="📩" label="Auto-uvítacia správa pre nový lead" desc="" on={formData.pipelineToggles.welcome} onToggle={() => update({ pipelineToggles: { ...formData.pipelineToggles, welcome: !formData.pipelineToggles.welcome } })} />
              <Toggle emoji="📅" label="Follow-up ak 3 dni bez odpovede" desc="" on={formData.pipelineToggles.followUp} onToggle={() => update({ pipelineToggles: { ...formData.pipelineToggles, followUp: !formData.pipelineToggles.followUp } })} />
              <Toggle emoji="🏠" label="Pripomienka prehliadky 1 deň vopred" desc="" on={formData.pipelineToggles.reminder} onToggle={() => update({ pipelineToggles: { ...formData.pipelineToggles, reminder: !formData.pipelineToggles.reminder } })} />
              <Toggle emoji="⭐" label="Upozornenie keď lead dosiahne skóre 75+" desc="" on={formData.pipelineToggles.score} onToggle={() => update({ pipelineToggles: { ...formData.pipelineToggles, score: !formData.pipelineToggles.score } })} />
              <Toggle emoji="🎂" label="Gratulácia klientovi k narodeninám" desc="" on={formData.pipelineToggles.birthday} onToggle={() => update({ pipelineToggles: { ...formData.pipelineToggles, birthday: !formData.pipelineToggles.birthday } })} />
            </div>
            <InfoBox>⚡ Makléri s automatickými follow-upmi uzatvoria o 27% viac obchodov. Revolis posiela správy v optimálnom čase automaticky.</InfoBox>
            <div className="flex gap-3"><SecondaryBtn onClick={back}>← Späť</SecondaryBtn><PrimaryBtn onClick={next}>Pokračovať →</PrimaryBtn></div>
          </div>
        )}

        {step === 7 && (
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Prepoj nástroje 🔗</h1>
            <p className="text-gray-600 mb-6">Spoj Revolis s nástrojmi, ktoré už používaš. Každé prepojenie ti ušetrí hodiny manuálnej práce.</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { emoji: "🏠", name: "Nehnuteľnosti.sk", desc: "Import leadov & inzeráty" },
                { emoji: "🏠", name: "Reality.sk", desc: "Import leadov & inzeráty" },
                { emoji: "⭐", name: "TopReality.sk", desc: "Import leadov" },
                { emoji: "📅", name: "Google Calendar", desc: "Synchronizácia prehliadok" },
                { emoji: "💬", name: "WhatsApp Business", desc: "AI komunikácia cez WA" },
                { emoji: "📧", name: "Gmail", desc: "Email integrácia" },
                { emoji: "📘", name: "Facebook Leads", desc: "Meta Lead Ads" },
                { emoji: "💬", name: "Slack / Teams", desc: "Notifikácie pre tím" },
              ].map(i => (
                <div key={i.name} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{i.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{i.name}</p>
                      <p className="text-xs text-gray-500">{i.desc}</p>
                    </div>
                  </div>
                  <button type="button" className="border border-gray-300 rounded px-3 py-1.5 text-xs font-medium hover:bg-gray-50 cursor-pointer">Pripojiť</button>
                </div>
              ))}
            </div>
            <InfoBox>ℹ️ Prepojenia môžeš kedykoľvek pridať aj v nastaveniach. Pre WhatsApp a portály potrebuješ API kľúč — náš tím ti pomôže s nastavením.</InfoBox>
            <div className="flex gap-3">
              <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
              <button type="button" onClick={next} className="text-gray-500 text-sm px-4 py-2 hover:text-gray-700">Preskočiť</button>
              <PrimaryBtn onClick={next}>Pokračovať →</PrimaryBtn>
            </div>
          </div>
        )}

        {step === 8 && (
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Definuj svoje ciele 🎯</h1>
            <p className="text-gray-600 mb-6">Revolis prispôsobí AI odporúčania a analytiku podľa tvojich cieľov. Kde chceš byť o 6 mesiacov?</p>
            <p className="text-sm font-medium text-gray-700 mb-3">Primárny cieľ</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { id: "leads", emoji: "📊", label: "Získať viac leadov", desc: "Chcem viac záujemcov mesačne" },
                { id: "close", emoji: "⚡", label: "Rýchlejšie zatváranie", desc: "Skrátiť čas od kontaktu po zmluvu" },
                { id: "auto", emoji: "🤖", label: "Automatizovať prácu", desc: "Menej manuálnych úloh a viac priestoru" },
                { id: "analytics", emoji: "📈", label: "Lepšia analytika", desc: "Vidieť čo funguje, kde sa strácajú leady" },
              ].map(c => (
                <OptionCard key={c.id} {...c} active={formData.primaryGoal === c.id} onClick={id => update({ primaryGoal: id })} />
              ))}
            </div>
            <p className="text-sm font-medium text-gray-700 mb-3">Cieľové KPI (nastav čísla)</p>
            <div className="border border-gray-200 rounded-lg p-4 space-y-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-36"><p className="text-sm font-medium text-gray-900">Leadov mesačne</p></div>
                <input type="range" min={1} max={100} value={formData.kpiLeads} onChange={e => update({ kpiLeads: Number(e.target.value) })} className="flex-1" />
                <span className="text-sm font-bold w-8 text-right">{formData.kpiLeads}</span>
                <button type="button" className="text-xs border border-gray-300 rounded px-2 py-1">Nastaviť</button>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-36"><p className="text-sm font-medium text-gray-900">Dní do uzavretia</p></div>
                <input type="range" min={1} max={180} value={formData.kpiDays} onChange={e => update({ kpiDays: Number(e.target.value) })} className="flex-1" />
                <span className="text-sm font-bold w-8 text-right">{formData.kpiDays}</span>
                <span className="text-xs text-gray-500">dní</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-36"><p className="text-sm font-medium text-gray-900">Konverzný pomer</p></div>
                <input type="range" min={1} max={100} value={formData.kpiConversion} onChange={e => update({ kpiConversion: Number(e.target.value) })} className="flex-1" />
                <span className="text-sm font-bold w-8 text-right">{formData.kpiConversion}</span>
                <span className="text-xs text-gray-500">%</span>
              </div>
            </div>
            <InfoBox>🚀 Revolis bude merať tvoj pokrok voči týmto cieľom a každý týždeň ti pošle report s odporúčaniami čo zlepšiť.</InfoBox>
            <div className="flex gap-3"><SecondaryBtn onClick={back}>← Späť</SecondaryBtn><PrimaryBtn onClick={next}>Spustiť Revolis.AI</PrimaryBtn></div>
          </div>
        )}

        {step === 9 && (
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Revolis.AI je živý!</h1>
            <p className="text-gray-600 mb-8">Tvoj AI asistent Sofia je aktívny a čaká na prvý lead.</p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[["24/7", "AI asistent aktívny"], ["0", "Kontaktov importovaných"], ["0", "Freqení aktívnych"], ["7", "Automatizácií zapnutých"], ["<2min", "AI čas odpovede"], ["+34%", "Priemerný nárast konverzií"]].map(([val, lbl]) => (
                <div key={lbl} className="border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{val}</p>
                  <p className="text-xs text-gray-500 mt-1">{lbl}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3 mb-8">
              {[
                { emoji: "📊", title: "Pozri si dashboard", desc: "Prehľad leadov, pipeline a štatistiky", btn: "Otvoriť dashboard →" },
                { emoji: "🤖", title: "Otestuj AI asistenta", desc: "Pošli testovaciu správu a pozri ako odpovedá", btn: "Otestovať →" },
                { emoji: "➕", title: "Pridaj prvý lead", desc: "Vyskúšaj manuálne alebo cez import z portálu", btn: "Pridať lead →" },
              ].map(c => (
                <div key={c.title} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{c.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.title}</p>
                      <p className="text-xs text-gray-500">{c.desc}</p>
                    </div>
                  </div>
                  <button type="button" className="text-sm text-gray-600 hover:text-gray-900 font-medium">{c.btn}</button>
                </div>
              ))}
            </div>
            <button type="button" className="bg-gray-900 text-white px-8 py-3 rounded-lg text-base font-medium hover:bg-gray-700 w-full">
              🚀 Prejsť do Revolis.AI Dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
