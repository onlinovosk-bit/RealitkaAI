import { LegalCallout, LegalSection } from "@/components/legal/legal-doc-blocks";

export default function MsaDocument() {
  return (
    <LegalSection id="msa" eyebrow="Dokument 1" title="MASTER SERVICE AGREEMENT (MSA)">
      <p className="font-medium text-white/95">Zmluva o poskytovaní služieb — Revolis.AI Platform</p>
      <p>
        Táto Zmluva o poskytovaní hlavných služieb (ďalej len &quot;MSA&quot; alebo &quot;Zmluva&quot;) je uzatvorená medzi
        spoločnosťou ONLINOVO, s. r. o. (ďalej len &quot;Poskytovateľ&quot;), ktorá prevádzkuje produkt Revolis.AI, a klientom
        uvedeným v príslušnom Objednávkovom formulári (ďalej len &quot;Klient&quot;). MSA tvorí právny základ pre všetky
        objednávky, dodatky a prílohy.
      </p>

      <h3 className="text-lg font-semibold text-white">Článok 1 — Definície</h3>
      <p>Pre účely tejto Zmluvy platia nasledujúce definície:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong className="text-white/95">&quot;Platforma&quot;</strong> znamená SaaS riešenie pod obchodným názvom
          Revolis.AI, ktoré Poskytovateľ prevádzkuje, vrátane všetkých modulov, API, AI komponentov, analytiky a súvisiacej
          dokumentácie.
        </li>
        <li>
          <strong className="text-white/95">&quot;AI Asistent&quot;</strong> znamená Sofia alebo iné AI agenty prevádzkované
          Poskytovateľom, ktoré automatizovane komunikujú s leadmi a kontaktmi Klienta.
        </li>
        <li>
          <strong className="text-white/95">&quot;Zákaznícke dáta&quot;</strong> znamenajú všetky dáta zadané Klientom alebo
          importované do Platformy, vrátane kontaktov, leadov, komunikačnej histórie a nahrávok.
        </li>
        <li>
          <strong className="text-white/95">&quot;Výstupné dáta&quot;</strong> znamenajú správy, skóre, odporúčania a
          analytiku generovanú Platformou na základe Zákazníckych dát.
        </li>
        <li>
          <strong className="text-white/95">&quot;Proprietárny model&quot;</strong> znamená AI model, algoritmy, logiku
          skórovania, architektúru neurónových sietí a know-how Poskytovateľa.
        </li>
        <li>
          <strong className="text-white/95">&quot;Výkonnostný poplatok&quot;</strong> znamená variabilnú zložku ceny viazanú
          na dosiahnutie vopred dohodnutých KPI.
        </li>
        <li>
          <strong className="text-white/95">&quot;Dôverné informácie&quot;</strong> zahŕňajú všetky obchodné, technické a
          finančné informácie označené ako dôverné alebo ktoré majú dôverný charakter zo svojej podstaty.
        </li>
      </ul>

      <h3 className="text-lg font-semibold text-white">Článok 2 — Rozsah služieb a licencia</h3>
      <p>
        <strong>2.1</strong> Poskytovateľ udeľuje Klientovi obmedzenú, neexkluzívnu, neprenositeľnú licenciu na používanie
        Platformy počas trvania Zmluvy výhradne pre interné obchodné účely Klienta.
      </p>
      <p>
        <strong>2.2</strong> Licencia nezahŕňa: (i) sublicencovanie tretím stranám, (ii) prístup k zdrojovému kódu, (iii)
        reverse engineering, dekompiláciu alebo disassembly akejkoľvek časti Platformy, (iv) vytváranie odvodených diel, (v)
        benchmarking Platformy voči konkurenčným produktom bez písomného súhlasu Poskytovateľa.
      </p>
      <p>
        <strong>2.3</strong> Klient výslovne potvrdzuje, že Platforma je poskytovaná ako &quot;black-box&quot; služba.
        Poskytovateľ nie je povinný zverejniť internú logiku, váhy modelov, trénovacie dáta ani architektúru AI systémov.
        Klientovi je poskytnutý &quot;explainability light&quot; výstup — t.j. vysvetlenie výsledkov na úrovni vstup/výstup,
        nie na úrovni vnútornej štruktúry modelu.
      </p>

      <h3 className="text-lg font-semibold text-white">Článok 3 — Cena, fakturácia a Výkonnostný poplatok</h3>
      <p>
        <strong>3.1</strong> Základný poplatok (Base Fee): Mesačný/ročný poplatok podľa Objednávkového formulára, splatný
        vopred do 14 dní od vystavenia faktúry.
      </p>
      <p>
        <strong>3.2</strong> Výkonnostný poplatok (Performance Fee): Variabilná zložka vypočítaná na základe dosiahnutých KPI
        definovaných v Prílohe A. KPI môžu zahŕňať: počet kvalifikovaných leadov, mieru konverzie, čas odpovede AI, skóre
        angažovanosti.
      </p>
      <p>
        <strong>3.3</strong> Meranie výkonu: Poskytovateľ poskytne mesačný výkonnostný report do 5 pracovných dní po skončení
        každého fakturačného obdobia. Klient má 10 dní na písomné spochybnenie reportu. Nespochybnený report sa považuje za
        akceptovaný.
      </p>
      <p>
        <strong>3.4</strong> Eskalácia ceny: Poskytovateľ je oprávnený zvýšiť Base Fee jedenkrát ročne maximálne o hodnotu
        inflačného indexu CPI publikovaného Štatistickým úradom SR, s oznámením 60 dní vopred.
      </p>
      <p>
        <strong>3.5</strong> Omeškanie: Faktúry nezaplatené do 30 dní od splatnosti sa úročia sadzbou 1,5% mesačne.
        Poskytovateľ si vyhradzuje právo pozastaviť prístup po 15 dňoch omeškania.
      </p>

      <h3 className="text-lg font-semibold text-white">Článok 4 — Dôvernosť a ochrana obchodného tajomstva</h3>
      <p>
        <strong>4.1</strong> Každá strana sa zaväzuje zachovávať mlčanlivosť o Dôverných informáciách druhej strany a použiť
        ich výhradne na plnenie tejto Zmluvy.
      </p>
      <p>
        <strong>4.2</strong> Klient výslovne uznáva, že nasledujúce informácie sú obchodným tajomstvom Poskytovateľa: (i)
        logika AI skórovania a predikcie, (ii) prompt engineering a systémové nastavenia AI, (iii) architektúra modelov a
        trénovacie metodológie, (iv) interné benchmarky a výkonnostné metriky Platformy, (v) roadmapa produktu a plánované
        funkcionality.
      </p>
      <p>
        <strong>4.3</strong> Zákaz analýzy systému: Zákazník nesmie analyzovať, dekompilovať ani sa pokúšať odvodiť logiku,
        algoritmickú štruktúru ani vnútorné parametre systému. Toto zahŕňa akékoľvek technické postupy, automatizované
        nástroje alebo manuálne pozorovanie vzorcov správania systému s cieľom napodobniť alebo reprodukovať jeho fungovanie.
      </p>
      <p>
        <strong>4.4</strong> Zákaz benchmarkingu: Klient nesmie používať Platformu na benchmarkingové účely ani
        porovnávanie s konkurenčnými produktmi bez predchádzajúceho písomného súhlasu Poskytovateľa. Výsledky akéhokoľvek
        interného testovania nesmú byť zverejnené.
      </p>
      <p>
        <strong>4.5</strong> Záväzok dôvernosti trvá 5 rokov po skončení Zmluvy, pri obchodných tajomstvách bez časového
        obmedzenia.
      </p>

      <h3 className="text-lg font-semibold text-white">Článok 5 — Vlastníctvo duševného vlastníctva</h3>
      <p>
        <strong>5.1</strong> Platforma, vrátane všetkých AI modelov, algoritmov, softvéru, databáz, dizajnových prvkov a
        dokumentácie, je a zostáva výhradným vlastníctvom Poskytovateľa. Klient nezískava žiadne vlastnícke práva k Platforme.
      </p>
      <p>
        <strong>5.2</strong> Zákaznícke dáta zostávajú majetkom Klienta. Poskytovateľ získava licenciu na spracovanie
        Zákazníckych dát výhradne za účelom poskytovania služieb podľa tejto Zmluvy.
      </p>
      <p>
        <strong>5.3</strong> Výstupné dáta: Správy a analytické výstupy generované Platformou sú vlastníctvom Klienta. Avšak
        metodológia, modely a logika použitá na ich generovanie ostáva výhradným duševným vlastníctvom Poskytovateľa.
      </p>
      <p>
        <strong>5.4</strong> Vylepšenia: Akékoľvek vylepšenia, opravy alebo rozšírenia Platformy vykonané na základe spätnej
        väzby Klienta sú výhradným vlastníctvom Poskytovateľa, pokiaľ sa nedohodne inak písomne.
      </p>

      <h3 className="text-lg font-semibold text-white">Článok 6 — Trvanie a ukončenie</h3>
      <p>
        <strong>6.1</strong> Zmluva nadobúda platnosť dátumom podpisu a trvá počiatočné obdobie uvedené v Objednávkovom
        formulári (minimálne 12 mesiacov). Po uplynutí počiatočného obdobia sa automaticky predlžuje o 12 mesiacov, pokiaľ
        ktorákoľvek strana nedoručí písomné oznámenie o ukončení aspoň 90 dní pred koncom obdobia.
      </p>
      <p>
        <strong>6.2</strong> Okamžité ukončenie: Poskytovateľ môže okamžite ukončiť zmluvu ak: (i) Klient porušil Článok 4
        (Dôvernosť), (ii) Klient sa pokúsil o reverse engineering, (iii) Klient je v platobnej neschopnosti, (iv) Klient
        porušil podmienky licencie.
      </p>
      <p>
        <strong>6.3</strong> Po ukončení: Klient má právo na export Zákazníckych dát do 30 dní od ukončenia v štandardnom
        formáte (CSV, JSON). Po uplynutí tejto lehoty budú dáta bezpečne vymazané podľa DPA. Prístup k Platforme bude okamžite
        deaktivovaný po ukončení zmluvy.
      </p>
      <p>
        <strong>6.4</strong> Zákazník má právo exportovať svoje kontaktné dáta a históriu komunikácie. Zákazník však nemôže
        replikovať AI logiku, modely ani metodológiu, ktoré ostávajú výhradným vlastníctvom Poskytovateľa.
      </p>

      <LegalCallout variant="warn" title="Lock-in stratégia — kľúčová klauzula">
        <p>
          Klient má plný export dát (kontakty, história, analytika). Nemôže však nahradiť AI logiku, prediktívne modely ani
          metodológiu skórovania — tieto zostávajú výhradným know-how Poskytovateľa. Toto vytvára hodnotový lock-in bez pocitu
          uzamknutia.
        </p>
      </LegalCallout>
    </LegalSection>
  );
}
