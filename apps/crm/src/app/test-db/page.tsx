"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";

// OptionCard: selectable card
type OptionCardProps = {
  id: string;
  label: string;
  icon: React.ReactNode;
  desc?: string;
  active: boolean;
  onClick: (id: string) => void;
  className?: string;
};
function OptionCard({ id, label, icon, desc, active, onClick, className }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`border rounded-lg p-4 flex flex-col items-center text-center w-full min-h-[112px] ${
        active ? "border-2 border-gray-900" : "border border-gray-200"
      } ${className || ""}`}
      style={{ minHeight: 112 }}
    >
      <span className="text-3xl mb-2">{icon}</span>
      <span className="text-base font-medium text-gray-900 mb-1">{label}</span>
      {desc && <span className="text-sm text-gray-500">{desc}</span>}
    </button>
  );
}

// Tag: selectable pill
type TagProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};
function Tag({ label, active, onClick }: TagProps) {
  return (
    <span
      onClick={onClick}
      className={`border rounded px-3 py-1 text-sm cursor-pointer select-none mr-2 mb-2 ${
        active ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-700"
      }`}
      tabIndex={0}
      role="button"
      onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick()}
    >
      {label}
    </span>
  );
}

// Toggle: on/off switch
type ToggleProps = {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
};
function Toggle({ label, desc, value, onChange, icon }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {icon && <span className="text-xl">{icon}</span>}
        <div>
          <div className="text-base font-medium text-gray-900">{label}</div>
          {desc && <div className="text-xs text-gray-500">{desc}</div>}
        </div>
      </div>
      <button
        type="button"
        className={`w-10 h-6 rounded-full flex items-center ${value ? "bg-gray-900" : "bg-gray-300"}`}
        onClick={() => onChange(!value)}
        aria-pressed={value}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white border border-gray-300 transition-transform ${
            value ? "translate-x-4" : "translate-x-0"
          }`}
          style={{ transform: value ? "translateX(16px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}

// InfoBox
function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 mb-6">{children}</div>
  );
}

// InputField
type InputFieldProps = {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  className?: string;
};
function InputField({ label, value, onChange, placeholder, type = "text", required, className }: InputFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="border border-gray-300 rounded px-3 py-2 w-full text-base text-gray-900"
      />
    </div>
  );
}

// TextareaField
type TextareaFieldProps = {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
};
function TextareaField({ label, value, onChange, placeholder, required, className }: TextareaFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="border border-gray-300 rounded px-3 py-2 w-full text-base text-gray-900 min-h-[80px]"
      />
    </div>
  );
}

// Step definitions
const steps = [
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

// Main component
export default function OnboardingPage() {
  // State for all form data
  const [step, setStep] = useState<number>(1);
  const [form, setForm] = useState<any>({
    name: "",
    identity: "",
    goals: [] as string[],
    agencyName: "",
    agencyRegion: "",
    agentCount: "",
    leadCount: "",
    crm: "",
    pains: [] as string[],
    agencyPhone: "",
    agencyWeb: "",
    profilePhone: "",
    profileLinkedin: "",
    profileBio: "",
    specialization: [] as string[],
    languages: ["Slovenčina"],
    profilePhoto: null as File | null,
    aiName: "Sofia",
    aiTone: "PROFESIONÁLNY",
    aiAutoReply: true,
    aiWorkHours: false,
    aiLeadScoring: true,
    importSource: "",
    pipelineToggles: {
      welcome: true,
      followup: true,
      viewing: true,
      score: true,
      birthday: false,
    },
    integrations: [] as string[],
    mainGoal: "",
    kpiLeads: 30,
    kpiDays: 45,
    kpiConversion: 15,
  });
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>("");

  // Progress calculation
  const progress = Math.round(((step - 1) / 8) * 100);

  // Handlers
  const handleInput = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));
  const handleArrayInput = (key: string, value: string) => setForm((f: any) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v: string) => v !== value) : [...f[key], value] }));
  const handleNext = () => setStep(s => Math.min(s + 1, 9));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  // Step titles and subtexts
  const stepTitles = [
    "Vitaj v Revolis.AI 🚀",
    "Nastav svoju realitku 🏢",
    "Tvoj profil makléra 👤",
    "Nakonfiguruj AI asistenta 🤖",
    "Import kontaktov & leadov 📋",
    "Predajný pipeline 🏗️",
    "Prepoj nástroje 🔗",
    "Definuj svoje ciele 🎯",
  ];
  const stepSubtexts = [
    "Nastav si účet za 15 minút. Potom nechaj AI pracovať za teba — 24/7, bez oddychu.",
    "Tieto info použijeme na personalizáciu AI asistenta a všetkých komunikácií smerom ku klientom.",
    "Klienti ťa spoznajú cez tvoj AI asistent. Čím lepší profil, tým dôveryhodnejší prvý dojem.",
    "Toto je srdce Revolisu. Tvoj AI obchodník bude pracovať za teba non-stop. Nastav mu osobnosť a správanie.",
    "Presuň existujúce kontakty do Revolis. Môžeš to spraviť teraz alebo neskôr — systém bude fungovať aj bez importu.",
    "Revolis má prednastavený pipeline pre reality. Môžeš ho prispôsobiť alebo použiť tak ako je.",
    "Spoj Revolis s nástrojmi, ktoré už používaš. Každé prepojenie ti ušetrí hodiny manuálnej práce.",
    "Revolis prispôsobí AI odporúčania a analytiku podľa tvojich cieľov. Kde chceš byť o 6 mesiacov?",
  ];

  // Step 1 options
  const identityOptions = [
    { id: "majitel", icon: "🏛️", label: "Majiteľ kancelárie", desc: "Vediem agentúru / tím" },
    { id: "makler", icon: "💛", label: "Samostatný maklér", desc: "Pracujem sám alebo pre kanceláriu" },
    { id: "manager", icon: "⚙️", label: "Office Manager", desc: "Spravujem systémy a tím" },
  ];
  const goalOptions = [
    { id: "leads", icon: "📊", label: "Viac leadov", desc: "Automaticky z portálov a webu" },
    { id: "ai", icon: "🤖", label: "AI predaj 24/7", desc: "Asistent odpovedá za mňa" },
    { id: "fast", icon: "⚡", label: "Rýchlejšie uzatváranie", desc: "Skrátiť čas deal → zmluva" },
    { id: "analytics", icon: "📈", label: "Analytika & prehľad", desc: "Viem čo funguje a čo nie" },
    { id: "team", icon: "👥", label: "Riadenie tímu", desc: "Prehľad nad celým tímom" },
    { id: "manual", icon: "🔄", label: "Menej manuálnej práce", desc: "Automatické follow-upy" },
  ];

  // Step 2 options
  const agentCounts = ["Vyber...", "1", "2-5", "6-10", "11-20", "21+" ];
  const leadCounts = ["Vyber...", "1-10", "11-30", "31-50", "51-100", "100+" ];
  const crmOptions = [
    "Nič / Excel", "Nehnuteľnosti.sk CRM", "Reality.sk systém", "Vlastné riešenie", "HubSpot", "Iné"
  ];
  const painOptions = [
    "Leady sa strácajú", "Pomalé odpovedanie", "Žiadna analytika", "Manuálne follow-upy",
    "Zlá spolupráca v tíme", "Drahá reklama bez výsledkov", "Ťažká správa zákazníkov", "Nedostatok času"
  ];

  // Step 3 options
  const specializationOptions = [
    "Byty", "Rodinné domy", "Luxusné nehnuteľnosti", "Komerčné priestory",
    "Pôda", "Novostavby", "Investície", "Prenájom"
  ];
  const languageOptions = [
    "Slovenčina", "Čeština", "Angličtina", "Nemčina", "Ruština", "Maďarčina"
  ];

  // Step 4 options
  const aiTones = [
    { id: "PROFESIONÁLNY", icon: "💼" },
    { id: "PRIATEĽSKÝ", icon: "😊" },
    { id: "LUXUSNÝ", icon: "✨" },
    { id: "ENERGICKÝ", icon: "⚡" },
    { id: "FORMÁLNY", icon: "🎩" },
  ];

  // Step 5 options
  const importOptions = [
    { id: "csv", icon: "📊", label: "CSV / Excel", desc: "Vlastný súbor" },
    { id: "nehnutelnosti", icon: "🏠", label: "Nehnuteľnosti.sk", desc: "Export z portálu" },
    { id: "reality", icon: "🏠", label: "Reality.sk", desc: "Export z portálu" },
    { id: "topreality", icon: "⭐", label: "TopReality.sk", desc: "Export z portálu" },
    { id: "manual", icon: "✏️", label: "Manuálne", desc: "Pridám neskôr ručne" },
    { id: "skip", icon: "⏩", label: "Preskočiť", desc: "Začnem od nuly" },
  ];

  // Step 6 pipeline stages
  const pipelineStages = [
    "1. Nový lead", "2. Kontaktovaný", "3. Kvalifikovaný", "4. Prehliadka", "5. Ponuka", "6. Rokovanie", "7. Zmluva"
  ];

  // Step 7 integrations
  const integrationOptions = [
    { id: "nehnutelnosti", icon: "🏠", name: "Nehnuteľnosti.sk", desc: "Import leadov & inzeráty" },
    { id: "reality", icon: "🏠", name: "Reality.sk", desc: "Import leadov & inzeráty" },
    { id: "topreality", icon: "⭐", name: "TopReality.sk", desc: "Import leadov" },
    { id: "calendar", icon: "📅", name: "Google Calendar", desc: "Synchronizácia prehliadok" },
    { id: "whatsapp", icon: "💬", name: "WhatsApp Business", desc: "AI komunikácia cez WA" },
    { id: "gmail", icon: "📧", name: "Gmail", desc: "Email integrácia" },
    { id: "facebook", icon: "📘", name: "Facebook Leads", desc: "Meta Lead Ads" },
    { id: "slack", icon: "💬", name: "Slack / Teams", desc: "Notifikácie pre tím" },
  ];

  // Step 8 goal options
  const mainGoalOptions = [
    { id: "leads", icon: "📊", label: "Získať viac leadov", desc: "Chcem viac záujemcov mesačne" },
    { id: "fast", icon: "⚡", label: "Rýchlejšie zatváranie", desc: "Skrátiť čas od kontaktu po zmluvu" },
    { id: "auto", icon: "🤖", label: "Automatizovať prácu", desc: "Menej manuálnych úloh a viac priestoru" },
    { id: "analytics", icon: "📈", label: "Lepšia analytika", desc: "Vidieť čo funguje, kde sa strácajú leady" },
  ];

  // Step 1: Vitaj
  function Step1() {
    return (
      <form onSubmit={e => { e.preventDefault(); handleNext(); }}>
        <p className="text-xs font-medium text-gray-500 mb-2">— KROK 1 ZO 8 —</p>
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Vitaj v Revolis.AI 🚀</h1>
        <p className="text-gray-600 mb-6">Nastav si účet za 15 minút. Potom nechaj AI pracovať za teba — 24/7, bez oddychu.</p>
        <InputField
          label="Tvoje meno *"
          value={form.name}
          onChange={e => handleInput("name", e.target.value)}
          placeholder="Napr. Tomáš Novák"
          required
          className="mb-4"
        />
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-500 mb-2">Si v realitách ako...</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {identityOptions.map(opt => (
              <OptionCard
                key={opt.id}
                id={opt.id}
                label={opt.label}
                icon={opt.icon}
                desc={opt.desc}
                active={form.identity === opt.id}
                onClick={id => handleInput("identity", id)}
              />
            ))}
          </div>
        </div>
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-500 mb-2">Čo chceš dosiahnuť s Revolis? (vyber čo platí)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {goalOptions.map(opt => (
              <OptionCard
                key={opt.id}
                id={opt.id}
                label={opt.label}
                icon={opt.icon}
                desc={opt.desc}
                active={form.goals.includes(opt.id)}
                onClick={id => handleArrayInput("goals", id)}
              />
            ))}
          </div>
        </div>
        <InfoBox>
          💡 Prečo Revolis nie je len ďalší CRM: Väčšina maklérov stráca 60% leadov len preto, že neodpíše dosť rýchlo. Revolis AI odpovedá do 30 sekúnd — 24 hodín denne, 7 dní v týždni.
        </InfoBox>
        <button
          type="submit"
          className="bg-gray-900 text-white px-6 py-2 rounded text-base"
        >
          Začať nastavenie →
        </button>
      </form>
    );
  }

  // Step 2: Nastav svoju realitku
  function Step2() {
    return (
      <form onSubmit={e => { e.preventDefault(); handleNext(); }}>
        <p className="text-xs font-medium text-gray-500 mb-2">— KROK 2 ZO 8 —</p>
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Nastav svoju realitku 🏢</h1>
        <p className="text-gray-600 mb-6">Tieto info použijeme na personalizáciu AI asistenta a všetkých komunikácií smerom ku klientom.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <InputField label="Názov realitnej kancelárie *" value={form.agencyName} onChange={e => handleInput("agencyName", e.target.value)} placeholder="Napr. Reality Novák s.r.o." required />
          <InputField label="Mesto / región *" value={form.agencyRegion} onChange={e => handleInput("agencyRegion", e.target.value)} placeholder="Napr. Bratislava" required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Počet maklérov v tíme</label>
            <select className="border border-gray-300 rounded px-3 py-2 w-full text-base text-gray-900" value={form.agentCount} onChange={e => handleInput("agentCount", e.target.value)}>
              {agentCounts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mesačný počet leadov (odhadom)</label>
            <select className="border border-gray-300 rounded px-3 py-2 w-full text-base text-gray-900" value={form.leadCount} onChange={e => handleInput("leadCount", e.target.value)}>
              {leadCounts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-500 mb-2">Čo momentálne používate (CRM / systém)?</div>
          <div className="flex flex-wrap">
            {crmOptions.map(opt => (
              <Tag key={opt} label={opt} active={form.crm === opt} onClick={() => handleInput("crm", opt)} />
            ))}
          </div>
        </div>
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-500 mb-2">Hlavné bolesti (vyber čo vás trápi)</div>
          <div className="flex flex-wrap">
            {painOptions.map(opt => (
              <Tag key={opt} label={opt} active={form.pains.includes(opt)} onClick={() => handleArrayInput("pains", opt)} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <InputField label="Telefón kancelárie" value={form.agencyPhone} onChange={e => handleInput("agencyPhone", e.target.value)} placeholder="+421 XXX XXX XXX" />
          <InputField label="Web stránka" value={form.agencyWeb} onChange={e => handleInput("agencyWeb", e.target.value)} placeholder="https://vasarealitka.sk" />
        </div>
        <InfoBox>
          🔒 Vaše dáta sú bezpečné. Používame ich výhradne na personalizáciu vášho AI asistenta a nikdy ich nepredávame tretím stranám.
        </InfoBox>
        <div className="flex gap-2">
          <button type="button" className="border border-gray-300 text-gray-700 px-4 py-2 rounded" onClick={handleBack}>← Späť</button>
          <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded text-base">Pokračovať →</button>
        </div>
      </form>
    );
  }

  // Step 3: Tvoj profil makléra
  function Step3() {
    return (
      <form onSubmit={e => { e.preventDefault(); handleNext(); }}>
        <p className="text-xs font-medium text-gray-500 mb-2">— KROK 3 ZO 8 —</p>
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Tvoj profil makléra 👤</h1>
        <p className="text-gray-600 mb-6">Klienti ťa spoznajú cez tvoj AI asistent. Čím lepší profil, tým dôveryhodnejší prvý dojem.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <InputField label="Telefón *" value={form.profilePhone} onChange={e => handleInput("profilePhone", e.target.value)} placeholder="+421 XXX XXX XXX" required />
          <InputField label="LinkedIn profil" value={form.profileLinkedin} onChange={e => handleInput("profileLinkedin", e.target.value)} placeholder="linkedin.com/in/tvoje-meno" />
        </div>
        <TextareaField label="Krátke bio (zobrazí sa klientom)" value={form.profileBio} onChange={e => handleInput("profileBio", e.target.value)} placeholder="Napr: Pomáhám rodinám nájsť domov v Bratislave od roku 2015. Špecializujem sa na nové byty a rodinné domy..." className="mb-4" />
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-500 mb-2">Špecializácia</div>
          <div className="flex flex-wrap">
            {specializationOptions.map(opt => (
              <Tag key={opt} label={opt} active={form.specialization.includes(opt)} onClick={() => handleArrayInput("specialization", opt)} />
            ))}
          </div>
        </div>
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-500 mb-2">Jazyky komunikácie</div>
          <div className="flex flex-wrap">
            {languageOptions.map(opt => (
              <Tag key={opt} label={opt} active={form.languages.includes(opt)} onClick={() => handleArrayInput("languages", opt)} />
            ))}
          </div>
        </div>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
          <div className="text-3xl mb-2">📷</div>
          <div className="mb-1">Nahraj svoju profilovú fotku</div>
          <div className="text-xs text-gray-500 mb-2">PNG, JPG do 5MB — lepšia foto = viac dôvery od klientov</div>
          <input type="file" accept="image/png,image/jpeg" onChange={e => {
            const file = e.target.files?.[0];
            if (file) {
              setProfilePhotoUrl(URL.createObjectURL(file));
              handleInput("profilePhoto", file);
            }
          }} />
          {profilePhotoUrl && <img src={profilePhotoUrl} alt="Profilová fotka" className="mx-auto mt-2 rounded-full w-20 h-20 object-cover" />}
        </div>
        <div className="flex gap-2">
          <button type="button" className="border border-gray-300 text-gray-700 px-4 py-2 rounded" onClick={handleBack}>← Späť</button>
          <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded text-base">Pokračovať →</button>
        </div>
      </form>
    );
  }

  // Step 4: Nakonfiguruj AI asistenta
  function Step4() {
    return (
      <form onSubmit={e => { e.preventDefault(); handleNext(); }}>
        <p className="text-xs font-medium text-gray-500 mb-2">— KROK 4 ZO 8 —</p>
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Nakonfiguruj AI asistenta 🤖</h1>
        <p className="text-gray-600 mb-6">Toto je srdce Revolisu. Tvoj AI obchodník bude pracovať za teba non-stop. Nastav mu osobnosť a správanie.</p>
        <InputField label="Meno tvojho AI asistenta" value={form.aiName} onChange={e => handleInput("aiName", e.target.value)} required className="mb-4" />
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-500 mb-2">Tón komunikácie AI</div>
          <div className="flex gap-2">
            {aiTones.map(tone => (
              <button key={tone.id} type="button" className={`px-3 py-2 rounded ${form.aiTone === tone.id ? "border-2 border-gray-900 bg-gray-50" : "border border-gray-200"}`} onClick={() => handleInput("aiTone", tone.id)}>
                <span className="mr-1">{tone.icon}</span>{tone.id}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primárny jazyk</label>
            <input className="border border-gray-300 rounded px-3 py-2 w-full text-base text-gray-900" value="sk Slovenčina" disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Oneskorenie auto-odpovede</label>
            <input className="border border-gray-300 rounded px-3 py-2 w-full text-base text-gray-900" value="5 minút (odporúčané)" disabled />
          </div>
        </div>
        <div className="mb-4">
          <Toggle label="Automatické odpovedanie" desc="AI odpovedá na každý dotaz automaticky bez tvojho zásahu." value={form.aiAutoReply} onChange={v => handleInput("aiAutoReply", v)} icon={<span>🤖</span>} />
          <Toggle label="Pracovné hodiny" desc="AI odpovedá len počas pracovných hodín (napr. 8:00–18:00)." value={form.aiWorkHours} onChange={v => handleInput("aiWorkHours", v)} icon={<span>🕐</span>} />
          <Toggle label="Smart lead scoring" desc="AI automaticky hodnotí pripravenosť leadov a upozorní na top prioritné." value={form.aiLeadScoring} onChange={v => handleInput("aiLeadScoring", v)} icon={<span>⭐</span>} />
        </div>
        <div className="bg-gray-50 border rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2"><span className="text-2xl">🤖</span><span className="font-medium">Sofia</span><span className="ml-2 text-green-600 text-xs">● Online — odpovedá za 5 min</span></div>
          <div className="bg-white border rounded-lg p-3 text-sm">Dobrý deň! Som Sofia, digitálny asistent našej realitnej kancelárie. Rád vám pomôžem nájsť nehnuteľnosť podľa vašich predstáv. Čo práve hľadáte?</div>
        </div>
        <InfoBox>
          ⚡ Výsledok maklérov s Revolis AI: Priemerná odpoveď na lead za 2 min (vs. 4 hodiny manuálne). Konverzný pomer leadov +34%.
        </InfoBox>
        <div className="flex gap-2">
          <button type="button" className="border border-gray-300 text-gray-700 px-4 py-2 rounded" onClick={handleBack}>← Späť</button>
          <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded text-base">Generovať AI & pokračovať →</button>
        </div>
      </form>
    );
  }

  // Step 5: Import kontaktov & leadov
  function Step5() {
    return (
      <form onSubmit={e => { e.preventDefault(); handleNext(); }}>
        <p className="text-xs font-medium text-gray-500 mb-2">— KROK 5 ZO 8 —</p>
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Import kontaktov & leadov 📋</h1>
        <p className="text-gray-600 mb-6">Presuň existujúce kontakty do Revolis. Môžeš to spraviť teraz alebo neskôr — systém bude fungovať aj bez importu.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {importOptions.map(opt => (
            <OptionCard key={opt.id} id={opt.id} label={opt.label} icon={opt.icon} desc={opt.desc} active={form.importSource === opt.id} onClick={id => handleInput("importSource", id)} />
          ))}
        </div>
        <InfoBox>
          💡 Tip: Aj 20 starých kontaktov môže priniesť okamžité výsledky. Revolis AI automaticky osloví všetkých nevybavených leadov s personalizovanou správou.
        </InfoBox>
        <div className="flex gap-2">
          <button type="button" className="border border-gray-300 text-gray-700 px-4 py-2 rounded" onClick={handleBack}>← Späť</button>
          <button type="button" className="border border-gray-300 text-gray-700 px-4 py-2 rounded" onClick={handleNext}>Preskočiť na neskôr</button>
          <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded text-base">Pokračovať →</button>
        </div>
      </form>
    );
  }

  // Step 6: Predajný pipeline
  function Step6() {
    return (
      <form onSubmit={e => { e.preventDefault(); handleNext(); }}>
        <p className="text-xs font-medium text-gray-500 mb-2">— KROK 6 ZO 8 —</p>
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Predajný pipeline 🏗️</h1>
        <p className="text-gray-600 mb-6">Revolis má prednastavený pipeline pre reality. Môžeš ho prispôsobiť alebo použiť tak ako je.</p>
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-500 mb-2">Fázy predaja</div>
          <div className="bg-gray-50 border rounded p-3">
            {pipelineStages.map((stage, i) => (
              <div key={stage} className="flex justify-between py-1 border-b last:border-b-0 border-gray-100">
                <span>● {stage}</span>
                <span className="text-gray-400">0 leadov</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-500 mb-2">Automatické akcie (zapni čo chceš)</div>
          <Toggle label="Auto-uvítacia správa pre nový lead" value={form.pipelineToggles.welcome} onChange={v => handleInput("pipelineToggles", { ...form.pipelineToggles, welcome: v })} icon={<span>📩</span>} />
          <Toggle label="Follow-up ak 3 dni bez odpovede" value={form.pipelineToggles.followup} onChange={v => handleInput("pipelineToggles", { ...form.pipelineToggles, followup: v })} icon={<span>📅</span>} />
          <Toggle label="Pripomienka prehliadky 1 deň vopred" value={form.pipelineToggles.viewing} onChange={v => handleInput("pipelineToggles", { ...form.pipelineToggles, viewing: v })} icon={<span>🏠</span>} />
          <Toggle label="Upozornenie keď lead dosiahne skóre 75+" value={form.pipelineToggles.score} onChange={v => handleInput("pipelineToggles", { ...form.pipelineToggles, score: v })} icon={<span>⭐</span>} />
          <Toggle label="Gratulácia klientovi k narodeninám" value={form.pipelineToggles.birthday} onChange={v => handleInput("pipelineToggles", { ...form.pipelineToggles, birthday: v })} icon={<span>🎂</span>} />
        </div>
        <InfoBox>
          ⚡ Makléri s automatickými follow-upmi uzatvoria o 27% viac obchodov. Revolis posiela správy v optimálnom čase automaticky.
        </InfoBox>
        <div className="flex gap-2">
          <button type="button" className="border border-gray-300 text-gray-700 px-4 py-2 rounded" onClick={handleBack}>← Späť</button>
          <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded text-base">Pokračovať →</button>
        </div>
      </form>
    );
  }

  // Step 7: Prepoj nástroje
  function Step7() {
    return (
      <form onSubmit={e => { e.preventDefault(); handleNext(); }}>
        <p className="text-xs font-medium text-gray-500 mb-2">— KROK 7 ZO 8 —</p>
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Prepoj nástroje 🔗</h1>
        <p className="text-gray-600 mb-6">Spoj Revolis s nástrojmi, ktoré už používaš. Každé prepojenie ti ušetrí hodiny manuálnej práce.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {integrationOptions.map(opt => (
            <div key={opt.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{opt.icon}</span>
                <div>
                  <div className="font-medium text-gray-900">{opt.name}</div>
                  <div className="text-xs text-gray-500">{opt.desc}</div>
                </div>
              </div>
              <button type="button" className="border border-gray-300 rounded px-3 py-1 text-sm">Pripojiť</button>
            </div>
          ))}
        </div>
        <InfoBox>
          ℹ️ Prepojenia môžeš kedykoľvek pridať aj v nastaveniach. Pre WhatsApp a portály potrebuješ API kľúč — náš tím ti pomôže s nastavením.
        </InfoBox>
        <div className="flex gap-2">
          <button type="button" className="border border-gray-300 text-gray-700 px-4 py-2 rounded" onClick={handleBack}>← Späť</button>
          <button type="button" className="text-gray-500 px-4 py-2 rounded" onClick={handleNext}>Preskočiť</button>
          <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded text-base">Pokračovať →</button>
        </div>
      </form>
    );
  }

  // Step 8: Definuj svoje ciele
  function Step8() {
    return (
      <form onSubmit={e => { e.preventDefault(); handleNext(); }}>
        <p className="text-xs font-medium text-gray-500 mb-2">— KROK 8 ZO 8 —</p>
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Definuj svoje ciele 🎯</h1>
        <p className="text-gray-600 mb-6">Revolis prispôsobí AI odporúčania a analytiku podľa tvojich cieľov. Kde chceš byť o 6 mesiacov?</p>
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-500 mb-2">Primárny cieľ</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mainGoalOptions.map(opt => (
              <OptionCard key={opt.id} id={opt.id} label={opt.label} icon={opt.icon} desc={opt.desc} active={form.mainGoal === opt.id} onClick={id => handleInput("mainGoal", id)} />
            ))}
          </div>
        </div>
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-500 mb-2">Cieľové KPI (nastav čísla)</div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🎯</span>
            <span className="mr-2">Leadov mesačne</span>
            <input type="range" min={1} max={100} value={form.kpiLeads} onChange={e => handleInput("kpiLeads", Number(e.target.value))} className="flex-1" />
            <span className="ml-2 font-medium">{form.kpiLeads}</span>
            <button type="button" className="border border-gray-300 rounded px-3 py-1 text-sm ml-2">Nastaviť</button>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🕐</span>
            <span className="mr-2">Dní do uzavretia</span>
            <input type="range" min={1} max={180} value={form.kpiDays} onChange={e => handleInput("kpiDays", Number(e.target.value))} className="flex-1" />
            <span className="ml-2 font-medium">{form.kpiDays} dní</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📊</span>
            <span className="mr-2">Konverzný pomer</span>
            <input type="range" min={1} max={100} value={form.kpiConversion} onChange={e => handleInput("kpiConversion", Number(e.target.value))} className="flex-1" />
            <span className="ml-2 font-medium">{form.kpiConversion}%</span>
          </div>
        </div>
        <InfoBox>
          🚀 Revolis bude merať tvoj pokrok voči týmto cieľom a každý týždeň ti pošle report s odporúčaniami čo zlepšiť.
        </InfoBox>
        <div className="flex gap-2">
          <button type="button" className="border border-gray-300 text-gray-700 px-4 py-2 rounded" onClick={handleBack}>← Späť</button>
          <button type="submit" className="bg-gray-900 text-white px-8 py-3 rounded-lg text-base">Spustiť Revolis.AI</button>
        </div>
      </form>
    );
  }

  // Step 9: Completion
  function Step9() {
    return (
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Revolis.AI je živý!</h1>
        <p className="text-gray-600 mb-6">Tvoj AI asistent Sofia je aktívny a čaká na prvý lead.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-4 text-center"><div className="text-xl font-bold">24/7</div><div className="text-xs text-gray-500">AI asistent aktívny</div></div>
          <div className="border border-gray-200 rounded-lg p-4 text-center"><div className="text-xl font-bold">0</div><div className="text-xs text-gray-500">Kontaktov importovaných</div></div>
          <div className="border border-gray-200 rounded-lg p-4 text-center"><div className="text-xl font-bold">0</div><div className="text-xs text-gray-500">Freqení aktívnych</div></div>
          <div className="border border-gray-200 rounded-lg p-4 text-center"><div className="text-xl font-bold">7</div><div className="text-xs text-gray-500">Automatizácií zapnutých</div></div>
          <div className="border border-gray-200 rounded-lg p-4 text-center"><div className="text-xl font-bold">&lt;2min</div><div className="text-xs text-gray-500">AI čas odpovede</div></div>
          <div className="border border-gray-200 rounded-lg p-4 text-center"><div className="text-xl font-bold">+34%</div><div className="text-xs text-gray-500">Priemerný nárast konverzií</div></div>
        </div>
        <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-2xl">📊</span><div><div className="font-medium text-gray-900">Pozri si dashboard</div><div className="text-xs text-gray-500">Prehľad leadov, pipeline a štatistiky</div></div></div><button className="text-gray-900 font-medium">Otvoriť dashboard →</button></div>
          <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-2xl">🤖</span><div><div className="font-medium text-gray-900">Otestuj AI asistenta</div><div className="text-xs text-gray-500">Pošli testovaciu správu a pozri ako odpovedá</div></div></div><button className="text-gray-900 font-medium">Otestovať →</button></div>
          <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-2xl">➕</span><div><div className="font-medium text-gray-900">Pridaj prvý lead</div><div className="text-xs text-gray-500">Vyskúšaj manuálne alebo cez import z portálu</div></div></div><button className="text-gray-900 font-medium">Pridať lead →</button></div>
        </div>
        <button className="bg-gray-900 text-white px-8 py-3 rounded-lg text-base w-full">🚀 Prejsť do Revolis.AI Dashboard</button>
      </div>
    );
  }

  // Render sidebar
  function Sidebar() {
    return (
      <aside className="hidden lg:flex flex-col w-48 border-r border-gray-200 p-4 shrink-0">
        <div className="text-xs font-medium text-gray-500 mb-1">POSTUP</div>
        <div className="w-full bg-gray-200 rounded h-1 mb-4">
          <div className="bg-gray-900 h-1 rounded" style={{ width: progress + "%" }} />
        </div>
        <div className="flex flex-col gap-1">
          {steps.map((s, idx) => (
            <div
              key={s.id}
              className={
                step === s.id
                  ? "bg-gray-100 font-medium rounded px-2 py-1"
                  : step > s.id
                  ? "text-gray-400 px-2 py-1"
                  : "text-gray-400 px-2 py-1"
              }
            >
              <span className="mr-2">{s.emoji}</span>
              {s.label}
              {s.duration && <span className="ml-2 text-xs text-gray-400">{s.duration}</span>}
            </div>
          ))}
        </div>
      </aside>
    );
  }

  // Render main content
  function MainContent() {
    // Debug: show current step in console
    console.log("step", step);
    return (
      <main className="flex-1 p-8 max-w-2xl">
        {step === 1 && <Step1 />}
        {step === 2 && <Step2 />}
        {step === 3 && <Step3 />}
        {step === 4 && <Step4 />}
        {step === 5 && <Step5 />}
        {step === 6 && <Step6 />}
        {step === 7 && <Step7 />}
        {step === 8 && <Step8 />}
        {step === 9 && <Step9 />}
      </main>
    );
  }

  // Layout
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <MainContent />
    </div>
  );
}