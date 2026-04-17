import { LegalCallout, LegalDataTable, LegalSection } from "@/components/legal/legal-doc-blocks";

export default function DpaDocument() {
  return (
    <LegalSection id="dpa" eyebrow="Dokument 2" title="DATA PROCESSING AGREEMENT (DPA) — GDPR">
      <p>
        Táto Dohoda o spracovaní osobných údajov (ďalej len &quot;DPA&quot;) tvorí neoddeliteľnú súčasť MSA a upravuje
        spracovanie osobných údajov v súlade s Nariadením GDPR (EÚ) 2016/679. Spracovateľom v zmysle tejto DPA je spoločnosť
        ONLINOVO, s. r. o., ktorá prevádzkuje službu Revolis.AI.
      </p>

      <h3 className="text-lg font-semibold text-white">Článok 1 — Identifikácia strán v zmysle GDPR</h3>
      <LegalDataTable
        headers={["Rola", "Strana"]}
        rows={[
          ["Prevádzkovateľ (Controller)", "Klient — určuje účel a prostriedky spracovania"],
          ["Spracovateľ (Processor)", "ONLINOVO, s. r. o. — služba Revolis.AI; spracúva v mene Klienta"],
          ["Subprocesori", "Viď Príloha B — zoznam subprocesorov"],
        ]}
      />

      <h3 className="text-lg font-semibold text-white">Článok 2 — Predmet a rozsah spracovania</h3>
      <p>Spracovateľ spracúva osobné údaje výhradne na nasledujúce účely:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Prevádzka CRM funkcionality a správa kontaktov</li>
        <li>Automatizovaná AI komunikácia s leadmi (meno, tel. číslo, e-mail, obsah správ)</li>
        <li>Lead scoring a prediktívna analytika</li>
        <li>Generovanie reportov a štatistík pre Klienta</li>
        <li>Technická podpora a riešenie incidentov</li>
      </ul>
      <p>Spracovanie na iné účely je zakázané bez predchádzajúceho písomného súhlasu Klienta.</p>

      <h3 className="text-lg font-semibold text-white">Článok 3 — Uloženie dát a jurisdikcia</h3>
      <LegalCallout variant="info" title="Lokácia dát">
        <p>
          Všetky osobné údaje sú uložené výhradne na serveroch v EÚ (primárne: Frankfurt, DE alebo Amsterdam, NL). Prenos mimo
          EÚ sa uskutočňuje len na základe SCC (Standard Contractual Clauses) schválených Európskou komisiou.
        </p>
      </LegalCallout>
      <LegalDataTable
        headers={["Aspekt", "Detail"]}
        rows={[
          ["Primárne dátové centrum", "EÚ (AWS eu-central-1 / Frankfurt)"],
          ["Zálohovanie", "EÚ (AWS eu-west-1 / Írsko)"],
          ["Prístup tretích strán", "Len subprocesori v Prílohe B, viazaní DPA"],
          ["Šifrovanie v pokoji", "AES-256"],
          ["Šifrovanie pri prenose", "TLS 1.3"],
          ["Retenčná politika", "Dáta uchováme max. 90 dní po ukončení zmluvy"],
          ["Zálohy", "Denné zálohy, uchovávané max. 30 dní"],
        ]}
      />

      <h3 className="text-lg font-semibold text-white">Článok 4 — Práva dotknutých osôb</h3>
      <p>
        Poskytovateľ sa zaväzuje poskytnúť Klientovi technické prostriedky na splnenie nasledujúcich práv do 72 hodín od
        prijatia žiadosti:
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Právo na prístup (Článok 15 GDPR) — export všetkých osobných údajov dotknutej osoby</li>
        <li>Právo na opravu (Článok 16 GDPR) — úprava nepresných údajov</li>
        <li>Právo na výmaz (Článok 17 GDPR) — trvalé vymazanie z aktívnych databáz a zálohovacích systémov do 30 dní</li>
        <li>Právo na prenosnosť (Článok 20 GDPR) — export v strojovo čitateľnom formáte (CSV/JSON)</li>
        <li>Právo namietať automatizované rozhodovanie (Článok 22 GDPR) — možnosť opt-out z AI skórovania</li>
      </ul>
      <LegalCallout variant="warn" title="AI a automatizované rozhodovanie">
        <p>
          Systém Revolis.AI vykonáva automatizované profilovanie leadov. V súlade s Článkom 22 GDPR Klient zabezpečí
          informovanie dotknutých osôb a poskytne mechanizmus na ľudský preskúmanie rozhodnutí. Spracovateľ poskytne
          &quot;explainability light&quot; výstupy na tento účel.
        </p>
      </LegalCallout>

      <h3 className="text-lg font-semibold text-white">Článok 5 — Bezpečnostné opatrenia</h3>
      <p>Spracovateľ implementuje nasledujúce technické a organizačné opatrenia (TOMs):</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Šifrovanie: AES-256 v pokoji, TLS 1.3 pri prenose</li>
        <li>Prístupová kontrola: RBAC (Role-Based Access Control), MFA povinné pre administrátorov</li>
        <li>Monitorovanie: 24/7 SIEM monitoring, automatická detekcia anomálií</li>
        <li>Penetračné testovanie: minimálne raz ročne externým subjektom</li>
        <li>Zálohovanie: denné zálohy, testovanie obnovy štvrťročne</li>
        <li>Incident response: oznámenie incidentu do 72 hodín v súlade s Článkom 33 GDPR</li>
        <li>Employee training: ročné GDPR školenia pre všetkých zamestnancov</li>
      </ul>

      <h3 className="text-lg font-semibold text-white">Článok 6 — Subprocesori</h3>
      <p>Klient udeľuje Spracovateľovi generálne povolenie na zapojenie subprocesorov za nasledujúcich podmienok:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Každý subprocesor musí byť viazaný DPA s porovnateľnou úrovňou ochrany</li>
        <li>Spracovateľ informuje Klienta o zmene subprocesorov 30 dní vopred</li>
        <li>Klient má právo namietať zmenu do 15 dní — v takom prípade strany rokujú o riešení</li>
      </ul>
      <LegalDataTable
        headers={["Subprocesor", "Účel / Lokácia"]}
        rows={[
          ["AWS (Amazon Web Services)", "Hosting infraštruktúra — EÚ (Frankfurt)"],
          ["Supabase / PostgreSQL", "Databáza — EÚ"],
          ["OpenAI API", "Jazykové modely AI — USA (SCC)"],
          ["Resend / SendGrid", "Email doručovanie — EÚ"],
          ["Twilio / WhatsApp Business API", "SMS/WA komunikácia — EÚ/USA (SCC)"],
        ]}
      />
    </LegalSection>
  );
}
