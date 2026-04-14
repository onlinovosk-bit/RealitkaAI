"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { AI_ASSISTANT_NAME } from "@/lib/ai-brand";

// --- UI Kit Components ---


function PrimaryBtn({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 w-full md:w-auto transition-all active:scale-95">{children}</button>;
}

function SecondaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all">{children}</button>;
}

function TagGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  const safeSelected = Array.isArray(selected) ? selected : [];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onToggle(opt)}
          className={"border rounded-full px-4 py-1.5 text-sm transition-all " + (safeSelected.includes(opt) ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-700 hover:bg-gray-50")}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function OptionCard({ id, emoji, label, desc, active, onClick }: { id: string; emoji: string; label: string; desc: string; active: boolean; onClick: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onClick(id)}
      className={"border rounded-xl p-4 flex flex-col items-center text-center gap-1 w-full transition-all " + (active ? "border-2 border-gray-900 bg-gray-50 scale-[1.02]" : "border border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100")}>
      <span className="text-2xl mb-1">{emoji}</span>
      <span className="text-sm font-bold text-gray-900">{label}</span>
      {desc && <span className="text-[10px] text-gray-500 leading-tight">{desc}</span>}
    </button>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={"relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors " + (value ? "bg-blue-600" : "bg-gray-200")}>
      <span className={"inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform " + (value ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}

const sidebarSteps = [
  { id: 1, emoji: "🚀", label: "Vitaj" },
  { id: 2, emoji: "🏢", label: "Realitka" },
  { id: 3, emoji: "👤", label: "Profil" },
  { id: 4, emoji: "🤖", label: "AI Asistent" },
  { id: 5, emoji: "📋", label: "Import" },
  { id: 6, emoji: "🏗️", label: "Stav klientov" },
  { id: 7, emoji: "🔗", label: "Prepojenia" },
  { id: 8, emoji: "🎯", label: "Ciele" },
];

const PIPELINE_STAGES = [
  "1. Nový lead",
  "2. Kontaktovaný",
  "3. Kvalifikovaný",
  "4. Prehliadka",
  "5. Ponuka",
  "6. Rokovanie",
  "7. Zmluva",
];

const STAGE_COLORS = [
  "bg-blue-500", "bg-cyan-500", "bg-violet-500",
  "bg-orange-400", "bg-yellow-400", "bg-orange-500", "bg-green-500",
];

export default function TestDbClient() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Krok 1
    name: "", role: "",
    // Krok 2
    agencyName: "", city: "",
    // Krok 3
    phone: "", linkedin: "", bio: "",
    specializations: [] as string[],
    // Krok 4
    aiName: AI_ASSISTANT_NAME, aiTone: "💼 PROFESIONÁLNY",
    autoReply: true, workHours: false, leadScoring: true,
    // Krok 5
    importSource: "",
    // Krok 6
    automation: { welcome: true, followUp: true, reminder: true, score: true, birthday: false },
    // Krok 7
    connectedTools: [] as string[],
    // Krok 8
    primaryGoal: "",
    kpiLeads: 30, kpiDays: 45, kpiConversion: 15,
  });
  const [loading, setLoading] = useState(true);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const hydrate = async () => {
      const savedId = typeof window !== "undefined" ? localStorage.getItem("onboarding_session_id") : null;
      const sessionId = savedId ?? "";
      if (!sessionId) { setLoading(false); return; }
      sessionIdRef.current = sessionId;
      const { data } = await supabaseClient
        .from("onboarding_sessions")
        .select("step, form_data")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (data) {
        setStep(data.step || 1);
        if (data.form_data) setFormData(prev => ({ ...prev, ...data.form_data }));
      }
      setLoading(false);
    };
    hydrate();
  }, []);

  const saveProgress = async (nextStep: number, nextFormData: object) => {
    let sessionId = sessionIdRef.current;
    if (!sessionId) {
      sessionId = uuidv4();
      sessionIdRef.current = sessionId;
      localStorage.setItem("onboarding_session_id", sessionId);
    }
    // Persist to localStorage always (works offline / without DB table)
    localStorage.setItem("onboarding_step", String(nextStep));
    localStorage.setItem("onboarding_data", JSON.stringify(nextFormData));
    // Try Supabase sync — silently skip if table doesn't exist or RLS blocks
    try {
      await supabaseClient
        .from("onboarding_sessions")
        .upsert({ session_id: sessionId, step: nextStep, form_data: nextFormData, updated_at: new Date().toISOString() });
    } catch {
      // Supabase sync unavailable — localStorage is source of truth
    }
  };

  const update = (fields: object) => setFormData(prev => ({ ...prev, ...fields }));

  const next = async () => {
    const nextStep = Math.min(step + 1, 9);
    setStep(nextStep);
    await saveProgress(nextStep, formData);
    window.scrollTo(0, 0);
  };

  const back = () => { setStep(s => Math.max(s - 1, 1)); window.scrollTo(0, 0); };

  // Progress bar percentage (sidebar uses 8 real steps, step 9 = done)
  const progressPct = Math.round(((step - 1) / 8) * 100);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-white text-gray-400 font-medium animate-pulse">
      Inicializácia Revolis OS...
    </div>
  );

  return (
    <div className="flex min-h-screen bg-white text-gray-900 font-sans">

      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-gray-100 p-6 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 bg-gray-900 rounded-md flex items-center justify-center text-white font-bold text-base">R</div>
          <span className="font-bold text-sm tracking-tight">Revolis.AI</span>
          <span className="ml-1 text-[9px] border border-gray-300 rounded px-1 text-gray-400 font-medium">BETA</span>
        </div>

        {/* Progress bar */}
        <div className="mb-6 mt-3">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>POSTUP</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gray-900 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <nav className="space-y-1">
          {sidebarSteps.map(s => (
            <div key={s.id} className={"flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm " +
              (s.id === step ? "bg-gray-900 text-white font-semibold" :
               s.id < step ? "text-gray-500" : "text-gray-300")}>
              <span className={s.id <= step ? "" : "grayscale opacity-40"}>{s.emoji}</span>
              <span>{s.label}</span>
              {s.id < step && <span className="ml-auto text-green-500 text-xs">✓</span>}
            </div>
          ))}
          <div className={"flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm " + (step === 9 ? "bg-gray-900 text-white font-semibold" : "text-gray-300")}>
            <span className={step >= 9 ? "" : "grayscale opacity-40"}>✅</span>
            <span>Hotovo!</span>
          </div>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 px-8 py-10 md:px-16 md:py-14 max-w-2xl mx-auto overflow-y-auto">

        {/* KROK 1: VITAJ */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">— KROK 1 ZO 8 —</p>
            <h1 className="text-4xl font-bold mb-3 tracking-tight">Vitaj v Revolis.AI 🚀</h1>
            <p className="text-gray-500 mb-10">Nastav si účet za 15 minút. Potom nechaj AI pracovať za teba — 24/7, bez oddychu.</p>
            <div className="space-y-6 max-w-md">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Tvoje meno *</label>
                <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900 text-base transition-all" value={formData.name} onChange={e => update({ name: e.target.value })} placeholder="Napr. Tomáš Novák" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-3">Si v realitách ako...</label>
                <div className="grid grid-cols-3 gap-3">
                  <OptionCard id="owner" emoji="🏛️" label="Majiteľ kancelárie" desc="Vediem agentúru / tím" active={formData.role === "owner"} onClick={id => update({ role: id })} />
                  <OptionCard id="agent" emoji="💛" label="Samostatný maklér" desc="Pracujem sám alebo pre kanceláriu" active={formData.role === "agent"} onClick={id => update({ role: id })} />
                  <OptionCard id="manager" emoji="⚙️" label="Office Manager" desc="Spravujem systémy a tím" active={formData.role === "manager"} onClick={id => update({ role: id })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-3">Čo chceš dosiahnuť s Revolis? (vyber čo platí)</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "leads", emoji: "📈", label: "Viac leadov", desc: "Automaticky z portálov a webu" },
                    { id: "ai", emoji: "🤖", label: "AI predaj 24/7", desc: "Asistent odpovedá za mňa" },
                    { id: "fast", emoji: "⚡", label: "Rýchlejšie uzatváranie", desc: "Skrátiť čas deal → zmluva" },
                    { id: "analytics", emoji: "📊", label: "Analytika & prehľad", desc: "Viem čo funguje a čo nie" },
                    { id: "team", emoji: "👥", label: "Riadenie tímu", desc: "Prehľad nad celým tímom" },
                    { id: "automation", emoji: "🔄", label: "Menej manuálnej práce", desc: "Automatické follow-upy" },
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
        )}

        {/* KROK 2: REALITKA */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">— KROK 2 ZO 8 —</p>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Nastav svoju realitku 🏢</h1>
            <p className="text-gray-500 mb-8">Tieto info použijeme na personalizáciu AI asistenta a všetkých komunikácií smerom ku klientom.</p>
            <div className="space-y-6 max-w-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Názov realitnej kancelárie *</label>
                  <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900" value={formData.agencyName} onChange={e => update({ agencyName: e.target.value })} placeholder="Napr. Reality Novák s.r.o." />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Mesto / región *</label>
                  <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900" value={formData.city} onChange={e => update({ city: e.target.value })} placeholder="Napr. Bratislava" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-3">Čo momentálne používate (CRM / systém)?</label>
                <TagGroup
                  options={["Nič / Excel", "Nehnuteľnosti.sk CRM", "Reality.sk systém", "Vlastné riešenie", "HubSpot", "Iné"]}
                  selected={formData.specializations}
                  onToggle={v => {
                    const curr = formData.specializations || [];
                    update({ specializations: curr.includes(v) ? curr.filter((x: string) => x !== v) : [...curr, v] });
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-3">Hlavné bolesti (vyber čo vás trápi)</label>
                <TagGroup
                  options={["Leady sa strácajú", "Pomalé odpovedanie", "Žiadna analytika", "Manuálne follow-upy", "Zlá spolupráca v tíme", "Drahá reklama bez výsledkov", "Ťažká správa zákazníkov", "Nedostatok času"]}
                  selected={Array.isArray(formData.bio) ? formData.bio : []}
                  onToggle={v => {
                    const curr = Array.isArray(formData.bio) ? formData.bio : [];
                    update({ bio: (curr as string[]).includes(v) ? (curr as string[]).filter(x => x !== v) : [...(curr as string[]), v] });
                  }}
                />
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-500">
                🔒 Vaše dáta sú bezpečné. Používame ich výhradne na personalizáciu vášho AI asistenta a nikdy ich nepredávame tretím stranám.
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
              <PrimaryBtn disabled={!formData.agencyName || !formData.city} onClick={next}>Pokračovať →</PrimaryBtn>
            </div>
          </div>
        )}

        {/* KROK 3: PROFIL MAKLÉRA */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">— KROK 3 ZO 8 —</p>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Tvoj profil makléra 👤</h1>
            <p className="text-gray-500 mb-8">Klienti ťa spoznajú cez tvoj AI asistent. Čím lepší profil, tým dôveryhodnejší prvý dojem.</p>
            <div className="space-y-6 max-w-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Telefón *</label>
                  <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900" value={formData.phone} onChange={e => update({ phone: e.target.value })} placeholder="+421 XXX XXX XXX" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">LinkedIn profil</label>
                  <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900" value={formData.linkedin} onChange={e => update({ linkedin: e.target.value })} placeholder="linkedin.com/in/tvoje-meno" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Krátke bio (zobrazí sa klientom)</label>
                <textarea rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900 resize-none" value={typeof formData.bio === "string" ? formData.bio : ""} onChange={e => update({ bio: e.target.value })} placeholder="Napr: Pomáham rodinám nájsť domov v Bratislave od roku 2015. Špecializujem sa na nové byty a rodinné domy..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-3">Špecializácia</label>
                <TagGroup
                  options={["Byty", "Rodinné domy", "Luxusné nehnuteľnosti", "Komerčné priestory", "Pôda", "Novostavby", "Investície", "Prenájom"]}
                  selected={Array.isArray(formData.specializations) ? formData.specializations : []}
                  onToggle={v => {
                    const curr = Array.isArray(formData.specializations) ? formData.specializations : [];
                    update({ specializations: curr.includes(v) ? curr.filter((x: string) => x !== v) : [...curr, v] });
                  }}
                />
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
              <PrimaryBtn onClick={next}>Pokračovať →</PrimaryBtn>
            </div>
          </div>
        )}

        {/* KROK 4: AI ASISTENT */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">— KROK 4 ZO 8 — KĽÚČOVÝ KROK</p>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Nakonfiguruj AI asistenta 🤖</h1>
            <p className="text-gray-500 mb-8">Toto je srdce Revolisu. Tvoj AI obchodník bude pracovať za teba non-stop. Nastav mu osobnosť a správanie.</p>
            <div className="space-y-6 max-w-lg">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Meno tvojho AI asistenta</label>
                <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900" value={formData.aiName} onChange={e => update({ aiName: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-3">Tón komunikácie AI</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "💼 PROFESIONÁLNY", emoji: "💼" },
                    { id: "😊 PRIATEĽSKÝ", emoji: "😊" },
                    { id: "✨ LUXUSNÝ", emoji: "✨" },
                    { id: "⚡ ENERGICKÝ", emoji: "⚡" },
                    { id: "🎩 FORMÁLNY", emoji: "🎩" },
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
                  { key: "autoReply", emoji: "🤖", label: "Automatické odpovedanie", desc: "AI odpovedá na každý dotaz automaticky bez tvojho zásahu." },
                  { key: "workHours", emoji: "🕐", label: "Pracovné hodiny", desc: "AI odpovedá len počas pracovných hodín (napr. 8:00–18:00)." },
                  { key: "leadScoring", emoji: "⭐", label: "Smart lead scoring", desc: "AI automaticky hodnotí pripravenosť leadov a upozorní na top prioritné." },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5">{item.emoji}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.label}</div>
                        <div className="text-xs text-gray-500">{item.desc}</div>
                      </div>
                    </div>
                    <Toggle value={(formData as Record<string, unknown>)[item.key] as boolean}
                      onChange={v => update({ [item.key]: v })} />
                  </div>
                ))}
              </div>
              {/* AI preview */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-base">🤖</div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{formData.aiName}</div>
                    <div className="text-xs text-green-600">● Online — odpovedá za 5 min</div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700">
                  Dobrý deň! Som {formData.aiName}, digitálny asistent našej realitnej kancelárie. Rád vám pomôžem nájsť nehnuteľnosť podľa vašich predstáv. Čo práve hľadáte?
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-gray-600">
                ⚡ <strong>Výsledok maklérov s Revolis AI:</strong> Priemerná odpoveď na lead za 2 min (vs. 4 hodiny manuálne). Konverzný pomer leadov +34%.
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
              <PrimaryBtn onClick={next}>Generovať AI & pokračovať →</PrimaryBtn>
            </div>
          </div>
        )}

        {/* KROK 5: IMPORT */}
        {step === 5 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">— KROK 5 ZO 8 — VOLITEĽNÝ</p>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Import kontaktov & leadov 📋</h1>
            <p className="text-gray-500 mb-8">Presuň existujúce kontakty do Revolisu. Môžeš to spraviť teraz alebo neskôr — systém bude fungovať aj bez importu.</p>

            <div className="mb-3 text-sm font-semibold text-gray-700">Odkiaľ chceš importovať?</div>
            <div className="grid grid-cols-3 gap-4 max-w-lg mb-6">
              {[
                { id: "csv", emoji: "📊", label: "CSV / Excel", desc: "Vlastný súbor" },
                { id: "nehnutelnosti", emoji: "🏠", label: "Nehnuteľnosti.sk", desc: "Export z portálu" },
                { id: "reality", emoji: "🏠", label: "Reality.sk", desc: "Export z portálu" },
                { id: "topreality", emoji: "⭐", label: "TopReality.sk", desc: "Export z portálu" },
                { id: "manual", emoji: "✏️", label: "Manuálne", desc: "Pridám neskôr ručne" },
                { id: "skip", emoji: "⏩", label: "Preskočiť", desc: "Začnem od nuly" },
              ].map(opt => (
                <button key={opt.id} type="button" onClick={() => update({ importSource: opt.id })}
                  className={"border rounded-xl p-5 flex flex-col items-center text-center gap-2 transition-all " +
                    (formData.importSource === opt.id
                      ? "border-2 border-gray-900 bg-gray-50"
                      : "border-gray-200 hover:border-gray-400")}>
                  <span className="text-3xl">{opt.emoji}</span>
                  <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
                  <span className="text-[11px] text-gray-400">{opt.desc}</span>
                </button>
              ))}
            </div>

            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-gray-600 max-w-lg">
              💡 <strong>Tip:</strong> Aj 20 starých kontaktov môže priniesť okamžité výsledky. Revolis AI automaticky osloví všetkých nevybavených leadov s personalizovanou správou.
            </div>

            <div className="mt-8 flex items-center gap-4 flex-wrap">
              <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
              <button type="button" onClick={next} className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2">
                Preskočiť na neskôr
              </button>
              <PrimaryBtn onClick={next}>Pokračovať →</PrimaryBtn>
            </div>
          </div>
        )}

        {/* KROK 6: PIPELINE */}
        {step === 6 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">— KROK 6 ZO 8 —</p>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Predajný stav klientov 🏗️</h1>
            <p className="text-gray-500 mb-8">Revolis má prednastavený stav klientov pre reality. Môžeš ho prispôsobiť alebo použiť tak ako je.</p>

            <div className="mb-2 text-sm font-semibold text-gray-700">Fázy predaja</div>
            <div className="border border-gray-100 rounded-xl overflow-hidden mb-6 max-w-lg">
              {PIPELINE_STAGES.map((stage, i) => (
                <div key={stage} className={"flex items-center justify-between px-4 py-3 text-sm " + (i < PIPELINE_STAGES.length - 1 ? "border-b border-gray-100" : "")}>
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
              {[
                { key: "welcome", emoji: "💬", label: "Auto-uvítacia správa pre nový lead" },
                { key: "followUp", emoji: "📩", label: "Follow-up ak 3 dni bez odpovede" },
                { key: "reminder", emoji: "📅", label: "Pripomienka prehliadky 1 deň vopred" },
                { key: "score", emoji: "⭐", label: "Upozornenie keď lead dosiahne skóre 75+" },
                { key: "birthday", emoji: "🎂", label: "Gratulácia klientovi k narodeninám" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 text-sm font-medium text-gray-800">
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </div>
                  <Toggle
                    value={(formData.automation as Record<string, boolean>)[item.key]}
                    onChange={v => update({ automation: { ...formData.automation, [item.key]: v } })}
                  />
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-gray-600 max-w-lg">
              🏆 <strong>Makléri s automatickými follow-upmi</strong> uzatvárajú o 27% viac obchodov. Revolis posiela správy v optimálnom čase automaticky.
            </div>

            <div className="mt-8 flex gap-3">
              <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
              <PrimaryBtn onClick={next}>Pokračovať →</PrimaryBtn>
            </div>
          </div>
        )}

        {/* KROK 7: PREPOJENIA */}
        {step === 7 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">— KROK 7 ZO 8 — VOLITEĽNÝ</p>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Prepoj nástroje 🔗</h1>
            <p className="text-gray-500 mb-8">Spoj Revolis s nástrojmi, ktoré už používaš. Každé prepojenie ti ušetrí hodiny manuálnej práce.</p>

            <div className="grid grid-cols-2 gap-3 max-w-lg mb-6">
              {[
                { id: "nehnutelnosti", emoji: "🏠", label: "Nehnuteľnosti.sk", desc: "Import leadov & inzerátov" },
                { id: "reality", emoji: "🏠", label: "Reality.sk", desc: "Import leadov & inzerátov" },
                { id: "topreality", emoji: "⭐", label: "TopReality.sk", desc: "Import leadov" },
                { id: "gcal", emoji: "📅", label: "Google Calendar", desc: "Synchronizácia prehliadok" },
                { id: "whatsapp", emoji: "💬", label: "WhatsApp Business", desc: "AI komunikácia cez WA" },
                { id: "gmail", emoji: "📧", label: "Gmail", desc: "Email integrácia" },
                { id: "facebook", emoji: "📘", label: "Facebook Leads", desc: "Meta Lead Ads" },
                { id: "slack", emoji: "🔴", label: "Slack / Teams", desc: "Notifikácie pre tím" },
              ].map(tool => {
                const connected = formData.connectedTools.includes(tool.id);
                return (
                  <div key={tool.id} className="border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between hover:border-gray-300 transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{tool.emoji}</span>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{tool.label}</div>
                        <div className="text-[11px] text-gray-400">{tool.desc}</div>
                      </div>
                    </div>
                    <button type="button"
                      onClick={() => {
                        const curr = formData.connectedTools;
                        update({ connectedTools: connected ? curr.filter(t => t !== tool.id) : [...curr, tool.id] });
                      }}
                      className={"text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all " +
                        (connected
                          ? "bg-gray-900 text-white border-gray-900"
                          : "border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900")}>
                      {connected ? "Prepojené ✓" : "Pripojiť"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-gray-600 max-w-lg">
              ℹ️ Prepojenia môžeš kedykoľvek pridať aj v nastaveniach. Pre WhatsApp a portály potrebuješ API kľúč — náš tím ti pomôže s nastavením.
            </div>

            <div className="mt-8 flex items-center gap-4 flex-wrap">
              <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
              <button type="button" onClick={next} className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2">
                Preskočiť
              </button>
              <PrimaryBtn onClick={next}>Pokračovať →</PrimaryBtn>
            </div>
          </div>
        )}

        {/* KROK 8: CIELE */}
        {step === 8 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">— KROK 8 ZO 8 — POSLEDNÝ KROK!</p>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Definuj svoje ciele 🎯</h1>
            <p className="text-gray-500 mb-8">Revolis prispôsobí AI odporúčania a analytiku podľa tvojich cieľov. Kde chceš byť o 6 mesiacov?</p>

            <div className="mb-3 text-sm font-semibold text-gray-700">Primárny cieľ</div>
            <div className="grid grid-cols-2 gap-3 max-w-lg mb-8">
              {[
                { id: "more_leads", emoji: "📈", label: "Získať viac leadov", desc: "Chcem viac záujemcov mesačne" },
                { id: "faster_close", emoji: "⚡", label: "Rýchlejšie zatváranie", desc: "Skrátiť čas od kontaktu po zmluvu" },
                { id: "automate", emoji: "🤖", label: "Automatizovať prácu", desc: "Menej manuálnej správy a priestoru" },
                { id: "analytics", emoji: "📊", label: "Lepšia analytika", desc: "Viem čo funguje, kde sa strácajú leady" },
              ].map(goal => (
                <button key={goal.id} type="button" onClick={() => update({ primaryGoal: goal.id })}
                  className={"border rounded-xl p-4 text-left transition-all " +
                    (formData.primaryGoal === goal.id
                      ? "border-2 border-gray-900 bg-gray-50"
                      : "border-gray-200 hover:border-gray-400")}>
                  <div className="text-xl mb-2">{goal.emoji}</div>
                  <div className="text-sm font-semibold text-gray-900">{goal.label}</div>
                  <div className="text-xs text-gray-400 mt-1">{goal.desc}</div>
                </button>
              ))}
            </div>

            <div className="mb-3 text-sm font-semibold text-gray-700">Cieľové KPI (nastav čísla)</div>
            <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 max-w-lg mb-6">
              {[
                { key: "kpiLeads", label: "Leadov mesačne", desc: "Koľko nových záujemcov chceš mesačne manažovať?", min: 5, max: 200, unit: "" },
                { key: "kpiDays", label: "Dni do uzavretia", desc: "Priemerný čas od prvého kontaktu po zmluvu", min: 7, max: 180, unit: "dní" },
                { key: "kpiConversion", label: "Konverzný pomer", desc: "Koľko % leadov sa ti darí previesť na klientov?", min: 1, max: 50, unit: "%" },
              ].map(kpi => (
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
              🚀 <strong>Revolis bude merať tvoj pokrok voči týmto cieľom</strong> a každý týždeň ti pošle report a odporúčania čo zlepšiť.
            </div>

            <div className="mt-8 flex gap-3">
              <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
              <PrimaryBtn onClick={next}>✨ Spustiť Revolis.AI</PrimaryBtn>
            </div>
          </div>
        )}

        {/* KROK 9: HOTOVO */}
        {step === 9 && (
          <div className="animate-in zoom-in-95 fade-in duration-700">
            <div className="text-center mb-10">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-4xl font-extrabold mb-3 tracking-tight">Revolis.AI je živý!</h1>
              <p className="text-gray-500 text-base">Tvoj AI asistent {AI_ASSISTANT_NAME} je aktívny a čaká na prvý lead.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-8">
              {[
                { value: "24/7", label: "AI asistent aktívny" },
                { value: "0", label: "Kontaktov importovaných" },
                { value: "0", label: "Fáz aktívnych" },
                { value: "7", label: "Automatizácií zapnutých" },
                { value: "<2min", label: "AI čas odpovede" },
                { value: "+34%", label: "Priemerný nárast konverzií" },
              ].map(stat => (
                <div key={stat.label} className="border border-gray-100 rounded-xl p-4 text-center">
                  <div className="text-2xl font-extrabold text-gray-900 tracking-tight">{stat.value}</div>
                  <div className="text-[11px] text-gray-400 mt-1 leading-tight">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Action cards */}
            <div className="space-y-3 max-w-lg mx-auto mb-8">
              {[
                { emoji: "📊", label: "Pozri si dashboard", desc: "Prehľad leadov, stavu klientov a štatistiky", action: "Otvoriť dashboard →" },
                { emoji: "🤖", label: "Otestuj AI asistenta", desc: "Pošli testovaciu otázku a pozri ako odpovedá", action: "Otestovať →" },
                { emoji: "➕", label: "Pridaj prvý lead", desc: "Vyskúšaj manuálne alebo cez import z portálu", action: "Pridať lead →" },
              ].map(item => (
                <div key={item.label} className="border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between hover:border-gray-300 transition-all cursor-pointer"
                  onClick={() => window.location.href = "/dashboard"}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.emoji}</span>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-400">{item.desc}</div>
                    </div>
                  </div>
                  <span className="text-sm text-blue-600 font-medium whitespace-nowrap">{item.action}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <button onClick={() => window.location.href = "/dashboard"}
                className="bg-gray-900 text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-700 transition-all flex items-center gap-2">
                ✨ Prejsť do Revolis.AI Dashboard
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
