import { LegalDataTable, LegalSection } from "@/components/legal/legal-doc-blocks";

export default function ReadinessChecklistDocument() {
  return (
    <LegalSection id="checklist" eyebrow="Dokument 8" title="MSA CHECKLIST — ENTERPRISE READINESS">
      <p>Tento checklist slúži na overenie kompletnosti právnej dokumentácie pred podpisom enterprise zmluvy.</p>

      <h3 className="text-lg font-semibold text-white">Právne dokumenty</h3>
      <LegalDataTable
        headers={["Dokument", "Stav / Poznámka"]}
        rows={[
          ["MSA — Master Service Agreement", "Hotovo — tento balík"],
          ["DPA — Data Processing Agreement", "Hotovo — GDPR compliant"],
          ["Privacy Policy", "Hotovo — GDPR + cookies"],
          ["SLA — Service Level Agreement", "Hotovo — detail annex"],
          ["VOP — Všeobecné obchodné podmienky", "Hotovo — AUP + limity"],
          ["Indemnification Clause", "Hotovo — obojstranná"],
          ["NDA (samostatný dokument)", "Pripraviť pred obchodnými rokovaniami"],
          ["Objednávkový formulár (Order Form)", "Pripraviť per-klient"],
        ]}
      />

      <h3 className="text-lg font-semibold text-white">GDPR &amp; bezpečnosť</h3>
      <LegalDataTable
        headers={["Požiadavka", "Stav"]}
        rows={[
          ["Dáta uložené v EÚ", "AWS Frankfurt"],
          ["Subprocesori zdokumentovaní", "Príloha B v DPA"],
          ["SCC pre prenos mimo EÚ (OpenAI)", "Zahrnuté"],
          ["Práva dotknutých osôb — mechanizmus", "Export/mazanie v UI"],
          ["Šifrovanie AES-256 + TLS 1.3", "Implementované"],
          ["Incident response plán", "72h notifikácia"],
          ["Retenčná politika", "90 dní po ukončení"],
          ["DPO kontakt", "Vymenovať alebo externý DPO"],
        ]}
      />

      <h3 className="text-lg font-semibold text-white">AI compliance</h3>
      <LegalDataTable
        headers={["Požiadavka", "Stav"]}
        rows={[
          ["Zákaz použitia dát na tréning AI", "DPA Článok 2"],
          ["Explainability light výstupy", "Implementované"],
          ["Ľudský dohľad nad AI rozhodnutiami", "Zdokumentované vo FAQ"],
          ["EU AI Act príprava", "V procese — Q4 2026"],
          ["Automatizované profilovanie — informovanie", "Klient zodpovedá za svoju privacy notice"],
        ]}
      />

      <h3 className="text-lg font-semibold text-white">Contractual moat — ochrana produktu</h3>
      <LegalDataTable
        headers={["Ochranný mechanizmus", "Implementácia"]}
        rows={[
          ["Zákaz reverse engineeringu", "MSA Článok 4.3"],
          ["Zákaz benchmarkingu", "MSA Článok 4.4"],
          ["Black-box AI (bez sprístupnenia modelu)", "MSA Článok 2.3"],
          ["API rate limiting", "VOP Článok 2"],
          ["Export limit (10k/deň)", "VOP Článok 2"],
          ["Monitoring vzorov používania", "VOP — infobox"],
          ["Performance fee lock-in", "MSA Článok 3.2"],
          ["Export dát (klient má dáta)", "MSA Článok 6.3"],
          ["AI logika (klient nemá model)", "MSA Článok 5.3"],
        ]}
      />
    </LegalSection>
  );
}
