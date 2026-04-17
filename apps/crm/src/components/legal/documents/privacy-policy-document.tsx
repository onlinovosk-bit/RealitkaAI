import { LegalCallout, LegalDataTable, LegalSection } from "@/components/legal/legal-doc-blocks";

export default function PrivacyPolicyDocument() {
  return (
    <LegalSection id="privacy-core" eyebrow="Dokument 3" title="PRIVACY POLICY — OCHRANA OSOBNÝCH ÚDAJOV">
      <p>
        Táto Zásada ochrany osobných údajov popisuje, ako spoločnosť ONLINOVO, s. r. o., ako prevádzkovateľ spracúva osobné
        údaje v súvislosti s poskytovaním služby Revolis.AI, a to v súlade s GDPR a slovenským zákonom č. 18/2018 Z.z. o
        ochrane osobných údajov.
      </p>

      <h3 className="text-lg font-semibold text-white">1. Používame vaše dáta na tréning AI?</h3>
      <LegalCallout variant="info" title="Jasná odpoveď">
        <p>
          <strong className="text-white">NIE.</strong> ONLINOVO ako prevádzkovateľ služby Revolis.AI nikdy nepoužíva
          Zákaznícke dáta (kontakty, komunikáciu, leads) na tréning AI modelov. Naše modely sú trénované na anonymizovaných,
          syntetických alebo verejne dostupných dátach. Zákaznícke dáta slúžia výhradne na poskytovanie personalizovanej služby
          Revolis.AI pre konkrétneho Klienta.
        </p>
      </LegalCallout>

      <h3 className="text-lg font-semibold text-white">2. Kategórie spracovávaných údajov</h3>
      <LegalDataTable
        headers={["Kategória", "Príklady / Účel"]}
        rows={[
          ["Identifikačné údaje", "Meno, e-mail, telefón — správa kontaktov"],
          ["Komunikačné údaje", "Obsah správ, e-mailov — AI komunikácia"],
          ["Behaviorálne údaje", "Interakcie, odpovede, kliknutia — scoring"],
          ["Demografické údaje", "Lokalita, preferencia nehnuteľnosti — matching"],
          ["Technické metadáta", "IP adresa, čas prístupu — bezpečnosť"],
        ]}
      />

      <h3 className="text-lg font-semibold text-white">3. Retenčná politika</h3>
      <LegalDataTable
        headers={["Typ dát", "Retenčná lehota"]}
        rows={[
          ["Aktívne zákaznícke dáta", "Počas trvania zmluvy"],
          ["Zálohy po ukončení", "Max. 90 dní od ukončenia zmluvy"],
          ["Technické logy", "Max. 12 mesiacov"],
          ["Fakturačné záznamy", "10 rokov (daňová povinnosť)"],
          ["Anonymizovaná analytika", "Bez časového obmedzenia"],
        ]}
      />

      <h3 className="text-lg font-semibold text-white">4. Práva dotknutých osôb</h3>
      <p>
        Dotknuté osoby môžu uplatniť svoje práva prostredníctvom: privacy@revolis.ai alebo písomne na adrese sídla spoločnosti.
        Každú žiadosť spracujeme do 30 dní (predĺžiteľné o ďalších 60 dní v zložitých prípadoch).
      </p>

      <h3 className="text-lg font-semibold text-white">5. Cookies a sledovanie</h3>
      <p>
        Webová aplikácia produktu Revolis.AI používa: (i) Technicky nevyhnutné cookies, (ii) Analytické cookies (Google Analytics —
        anonymizácia IP), (iii) Funkčné cookies pre zachovanie relácie. Marketingové/trackingové cookies od tretích strán
        nepoužívame bez vášho súhlasu.
      </p>
    </LegalSection>
  );
}
