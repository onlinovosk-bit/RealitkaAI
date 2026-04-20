"use client";
import { motion } from "framer-motion";
import { useState } from "react";

const MAKLÉR_VYHODY = [
  { ikona: "🤖", text: "AI Asistent odpovie záujemcovi do 2 minút — aj keď ty spiš" },
  { ikona: "📊", text: "Skóre pripravenosti každého záujemcu — vidíš kto je blízko kúpy" },
  { ikona: "📋", text: "Denný AI prehľad o 8:00 — 5 priorít na ráno bez premýšľania" },
  { ikona: "🔔", text: "Okamžitá notifikácia keď záujemca dosiahne vysoké skóre pripravenosti" },
  { ikona: "⚡", text: "Jedno kliknutie pre pokračovanie — AI navrhne správu, ty len schváliš" },
  { ikona: "📱", text: "Automatické odpovede cez WhatsApp a SMS aj mimo pracovných hodín" },
  { ikona: "📧", text: "E-mailové skripty prispôsobené správaniu každého klienta" },
  { ikona: "🏠", text: "Automatické párovanie záujemcov s vhodnými nehnuteľnosťami" },
  { ikona: "🎯", text: "AI rozozná kedy je klient skutočne pripravený kúpiť" },
  { ikona: "📞", text: "Prepis hovoru + súhrn + navrhnuté ďalšie kroky po každom telefonáte" },
  { ikona: "💬", text: "Databáza 50+ námietok s pripravenými odpoveďami" },
  { ikona: "📅", text: "Inteligentný kalendár — AI navrhne optimálny čas pre obhliadku" },
  { ikona: "🔄", text: "7-dňové automatické sledovacie kampane bez manuálnej práce" },
  { ikona: "📈", text: "Prehľad rýchlosti postupu príležitostí cez celý predajný proces" },
  { ikona: "🗺", text: "Mapa aktivity záujemcov vo tvojej oblasti" },
  { ikona: "💰", text: "Predikcia tvojich príjmov na 3 mesiace dopredu" },
  { ikona: "🧠", text: "AI predikcia pravdepodobnosti uzavretia každého obchodu" },
  { ikona: "🔗", text: "Prepojenie s Nehnuteľnosti.sk, Reality.sk, TopReality.sk" },
];

const MAJITEL_VYHODY = [
  { ikona: "👑", text: "Prehľad celej kancelárie v reálnom čase na jednej obrazovke" },
  { ikona: "🧠", text: "Zdieľaná AI pamäť tímu — každý maklér ťaží zo skúseností kolegov" },
  { ikona: "📊", text: "Automatický týždenný report pre vedenie bez manuálnej práce" },
  { ikona: "🔮", text: "Sledovanie cien a trendov vo vašej lokalite" },
  { ikona: "⚡", text: "Upozornenie keď konkurencia kontaktuje tvojho klienta" },
  { ikona: "🗺", text: "Správa viacerých pobočiek a lokalít z jedného miesta" },
  { ikona: "📋", text: "Vlastné automatizácie bez programovania" },
  { ikona: "💰", text: "Prehľad koľko obchodov a provízií priniesla AI" },
  { ikona: "🤖", text: "Vlastná AI osobnosť — meno a štýl komunikácie prispôsobený kancelárii" },
  { ikona: "📄", text: "Vlastné firemné logo na všetkých klientských materiáloch" },
  { ikona: "🔗", text: "Prepojenie s vlastnými systémami cez otvorené rozhranie" },
  { ikona: "🔒", text: "Firemné prihlásenie a pokročilá bezpečnosť" },
  { ikona: "☎", text: "Dedikovaný správca účtu — priama linka na podporu" },
  { ikona: "⚡", text: "Garancia dostupnosti systému 99,9 % času" },
  { ikona: "📞", text: "Mesačný strategický hovor s AI konzultantom" },
];

const TABS = [
  { id: "maklér", label: "Som maklér", data: MAKLÉR_VYHODY },
  { id: "majiteľ", label: "Som majiteľ kancelárie", data: MAJITEL_VYHODY },
] as const;

export default function BenefitsSection() {
  const [activeTab, setActiveTab] = useState<"maklér" | "majiteľ">("maklér");
  const current = TABS.find((t) => t.id === activeTab)!;

  return (
    <section className="py-28" style={{ background: "#080B12" }}>
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: "-80px" }}
          className="mb-12 text-center"
        >
          <p
            className="mb-4 text-sm uppercase tracking-[0.3em]"
            style={{ color: "#22D3EE" }}
          >
            Čo získaš
          </p>
          <h2
            className="mb-4 text-4xl font-extrabold sm:text-5xl"
            style={{ fontFamily: "var(--font-syne)", color: "#F0F9FF" }}
          >
            AI pracuje.
            <br />
            <span style={{ color: "#22D3EE" }}>Ty uzatváraš obchody.</span>
          </h2>
          <p style={{ color: "#64748B" }}>
            Vyber si svoju rolu a pozri čo pre teba Revolis.AI robí každý deň.
          </p>
        </motion.div>

        {/* Tab prepínač */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="mb-10 flex justify-center"
        >
          <div
            className="flex rounded-xl p-1"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-200"
                style={
                  activeTab === tab.id
                    ? {
                        background: "rgba(34,211,238,0.12)",
                        border: "1px solid rgba(34,211,238,0.25)",
                        color: "#22D3EE",
                      }
                    : {
                        background: "transparent",
                        border: "1px solid transparent",
                        color: "#64748B",
                      }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Mriežka výhod */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {current.data.map((vyhoda, i) => (
            <motion.div
              key={vyhoda.text}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.03 }}
              className="flex items-start gap-3 rounded-xl px-4 py-3"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span className="mt-0.5 shrink-0 text-lg">{vyhoda.ikona}</span>
              <p className="text-sm leading-snug" style={{ color: "#94A3B8" }}>
                {vyhoda.text}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
