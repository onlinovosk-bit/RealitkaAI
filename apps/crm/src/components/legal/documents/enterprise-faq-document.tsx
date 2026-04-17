import { LegalDataTable, LegalSection } from "@/components/legal/legal-doc-blocks";

export default function EnterpriseFaqDocument() {
  return (
    <LegalSection id="faq" eyebrow="Dokument 7" title="AI COMPLIANCE &amp; ENTERPRISE FAQ">
      <p>
        Tento dokument obsahuje odpovede na najčastejšie otázky enterprise klientov pri due diligence a procurement procese.
      </p>

      <h3 className="text-lg font-semibold text-white">Sekcia A — GDPR &amp; Dátové otázky</h3>
      <dl className="space-y-4">
        <div>
          <dt className="font-semibold text-white">Kde sú uložené naše dáta?</dt>
          <dd className="mt-1">
            Všetky dáta sú uložené výhradne na serveroch v EÚ (primárne AWS Frankfurt). Žiadne osobné údaje neopúšťajú EÚ bez
            SCC základu. Zálohy sú uložené v EÚ (AWS Írsko).
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Kto má prístup k našim dátam?</dt>
          <dd className="mt-1">
            Prístup k produkčným dátam majú len autorizovaní inžinieri spoločnosti ONLINOVO, s. r. o. pri produkte Revolis.AI
            (max. 3 osoby) na základe podpísaného NDA a
            RBAC politiky. Prístup je logovaný a auditovateľný. Tretie strany (subprocesori) majú prístup len k anonymizovaným
            alebo šifrovaným dátam.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Môžeme exportovať všetky dáta?</dt>
          <dd className="mt-1">
            Áno. Klient má právo exportovať všetky Zákaznícke dáta (kontakty, históriu komunikácie, tagy, skóre) vo formáte
            CSV alebo JSON kedykoľvek počas trvania zmluvy a do 30 dní po jej ukončení. Export je dostupný priamo v UI alebo cez
            API.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Čo sa stane s dátami po ukončení zmluvy?</dt>
          <dd className="mt-1">
            Po ukončení zmluvy Klient dostane 30-dňovú lehotu na export.             Potom budú dáta bezpečne vymazané zo všetkých aktívnych
            systémov do 30 dní a zo zálohovacích systémov do 90 dní. Spracovateľ (ONLINOVO) vydá potvrdenie o vymazaní na
            požiadanie.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Používate naše dáta na tréning AI?</dt>
          <dd className="mt-1">
            Nie. Toto je kategórická záruka zakotvená v DPA (Článok 2). Zákaznícke dáta nie sú nikdy používané na tréning,
            fine-tuning ani hodnotenie AI modelov. Modely sú trénované na oddelených, anonymizovaných datasetoch.
          </dd>
        </div>
      </dl>

      <h3 className="text-lg font-semibold text-white">Sekcia B — AI &amp; Explainability</h3>
      <dl className="space-y-4">
        <div>
          <dt className="font-semibold text-white">Ako funguje lead scoring?</dt>
          <dd className="mt-1">
            Scoring je výsledkom viacvrstvového AI modelu, ktorý hodnotí: (i) behaviorálne signály (rýchlosť odpovede, čas
            interakcie, obsah správ), (ii) demografické atribúty, (iii) historické vzory konverzie, (iv) zhodu s dostupnými
            nehnuteľnosťami. Skóre je na škále 0–100. Výsledky sú prezentované s vysvetlením kľúčových faktorov (explainability
            light).
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Je AI systém explainable / transparentný?</dt>
          <dd className="mt-1">
            Revolis.AI poskytuje &quot;Explainability Light&quot; — t.j. pre každé rozhodnutie AI systému (scoring, odporúčanie,
            prioritizácia) poskytujeme top 3–5 faktorov, ktoré rozhodnutie ovplyvnili. Nezverejňujeme internú architektúru
            modelov, váhy ani trénovacie dáta. Toto je v súlade s Článkom 22 GDPR a požiadavkami EU AI Act (High-Risk AI).
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Kto nesie zodpovednosť za rozhodnutia AI?</dt>
          <dd className="mt-1">
            Revolis.AI poskytuje AI odporúčania ako podporné nástroje — nie záväzné rozhodnutia. Finálne obchodné rozhodnutia
            (kontaktovanie klienta, cenová ponuka, uzatvorenie zmluvy) robí vždy ľudský maklér. Klient zodpovedá za správne
            použitie AI výstupov v súlade s Článkom 22 GDPR. Zodpovednosť za škody spôsobené nesprávnou interpretáciou AI
            výstupov nesie Klient.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Je systém v súlade s EU AI Act?</dt>
          <dd className="mt-1">
            Revolis.AI aktívne pracuje na súlade s EU AI Act (platný od augusta 2026). CRM AI scoring je klasifikovaný ako
            systém so stredným rizikom. Implementujeme: (i) register AI systémov, (ii) hodnotenie rizík, (iii) ľudský dohľad,
            (iv) dokumentáciu tréningových dát, (v) monitoring výkonu.
          </dd>
        </div>
      </dl>

      <h3 className="text-lg font-semibold text-white">Sekcia C — Bezpečnosť</h3>
      <LegalDataTable
        headers={["Otázka", "Odpoveď"]}
        rows={[
          ["SOC 2 certifikácia?", "V procese — Q4 2026 (Type I)"],
          ["ISO 27001?", "Roadmapa 2027"],
          ["Penetračné testovanie?", "Ročne, externý subjekt — report dostupný po NDA"],
          ["Bug bounty program?", "Áno — security@revolis.ai"],
          ["Backup & DR?", "RPO 24h, RTO 4h pre P1 incidenty"],
          ["Šifrovanie?", "AES-256 v pokoji, TLS 1.3 v prenose"],
        ]}
      />
    </LegalSection>
  );
}
