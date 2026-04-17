import { LegalCallout, LegalDataTable, LegalSection } from "@/components/legal/legal-doc-blocks";

/** Doplnkové VOP k MSA (enterprise) — odlišné od verejných VOP pre self-serve na /terms */
export default function EnterpriseVopDocument() {
  return (
    <LegalSection
      id="vop"
      eyebrow="Dokument 6"
      title="VŠEOBECNÉ OBCHODNÉ PODMIENKY (VOP) — Doplnok k MSA"
    >
      <p>
        Tieto Všeobecné obchodné podmienky (VOP) dopĺňajú MSA a platia pre všetkých užívateľov Platformy Revolis.AI, ktorú
        prevádzkuje ONLINOVO, s. r. o. Pre self-serve podmienky toho istého prevádzkovateľa pri produkte Revolis.AI pozri tiež{" "}
        <a href="/terms" className="text-cyan-400 underline hover:text-cyan-300">
          verejné VOP
        </a>
        .
      </p>

      <h3 className="text-lg font-semibold text-white">Článok 1 — Prijateľné používanie (AUP)</h3>
      <p>Klient a jeho používatelia sa zaväzujú Platformu nepoužívať na:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Akúkoľvek ilegálnu činnosť alebo aktivitu porušujúcu práva tretích strán</li>
        <li>Spamovanie, hromadné nevyžiadané správy alebo obchádzanie anti-spam pravidiel</li>
        <li>Zber alebo harvesting osobných údajov bez právneho základu</li>
        <li>Zdieľanie prihlasovacích údajov s neoprávnenými osobami</li>
        <li>Pokusy o obídenie bezpečnostných opatrení alebo neoprávnený prístup k systémom</li>
        <li>Reverse engineering, dekompiláciu alebo analýzu AI modelov a ich logiky</li>
        <li>Benchmarking voči konkurenčným produktom bez súhlasu</li>
        <li>Vytváranie automatizovaných skriptov na masívne testovanie AI odpovedí s cieľom odvodiť logiku systému</li>
      </ul>

      <h3 className="text-lg font-semibold text-white">Článok 2 — Limity používania (API &amp; Export)</h3>
      <p>Platforma podlieha nasledujúcim technickým limitom na ochranu integrity systému:</p>
      <LegalDataTable
        headers={["Limit", "Štandard / Poznámka"]}
        rows={[
          ["API volania", "1 000 / hodinu / organizácia (navýšenie na požiadanie)"],
          ["Export kontaktov", "Max. 10 000 záznamov / deň / organizácia"],
          ["Dávkový import", "Max. 50 000 kontaktov / mesiac (Standard tier)"],
          ["Concurrent sessions", "Max. 10 súčasných relácií na účet"],
          ["AI správy", "Podľa tarifného plánu (napr. 5 000 / mesiac)"],
          ["Webhooky", "Max. 50 endpoint konfigurácií"],
        ]}
      />
      <LegalCallout variant="info" title="Účel limitov">
        <p>
          Tieto limity slúžia na ochranu stability systému pre všetkých klientov a na ochranu duševného vlastníctva
          Poskytovateľa. Systém monitoruje vzory používania na detekciu pokusov o analýzu AI logiky prostredníctvom hromadného
          testovania.
        </p>
      </LegalCallout>

      <h3 className="text-lg font-semibold text-white">Článok 3 — Zmeny podmienok</h3>
      <p>
        Poskytovateľ si vyhradzuje právo zmeniť VOP s 30-dňovým predchádzajúcim písomným oznámením. Pokračovaním v používaní
        Platformy po nadobudnutí účinnosti zmien Klient vyjadruje súhlas. V prípade nesúhlasu má Klient právo ukončiť zmluvu
        bez sankcií v 30-dňovej lehote.
      </p>

      <h3 className="text-lg font-semibold text-white">Článok 4 — Rozhodné právo a riešenie sporov</h3>
      <p>
        Táto Zmluva sa riadi slovenským právom (prípadne anglickým právom pri výslovnej dohode). Spory budú riešené primárne
        rokovaním. Ak rokovanie zlyhá do 30 dní, spor bude postúpený: (i) mediácii (ďalších 30 dní), (ii) príslušnému súdu v
        Bratislave, prípadne arbitráži ICC.
      </p>
    </LegalSection>
  );
}
