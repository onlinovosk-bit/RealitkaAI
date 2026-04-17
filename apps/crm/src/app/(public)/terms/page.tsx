import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "VOP | Revolis.AI",
  description:
    "Všeobecné obchodné podmienky pre používanie cloudovej služby Revolis.AI (ONLINOVO, s. r. o.).",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="VŠEOBECNÉ OBCHODNÉ PODMIENKY (VOP)"
      subtitle="pre používanie cloudovej služby Revolis.AI"
    >
      <div className="space-y-8 text-sm leading-relaxed text-slate-300">
        <section>
          <h2 className="text-base font-semibold text-white">1. Prevádzkovateľ služby (Poskytovateľ)</h2>
          <p className="mt-3">
            <strong className="text-slate-100">ONLINOVO, s. r. o.</strong> Sídlo: Štúrova 130/25, 058 01 Poprad,
            Slovenská republika IČO: 54 166 942 DIČ: 2121592869 IČ DPH: SK2121592869 Zapísaná v Obchodnom registri
            Okresného súdu Prešov, oddiel: Sro, vložka č. 43306/P (ďalej len „Poskytovateľ“)
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">2. Úvodné ustanovenia a povaha Služby</h2>
          <h3 className="mt-3 text-sm font-semibold text-slate-100">2.1</h3>
          <p className="mt-1">
            Tieto VOP upravujú práva a povinnosti medzi Poskytovateľom a právnickými osobami alebo fyzickými osobami
            – podnikateľmi (najmä realitnými kanceláriami a maklérmi), ktorí využívajú platformu Revolis.AI (ďalej len
            „Zákazník“).
          </p>
          <h3 className="mt-4 text-sm font-semibold text-slate-100">2.2</h3>
          <p className="mt-1">
            Služba Revolis.AI je cloudové softvérové riešenie (SaaS) využívajúce algoritmy umelej inteligencie (AI) na
            analýzu dát, behaviorálny scoring a prediktívne párovanie nehnuteľností.
          </p>
          <h3 className="mt-4 text-sm font-semibold text-slate-100">2.3 AI Disclaimer</h3>
          <p className="mt-1">
            Zákazník berie na vedomie, že výstupy AI sú generované na základe pravdepodobnostných modelov a slúžia ako
            podklad pre rozhodovanie. Poskytovateľ neručí za 100&nbsp;% presnosť predikcií.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">3. Uzatvorenie zmluvy a Účet</h2>
          <h3 className="mt-3 text-sm font-semibold text-slate-100">3.1</h3>
          <p className="mt-1">
            Zmluva sa uzatvára registráciou v rozhraní Služby alebo podpisom osobitnej Objednávky.
          </p>
          <h3 className="mt-4 text-sm font-semibold text-slate-100">3.2</h3>
          <p className="mt-1">
            Zákazník zodpovedá za aktuálnosť údajov a zabezpečenie prístupových hesiel. Akékoľvek zneužitie účtu je
            Zákazník povinný okamžite nahlásiť na:{" "}
            <a href="mailto:support@revolis.ai" className="text-cyan-300 underline hover:text-cyan-200">
              support@revolis.ai
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">4. Práva a povinnosti strán (AUP)</h2>
          <h3 className="mt-3 text-sm font-semibold text-slate-100">4.1 Povolený účel</h3>
          <p className="mt-1">
            Zákazník sa zaväzuje využívať Službu výhradne na zákonné účely v rámci realitnej činnosti.
          </p>
          <h3 className="mt-4 text-sm font-semibold text-slate-100">4.2 Obsah Zákazníka</h3>
          <p className="mt-1">
            Zákazník vyhlasuje, že disponuje všetkými právnymi titulmi (súhlasmi) na vloženie dát (vrátane leadov a
            fotografií) do Služby.
          </p>
          <h3 className="mt-4 text-sm font-semibold text-slate-100">4.3 Zákaz preťažovania</h3>
          <p className="mt-1">
            Zákazník nesmie vykonávať automatizované dopyty (scraping) alebo inak zaťažovať infraštruktúru nad rámec
            bežného používania.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">5. Platobné podmienky</h2>
          <h3 className="mt-3 text-sm font-semibold text-slate-100">5.1</h3>
          <p className="mt-1">
            Služba je poskytovaná za odplatu podľa aktuálneho Cenníka zverejneného na webovom sídle Poskytovateľa.
          </p>
          <h3 className="mt-4 text-sm font-semibold text-slate-100">5.2</h3>
          <p className="mt-1">
            Splatnosť faktúr je 14 dní od ich vystavenia, ak nie je dohodnuté inak. Platba prebieha spravidla formou
            predplatného.
          </p>
          <h3 className="mt-4 text-sm font-semibold text-slate-100">5.3</h3>
          <p className="mt-1">
            Pri omeškaní dlhšom ako 15 dní je Poskytovateľ oprávnený pozastaviť prístup k Službe bez straty nároku na
            úhradu poplatkov.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">6. Ochrana osobných údajov (GDPR)</h2>
          <h3 className="mt-3 text-sm font-semibold text-slate-100">6.1 Vzťah strán</h3>
          <p className="mt-1">
            Poskytovateľ je Sprostredkovateľom a Zákazník je Prevádzkovateľom v zmysle čl. 28 GDPR.
          </p>
          <h3 className="mt-4 text-sm font-semibold text-slate-100">6.2 DPA</h3>
          <p className="mt-1">
            Podrobnosti o spracúvaní osobných údajov sú upravené v Zmluve o spracúvaní osobných údajov (DPA), ktorá
            tvorí neoddeliteľnú Prílohu č. 1 týchto VOP.
          </p>
          <h3 className="mt-4 text-sm font-semibold text-slate-100">6.3 Anonymizácia</h3>
          <p className="mt-1">
            Poskytovateľ je oprávnený využívať anonymizované a agregované dáta (zbavené osobných údajov) na účely
            trénovania AI modelov a zlepšovania algoritmov Služby.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">7. Duševné vlastníctvo</h2>
          <h3 className="mt-3 text-sm font-semibold text-slate-100">7.1</h3>
          <p className="mt-1">
            Poskytovateľ udeľuje Zákazníkovi obmedzenú, nevýhradnú a odvolateľnú licenciu (sublicenciu) na používanie
            Služby.
          </p>
          <h3 className="mt-4 text-sm font-semibold text-slate-100">7.2</h3>
          <p className="mt-1">
            Zdrojový kód, dizajn a algoritmy ostávajú výhradným vlastníctvom spoločnosti ONLINOVO, s. r. o.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">8. Zodpovednosť za škodu</h2>
          <h3 className="mt-3 text-sm font-semibold text-slate-100">8.1</h3>
          <p className="mt-1">
            Poskytovateľ nezodpovedá za nepriame škody, ušlý zisk alebo stratu obchodných príležitostí vzniknutú na
            základe AI predikcií.
          </p>
          <h3 className="mt-4 text-sm font-semibold text-slate-100">8.2 Limitácia</h3>
          <p className="mt-1">
            Celková úhrnná zodpovednosť Poskytovateľa za všetky nároky súvisiace so Zmluvou je limitovaná sumou, ktorú
            Zákazník skutočne zaplatil Poskytovateľovi za posledných 12 mesiacov pred vznikom škody.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">9. Ukončenie zmluvy a export dát</h2>
          <h3 className="mt-3 text-sm font-semibold text-slate-100">9.1</h3>
          <p className="mt-1">
            Zmluvu je možné vypovedať písomne (aj e-mailom) s výpovednou lehotou 1 kalendárny mesiac, začínajúcou
            plynúť od prvého dňa mesiaca nasledujúceho po doručení výpovede.
          </p>
          <h3 className="mt-4 text-sm font-semibold text-slate-100">9.2 Lehota na export</h3>
          <p className="mt-1">
            Po ukončení zmluvy má Zákazník 30 dní na export svojich dát zo systému. Po uplynutí tejto lehoty budú dáta
            nenávratne vymazané.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">10. Záverečné ustanovenia</h2>
          <h3 className="mt-3 text-sm font-semibold text-slate-100">10.1</h3>
          <p className="mt-1">Rozhodným právom je právo Slovenskej republiky.</p>
          <h3 className="mt-4 text-sm font-semibold text-slate-100">10.2</h3>
          <p className="mt-1">Prípadné spory budú riešené vecne príslušným súdom v Slovenskej republike.</p>
          <h3 className="mt-4 text-sm font-semibold text-slate-100">10.3</h3>
          <p className="mt-1">
            Poskytovateľ si vyhradzuje právo na zmenu VOP. Zmena je účinná 30. dňom od oznámenia Zákazníkovi.
          </p>
        </section>

        <p className="border-t border-slate-700 pt-6 text-slate-400">V Poprade, dňa 3.4.2026</p>
      </div>
    </LegalPageShell>
  );
}
