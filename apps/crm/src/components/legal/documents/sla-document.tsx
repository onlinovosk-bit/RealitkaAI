import { LegalDataTable, LegalSection } from "@/components/legal/legal-doc-blocks";

export default function SlaDocument() {
  return (
    <LegalSection id="sla" eyebrow="Dokument 4" title="SERVICE LEVEL AGREEMENT (SLA) — DETAIL ANNEX">
      <h3 className="text-lg font-semibold text-white">Článok 1 — Dostupnosť systému (Uptime)</h3>
      <LegalDataTable
        headers={["Tier", "Záväzná dostupnosť / Podmienky"]}
        rows={[
          ["Standard", "99.5% uptime / mesačne (max. 3.6h výpadok)"],
          ["Professional", "99.8% uptime / mesačne (max. 1.5h výpadok)"],
          ["Enterprise", "99.9% uptime / mesačne (max. 43min výpadok)"],
          ["Plánovaná údržba", "Nezapočítava sa do výpočtu uptime"],
          ["Meranie", "Externý monitoring (UptimeRobot/Pingdom), logy dostupné Klientovi"],
        ]}
      />

      <h3 className="text-lg font-semibold text-white">Článok 2 — Servisné kredity za nedodržanie SLA</h3>
      <LegalDataTable
        headers={["Výpadok (mesačne)", "Kredit zo mesačného poplatku"]}
        rows={[
          ["99.5% — 99.9%", "5% kreditu"],
          ["99.0% — 99.5%", "10% kreditu"],
          ["98.0% — 99.0%", "20% kreditu"],
          ["Pod 98.0%", "30% kreditu + právo na ukončenie"],
          ["Max. kredit", "30% mesačného Base Fee"],
        ]}
      />
      <p>
        Podmienky kreditu: Klient musí podať žiadosť do 30 dní od incidentu. Kredit sa uplatní na nasledujúcej faktúre.
        Kredit nie je náhradou škody — nevylučuje iné nároky Klienta.
      </p>

      <h3 className="text-lg font-semibold text-white">Článok 3 — Reakčné časy podpory</h3>
      <LegalDataTable
        headers={["Priorita incidentu", "Definícia / Reakčný čas / Riešenie"]}
        rows={[
          ["P1 — Kritický", "Platforma nedostupná, strata dát → Reakcia do 1h → Riešenie do 4h"],
          ["P2 — Vysoký", "Kľúčová funkcia nefunkčná → Reakcia do 4h → Riešenie do 24h"],
          ["P3 — Stredný", "Znížený výkon, čiastočná nefunkčnosť → Reakcia do 8h → Riešenie do 72h"],
          ["P4 — Nízky", "Kosmetická chyba, otázky → Reakcia do 2 pracovné dni"],
        ]}
      />

      <h3 className="text-lg font-semibold text-white">Článok 4 — AI výkonnostné záruky</h3>
      <LegalDataTable
        headers={["Metrika", "Záruková hodnota"]}
        rows={[
          ["Čas odpovede AI asistenta", "Pod 30 sekúnd (P95 percentil)"],
          ["Presnosť lead scoringu", "Min. 75% zhoda s manuálnym hodnotením (overenie štvrťročne)"],
          ["Čas importu kontaktov", "Do 15 minút pre dávky do 10 000 kontaktov"],
          ["API latencia", "Pod 500ms (P95 percentil)"],
          ["Zálohovanie", "RPO max. 24h, RTO max. 4h pre P1"],
        ]}
      />

      <h3 className="text-lg font-semibold text-white">Článok 5 — Vylúčenia zo SLA</h3>
      <p>SLA sa nevzťahuje na výpadky spôsobené:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Vyššou mocou (force majeure) podľa Článku MSA</li>
        <li>Chybou na strane Klienta alebo tretích strán mimo kontroly Poskytovateľa</li>
        <li>Plánovanou údržbou oznámenou minimálne 48 hodín vopred</li>
        <li>Útokmi DDoS presahujúcimi bežné kapacity ochrany</li>
        <li>Zmenami API tretích strán (Facebook, WhatsApp, portály)</li>
        <li>Neposkytnutím potrebnej súčinnosti zo strany Klienta</li>
      </ul>
    </LegalSection>
  );
}
