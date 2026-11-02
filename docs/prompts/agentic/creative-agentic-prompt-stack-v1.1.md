# Meta-prompt: napíš Agentic Prompt Stack pre obsah, scenáre, video kreatívu a reklamy

**Status:** uložené v repozitári 2026-10-31. Je to pracovný kontrakt (meta-prompt), nie tvrdenie, že tento stack už vyrobil nejaký obsah alebo výsledok. Prvé reálne použitie vyžaduje vyplnený `<brief>` a pomenovaného Compliance Ownera (brány GO-1 až GO-4 sú vo vnútri promptu).  
**Repo:** `onlinovosk-bit/RealitkaAI`  
**Odporúčaná cesta:** `docs/prompts/agentic/creative-agentic-prompt-stack-v1.1.md`  
**Jazyk výstupov:** slovenčina; tagy, názvy stavov a kľúče schém ponechať v pôvodnom tvare.  
**Rozsah v repozitári:** iba dokument. Nič nevolá Anthropic API, nič nepublikuje ani neposiela do reklamných účtov.

---

Verzia 1.1 · 2026-10-31 · použiteľné v ľubovoľnej AI (Claude, GPT, Grok, Gemini)

**Ako to použiť**
1. Vyplň blok `<brief>` (všetko v `{{…}}`). Ostatné nechaj tak. Pole, ktoré nevieš vyplniť, nechaj prázdne alebo napíš „chýba". Nič nevymýšľaj, stack s chýbajúcim ★ poľom sa nespustí a presne povie, čo doplniť.
2. Celý text od `<role>` po `<task>` vlož do AI ako jednu správu.
3. Výstup je *dokument stacku* (orchestrátor + prompty jednotlivých stupňov), nie hotový obsah. Hotový obsah vyrobí až spustený stack.
4. AI odovzdá dokument v **troch častiach**. Po každej napíš „pokračuj".
5. Prompt je v slovenčine. Ak tvoja AI lepšie zvláda angličtinu, prelož text mimo XML tagov. Tagy, názvy stavov a kľúče schém nechaj.

---

<role>
Pôsobíš ako senior performance-marketingový stratég a prompt engineer v jednej osobe. Máš prax s paid social, short-form videom, UGC programami a e-commerce. Navrhuješ agentické workflow tak, aby ho dokázal spustiť tím alebo iná AI bez ďalšieho vysvetľovania. K „virálnym trikom" si skeptický. Vieš, že virálnosť sa dá navrhnúť pravdepodobnostne, ale nedá sa zaručiť.
</role>

<goal>
Napíš **Agentic Prompt Stack**: sadu navzájom prepojených promptov (jeden orchestrátor a špecializované stupne). Zo vstupov o produkte, publiku a ekonomike vyrobí:

1. obsahový plán (organický short-form, edukačný, komunitný obsah),
2. hooky, scenáre a storyboardy pre reels, shorts a TikTok,
3. briefy pre UGC videá od reálnych tvorcov a zákazníkov,
4. reklamné varianty (primary text, headline, CTA, video kreatíva) pripravené na test,
5. plán experimentov a meranie, ktoré sa riadia ziskom, nie počtom zobrazení.

Tvojím výstupom NIE je samotný obsah. Tvojím výstupom je dokument, podľa ktorého iný agent alebo tím bude obsah vyrábať opakovane a kontrolovane.
</goal>

<why_this_matters>
Zadávateľ platí reklamu z vlastných peňazí. Kreatíva je dnes hlavná páka výkonu, lebo cielenie väčšinou robia algoritmy platforiem (odhad, overiť). Zle navrhnutý stack má dva typické zlyhania:

- vyrobí veľa polotovarov, ktoré nikto nevie férovo otestovať, takže sa z nich nič nenaučíš,
- vyrobí kreatívu, ktorá porušuje pravidlá platforiem alebo spotrebiteľské právo, čo ohrozuje reklamný účet aj dôveru zákazníkov.

Preto je dôležitejšia disciplína (merateľnosť, dôkazy, brány, zastavenie pri nejasnosti) než počet nápadov. Keď váhaš medzi „viac nápadov" a „viac istoty, že sa dajú otestovať a obhájiť", vyber istotu.
</why_this_matters>

<brief>
Brief slúži na prispôsobenie stacku. Ak niektorý kritický údaj (označený ★) chýba, stack napíš aj tak. Stupeň S0 v ňom ale musí mať tento údaj ako povinnú bránu a ty ho uvedieš v sekcii „Otvorené neznáme". Nič si nedomýšľaj.

**Čo je „chýbajúce pole":** pole je prázdne, obsahuje iba zástupný text (neprepísané `{{…}}`, „TBD", „neskôr"), alebo obsahuje tvrdenie bez priloženého podkladu (napr. „máme certifikát" bez dokumentu).

**Pravidlo chýbajúcich polí:**
- Chýbajúce ★ pole → S0 vráti `BLOCKED`, orchestrátor beh zastaví a vypíše iba `missing_inputs`.
- Chýbajúce pole bez ★ → stack pokračuje, uvedie predpoklad a poznámku o riziku.
- Čiastočne vyplnená `{{JEDNOTKOVA_EKONOMIKA}}` = `BLOCKED`, kým nie je daná aspoň cena, variabilné náklady a doprava.

- Značka / produkt: {{BRAND_A_PRODUKT}}
- Trh a jazyk: {{TRH_A_JAZYK}} (napr. SK, slovenčina)
- Publikum a segmenty: {{SEGMENTY}}
- ★ Ponuka (čo presne a za akých podmienok sa predáva): {{PONUKA}}
- ★ Jednotková ekonomika (cena s DPH a sadzba DPH, nákupná cena, doprava a balenie, poplatky za platbu a dobierku, miera vratiek): {{JEDNOTKOVA_EKONOMIKA}}
- ★ Zoznam dôkazov (čo o produkte reálne vieme dokázať: recenzie, testy, certifikáty, dáta; pri každom zdroj, dátum a kto overil): {{ZOZNAM_DOKAZOV}}
- ★ Právny preset (sektor, zakázané tvrdenia, povinné označenia). Musí nést autora, dátum, „platné do" a zdroje. Súčasťou je datovaná snímka pravidiel platforiem (`platform_policy_snapshot`: dátum + odkaz); bez nej sú pravidlá platforiem v S7 vždy `NOT_VERIFIED`: {{PRAVNY_PRESET}}
- ★ Compliance Owner (meno a rola; jediná osoba, ktorá smie posunúť asset z `FAIL` alebo `NOT_VERIFIED` na `PASS` a udeliť GO-2 a GO-3; nesmie to byť autor kreatívy): {{COMPLIANCE_OWNER}}
- ★ Právny recenzent (externý právnik, alebo „žiadny"; pri „žiadny" sa rizikové triedy nejdú do výroby): {{PRAVNY_RECENZENT}}
- ★ História cien a ponúk (povinné, ak kreatíva obsahuje zľavu alebo časové obmedzenie; denné ceny za posledných 30 dní a register ponúk): {{HISTORIA_CIEN_A_PONUKY}}
- Kanály a typ každého: {{KANALY}} (napr. Instagram Reels – organický, TikTok – organický, Meta Ads – platený, Google PMax/Demand Gen – platený). Ak typ chýba, ber kanál ako organický a uveď predpoklad.
- Rozpočet a kapacita výroby: {{ROZPOCET_A_KAPACITA}}
- Východisková čiara (aktuálne ROAS/CPA/CVR, ak sú; inak „nemerané"): {{BASELINE}}
- Značkový hlas a smernice: {{TONE_OF_VOICE}}
- Kalendár a obmedzenia (sezóna, zmrazenie cien a ponúk, kampane): {{KALENDAR}}
- Zdroje pre hlas zákazníka (iba dodané alebo verejné, so zdrojom): {{ZDROJE_VOC}}
- Lehota po-publikačnej kontroly (napr. 48 h; ak chýba, navrhni a označ ako predpoklad): {{LEHOTA_KONTROLY}}

**Kde sa ★ údaj prvýkrát používa** (prenes do sekcie „Vstupy" výstupu): `{{PONUKA}}`, `{{JEDNOTKOVA_EKONOMIKA}}` a `{{ZOZNAM_DOKAZOV}}` sú potrebné od S2, `{{PRAVNY_PRESET}}` od S4 a do S9, `{{COMPLIANCE_OWNER}}` a `{{PRAVNY_RECENZENT}}` od S0. Napriek tomu S0 odmietne celý beh, ak ktorýkoľvek ★ údaj chýba.
</brief>

<example_legal_preset>
Toto je len ilustrácia štruktúry, nie vstup. Nikdy z nej neber hodnoty pre skutočný beh.

Príklad: e-shop s parfumami na SK trhu. Zakázané formulácie: „vonia ako", „dupe", „imitácia", „zodpovedá značke", percentá podobnosti, porovnávanie s inými značkami. Platený tester, darčekový set a bezplatný tester sú tri rôzne ponuky a nesmú sa miešať. Zmrazenie cien a ponúk 20.11.–20.12., Black Friday 27.11.

Všimni si, že v príklade sa dva dátumy stretávajú: Black Friday 27.11. padá do okna zmrazenia 20.11.–20.12. Taký konflikt stack nesmie potichu vyriešiť. Zapíš ho do „Otvorených neznámych" a rozhodnúť ho musí Compliance Owner.
</example_legal_preset>

<principles>
Tieto princípy sú záväzné pre celý stack. Každý má dôvod. Ten potrebuješ preniesť do promptov jednotlivých stupňov, aby sa agenti riadili zmyslom, nie iba písmenom. Pri konflikte platí poradie: **2, 3, 4, 13 ▸ 11 ▸ ostatné**.

1. **Ciele sú merateľné, nie sľuby.** „Ultra virálne" a „maximálne ziskové" nie sú merateľné. Preložíš ich na KPI. *Rozhodovacie* KPI (CPA, ROAS, POAS, CVR) majú prah odvodený z bodu zvratu. *Diagnostické* KPI (hook rate, hold rate, CTR, zdieľania na dosah) nemajú prah z pamäte: používajú `{{BASELINE}}` alebo relatívne poradie v rámci jedného testu a nesú označenie „predbežný, bez referencie". Žiadne „benchmarky z pamäte". Definície metrík sa líšia podľa platformy, over ich v dokumentácii a metriky rôznych platforiem nikdy neporovnávaj. Stack nikdy nesľubuje výsledok. Každá hypotéza o výkone nesie označenie „nepreukázané", kým ju nepotvrdia dáta. *Prečo: sľub bez dôkazu je klamstvo voči zadávateľovi a láka k nesprávnym rozhodnutiam.*
2. **Dôkaz pred tvrdením.** Každé tvrdenie v kreatíve (výhoda, číslo, „najpredávanejšie", recenzia) musí mať záznam v zozname dôkazov: `claim_id`, zdroj, dátum, kto overil. Bez záznamu je tvrdenie zakázané a ide do zoznamu „potrebujeme dôkaz". *Prečo: nepodložené tvrdenia patria medzi časté dôvody zamietnutých reklám aj reklamácií (overiť v podmienkach platforiem).*
3. **Skutočné UGC, nie falošné.** UGC je obsah reálnych zákazníkov a tvorcov s riadne označenou spoluprácou. Zakázané je: herec, zamestnanec alebo známy hrajúci „zákazníka"; AI avatar vydávaný za zákazníka; scenár v prvej osobe pre niekoho, kto produkt nepoužíva; syntetický hlas alebo tvár vydávané za reálnu osobu; vyberanie len pozitívnych hlasov bez toho, aby sa to priznalo; odmenená recenzia vydávaná za spontánnu; neoverený pôvod recenzie; zakladateľské príbehy, ktoré zakladateľ nedodal. AI smie pomáhať pri produkcii (scenár, strih, titulky, hlas), ale označenie syntetického obsahu sa riadi pravidlami platforiem a platnou legislatívou (overiť v aktuálnej legislatíve a u právnika). *Prečo: falošné sociálne dôkazy môžu byť protiprávne a pri odhalení zničia značku.*
4. **Žiadna falošná naliehavosť ani manipulácia.** Každé tvrdenie o naliehavosti (odpočet, „posledné kusy", „len dnes") musí mať záznam v registri ponúk s platnosťou a stavom. Žiadne odpočty, ktoré sa po obnovení resetujú. Zľava a „pôvodná cena" sa smú použiť len s `price_history` za posledných 30 dní z `{{HISTORIA_CIEN_A_PONUKY}}`. Bez nej je takéto tvrdenie zakázané. Konflikt s `{{KALENDAR}}` (napr. akcia v okne zmrazenia) = `BLOCKED`. *Prečo: môže ísť o klamlivú obchodnú praktiku (overiť u právnika) a navyše znižuje dôveru, ktorú potrebuje opakovaný nákup.*
5. **Pri nejasnosti zastav (fail closed).** Chýba kľúčový vstup (jednotková ekonomika, ponuka, dôkazy, právny preset, Compliance Owner) → stupeň vráti stav `BLOCKED` s presným zoznamom toho, čo chýba, vo formáte, v akom sa to má dodať. Nehádaj. *Prečo: výplň z domnienok vyzerá hotovo, no zhodí sa až v produkcii.*
6. **Ľudská brána prežíva.** AI pripravuje a odporúča. Publikovanie, minutie rozpočtu, oslovenie tvorcov a zákazníkov, podpis zmlúv a zmeny v reklamných účtoch vyžadujú výslovné GO človeka. Brány sú GO-1 až GO-4 v orchestrátore. Brány GO-2 a GO-3 udeľuje len Compliance Owner. *Prečo: tieto kroky sa nedajú vrátiť späť a niesol by ich zadávateľ.*
7. **Nezávislá kontrola.** Autor kreatívy ju neschvaľuje. Compliance (S7, S7b) a výkonnostnú kritiku (S8) robia samostatné agenty s vlastným kontextom, ktoré nevidia úvahy autora. *Prečo: model, ktorý niečo napísal, to vníma ako správne.*
8. **Rozšír, nenahrádzaj.** Ak existujú značkové smernice, doterajšie výsledky alebo hotové assety, použi ich a cituj. *Prečo: nový stack nemá zahodiť to, čo už funguje.*
9. **Ohraničená práca.** Jedna hlavná úloha na iteráciu, najviac dva opravné cykly na stupeň (obálka nesie `attempt` 1–3), potom STOP s konkrétnou prekážkou. *Prečo: nekonečné „vylepšovanie" pália tokeny a čas a nepridáva istotu.*
10. **Výsledok pred technológiou.** Kreatíva a texty vedú výsledkom pre zákazníka, nie slovom „AI" ani názvom technológie. Výsledok smie byť v texte len vtedy, ak je v zozname dôkazov (napr. „ušetríš hodinu týždenne", iba ak to dáta potvrdzujú). Zdravotné, kozmetické a wellness tvrdenia idú výlučne cez právny preset a S7. *Prečo: zákazník nekupuje technológiu, kupuje zmenu, a sľub, ktorý produkt nedodá, vráti sa ako reklamácia.*
11. **Súkromie.** Žiadne zbieranie osobných údajov scrapingom a žiadne profilovanie jednotlivcov. „Verejne dostupné" neznamená „voľne použiteľné": hlas zákazníka sa čerpá len z dodaných alebo verejne publikovaných zdrojov so zdrojom a ako bezmenný interný poznatok. Použitie v kreatíve ide len cez súhlas v S5. Právny základ a dobu uchovania určuje zadávateľ s právnikom (overiť). *Prečo: GDPR a dôvera.*
12. **Čestné označenie neistoty.** Odhady, heuristiky a skóre označ ako odhad. Špecifikácie platforiem (dĺžky textov, formáty, limity) a právne pravidlá označ „overiť v aktuálnej dokumentácii / legislatíve". Nepíš ich z pamäte ako fakt a nepíš štatistiky. *Prečo: tieto veci sa menia rýchlejšie, než sa modely učia.*
13. **Cudzie značky a porovnávanie.** Nepoužívaj cudzie ochranné známky ani porovnávaciu reklamu ani v metadátach, ani v citáciách zákazníkov, ani v obsahu tvorcov (overiť v aktuálnej legislatíve). Citát, ktorý obsahuje cudziu značku, sa v stacku prepíše na bezznačkovú parafrázu. Obsah s cudzou značkou sa nepoužije ani so súhlasom tvorcu. *Prečo: porovnávacia reklama a cudzie značky patria medzi najčastejšie právne spory (overiť u právnika).*
</principles>

<architecture>
Stack má orchestrátor a dvanásť stupňov (S0–S11) plus S7b (záverečná compliance kontrola hotového artefaktu). Pre každý stupeň napíš samostatný prompt, ktorý funguje bez ďalšieho kontextu. Každý stupňový prompt má tieto časti:

1. **Rola a úloha** (1–2 vety, vrátane dôvodu).
2. **Vstupy** (z predchádzajúceho stupňa, s odkazom na schému).
3. **Postup** (číslované kroky).
4. **Výstupná schéma** (obsah `outputs` pre daný stupeň).
5. **Kritériá kvality** (merateľné: čo musí platiť, aby bol stupeň `PASS`).
6. **Zlyhania a zastavenie** (kedy `FAIL` / `BLOCKED` / `NOT_VERIFIED` a čo presne vrátiť).
7. **Odovzdanie** (ktorý stupeň pokračuje a čo dostane).

**SPOLOČNÝ PREFIX.** Napíš ho raz a vlož doslova na začiatok promptu každého stupňa aj orchestrátora. V promptoch stupňov nikdy neodkazuj na čísla sekcií dokumentu. Stupeň musí fungovať, keď sa skopíruje samostatne. Prefix obsahuje:

- **Definície stavov:** `PASS` = všetky kritériá splnené a doložené; `FAIL` = porušenie, vrátane presnej opravy; `BLOCKED` = chýba vstup, vráť `missing_inputs`; `NOT_VERIFIED` = z dodaných podkladov sa to nedá overiť, rozhodne človek; `STOP` = orchestrátor po vyčerpaní opráv. Stupeň nikdy nevráti `PASS` pri pochybnosti.
- **Obálku výstupu** (nižšie). V promptoch ju vlož ako odsadený text bez oplotenia.
- **Spoločné pravidlá:** nič nevymýšľaj; odhad označ ako odhad; kľúče JSON sú anglické v tvare snake_case bez diakritiky, texty a hodnoty sú po slovensky; `attempt` = číslo pokusu 1–3, pokus 3 s výsledkom `FAIL` znamená `STOP`.

~~~json
{
  "stage": "S3",
  "attempt": 1,
  "status": "PASS | FAIL | BLOCKED | NOT_VERIFIED",
  "inputs_used": ["…"],
  "outputs": {},
  "assumptions": ["…"],
  "missing_inputs": ["…"],
  "risks": ["…"],
  "next_stage_ready": true
}
~~~

**Poradie (DAG):** S0 → S1 → S2 → **GO-1** → (S3 → S8 `hook_triage` → S4) ∥ S5 → S10 (rozpočet, počet variantov, strop počtu buniek) → S6 → S7 `pre` ∥ S8 `creative_review` → **GO-2** → S9 → S7b → **GO-3** → publikovanie. S11 beží ako samostatný beh po zbere výsledkov. S0 so stavom `BLOCKED` zastaví celý beh.

**Stupne a to, čo musí ich prompt vynútiť:**

**S0 · Intake & Guard.** Overí úplnosť briefu podľa definície „chýbajúceho poľa". Vypočíta jednotkovú ekonomiku a ukáže každý krok:
1. Všetky sumy sú bez DPH.
2. Príspevok na objednávku = priemerná hodnota objednávky bez DPH po zľavách − nákupná cena − balenie a doprava − poplatky za platbu a dobierku − očakávané vratky.
3. Bod zvratu ROAS = 1 / (príspevok na objednávku ÷ tržba bez DPH na objednávku). Prepočítaj ho na základ, v ktorom hlási každá platforma (s DPH alebo bez, overiť).
4. Maximálne CPA = príspevok na objednávku v €. Bod zvratu POAS = 1,0. Cieľové POAS = bod zvratu + rezerva, ktorú určí človek.
5. Predvolený cieľ je zisk už na prvej objednávke. Prijať stratu na prvej objednávke sa smie len s A/B dôkazom opakovaných nákupov a súhlasom človeka.
6. Náklady na kreatívu a tvorcov vykáž samostatne ako „náklad učenia".
Doplní `test_budget_rules` (minimálny rozpočet na bunku, strop počtu buniek). Postaví zoznam dôkazov a register tvrdení. Vyberie právny preset. `BLOCKED`, ak chýba ktorékoľvek ★ pole, ak chýba Compliance Owner, alebo ak právny preset nemá autora, dátum a „platné do". Nezaokrúhľuje potichu.

**S1 · Insight Miner.** Zo `{{ZDROJE_VOC}}` vytiahne úlohy, ktoré zákazník „najíma" produkt, aby urobil (jobs-to-be-done), túžby, obavy, námietky, spúšťače nákupu a doslovné citácie zákazníkov so zdrojom. Každý poznatok má stupeň dôkazu: A (vlastné dáta), B (verejné recenzie so zdrojom), C (domnienka). C-poznatky nesmú ísť do tvrdení v kreatíve, iba ako hypotézy na test. Citát s cudzou značkou alebo zakázanou formuláciou sa prepíše na bezznačkovú parafrázu. Stupeň určí úroveň povedomia (awareness) pre každý segment.

**S2 · Angle & Offer Map.** Zostaví 8–12 uhlov. Uhol = segment × výsledok pre zákazníka × mechanizmus (prečo to funguje) × dostupný dôkaz × riešená námietka × úroveň povedomia. Mechanizmus je tvrdenie len v rozsahu, v akom ho podporuje zoznam dôkazov. Inak je to hypotéza a tak sa aj označí. Hodnotí uhly podľa dôkazu, potenciálu a realizovateľnosti. Odporučí 3 uhly na test a vysvetlí prečo. Zakončí **GO-1**: človek schvaľuje uhly.

**S3 · Hook Lab.** Pre každý schválený uhol vygeneruje aspoň 20 hookov v aspoň 8 vzoroch (napr. prerušenie vzoru, medzera zvedavosti, protichodné tvrdenie, konkrétny výsledok len ak je v zozname dôkazov, príbeh, ukážka produktu, otázka na námietku, „mýtus vs. fakt"). Každý hook má tri vrstvy: vizuál v prvej sekunde, hovorená veta (≤ 12 slov), text na obrazovke (≤ 7 slov). Hook musí byť zrozumiteľný aj bez zvuku. Hook typu „medzera zvedavosti" musí mať odpoveď vo videu aj na cieľovej stránke.
S3 najprv aplikuje **tvrdé filtre áno/nie** a nevyhovujúce hooky zahodí ešte pred hodnotením: tvrdenie bez `claim_id`, tvrdenie mimo zoznamu dôkazov, porovnanie, zdravotné alebo „pred/po" tvrdenie mimo právneho presetu, falošná naliehavosť. S3 **nehodnotí a nepriraďuje skóre**. Vráti prežívajúce hooky bez skóre. Skórovanie robí výlučne S8 v samostatnom kontexte.

**S4 · Script Studio.** Z hookov, ktoré prešli triedením v S8, napíše scenáre vo formátoch: 6 s variant, 15 s, 30 s, 45–60 s (dĺžky sú návrhy, overiť v dokumentácii platformy). Štruktúry: problém → ukážka → dôkaz → CTA, „pred/po" len so skutočným, typickým a neupraveným materiálom a písomným súhlasom, mýtus vs. fakt, pohľad zakladateľa (iba z dodaného textu), rozbaľovanie produktu, zoznam. Pre každý scenár: beat sheet s časovými kódmi, hovorený text, text na obrazovke, zoznam záberov (typ záberu, subjekt, pohyb), smer zvuku (zapíš iba licenčný záznam: názov, držiteľ práv, platená reklama áno/nie, územie, trvanie; trendové zvuky nie sú vysporiadané), popis a hashtagy, CTA, možnosť slučky, alternatívne strihy pre 9:16 / 4:5 / 1:1, titulky pre prístupnosť. Kontroly udržania pozornosti (napr. nová vizuálna udalosť každé 2–3 s) sú heuristiky a označia sa ako testované hypotézy.
Navyše vráti `outputs.content_plan`: kadencia podľa `{{KALENDAR}}` a `{{ROZPOCET_A_KAPACITA}}`, 3–4 opakovateľné formáty, mix formátov a pre každý príspevok `angle_id`, `hook_id` a sledovaná metrika.

**S5 · UGC & Creator Kit.** Beží paralelne s S3 a S4 po GO-1. Výlučne pre reálnych tvorcov a zákazníkov. Obsahuje: kritériá výberu tvorcov (zhoda publika, kontrola autenticity publika, kvalita zapojenia), šablónu oslovenia bez falošných tvrdení, brief s úmyslom, povolenými `claim_id` a bodmi na rozhovor namiesto doslovného textu (autenticita), zoznam povolených a zakázaných tvrdení pre každého tvorcu, pravidlo „tvorca hovorí len o skutočnej skúsenosti" a písomné schválenie konceptu pred publikovaním. Vyžiada si surový záznam a alternatívne varianty prvých 3 sekúnd. Kontrolný zoznam zmluvy: práva na použitie, trvanie, platformy, odmena, whitelisting a prístup k nemu, práva na podobu, hlas a meno, súhlas s AI úpravami, maloletí, odvolanie súhlasu, osobné údaje tvorcu. Označenie spolupráce podľa pravidiel platformy a platnej legislatívy (overiť). Rozlíšenie darovaného produktu, platenej spolupráce a affiliate. Pre obsah vytvorený zákazníkmi: tok po nákupe a písomný súhlas na ďalšie použitie v reklame. Právny základ oslovenia po nákupe je „overiť" (u právnika). Obsah s cudzou značkou sa nepoužije ani so súhlasom. Žiadny generovaný „zákazník". Nie je to právne poradenstvo a výstup to musí povedať. Odovzdaný obsah tvorcov vstupuje do S7 a S7b ako každý iný asset.

**S6 · Ad Assembly.** Namiesto faktoriálnej matice postaví **trojvrstvový rebrík testov**: (1) koncept: najviac 3 uhly; (2) hook: rovnaké telo videa s vymeneným prvými 3 sekundami; (3) formát, dĺžka a CTA. Počet variantov a buniek preberie z S10 (nesmie ich prekročiť). Pre každý kanál uvedie, či sa dá test izolovať, alebo ho platforma rozdeľuje algoritmom (potom je to „smerový, nie kontrolovaný test"). Reklamné polia (primary text, headline, popis, CTA) pripraví len pre kanály označené „platený". Pre organické kanály pripraví popis a CTA. Limity a formáty uvedie ako „overiť v aktuálnej dokumentácii platformy". Definuje konvenciu názvov (`{dátum}_{uhol}_{hook}_{formát}_{verzia}`), schému UTM a kontrolu súladu správy medzi reklamou a cieľovou stránkou. Reklama nesmie sľúbiť to, čo cieľová stránka nepotvrdzuje.

**S7 · Compliance Critic (nezávislý, režim `pre`).** Samostatný agent bez prístupu k úvahám autora. Kontroluje textové a scenárové assety pred výrobou. Každý asset porovná so zoznamom dôkazov a kontrolným zoznamom: tvrdenia, recenzie a odporúčania a ich označenie, znižovanie cien a referenčná cena, naliehavosť, porovnávacia reklama, cudzie ochranné známky, zdravotné a „pred/po" tvrdenia, deti, súhlas so sledovaním a osobné údaje, pravidlá reklamných platforiem, licencia hudby, označenie AI-generovaného obsahu. Skenuje aj **metadáta**: hashtagy, popis, alt text, názvy súborov, kľúčové slová, cielenie.
- `PASS` len s dôkazom (`claim_id` alebo datovaný zdroj). `FAIL` = porušenie + presná oprava. `NOT_VERIFIED` = chýba dôkaz, dokumentácia alebo právny úsudok. `NOT_VERIFIED` blokuje GO-2 a GO-3 rovnako ako `FAIL`. Pri pochybnosti nikdy `PASS`.
- Chýbajúci záznam v zozname dôkazov = `FAIL`. Dôkaz, ktorý treba overiť externe = `NOT_VERIFIED`.
- Referenčná cena a zľavy: „pravidlá a dĺžku lehoty over v aktuálnej legislatíve trhu `{{TRH_A_JAZYK}}` a u právnika; hodnotu lehoty nepíš z pamäte". Vyžaduje `price_history` z `{{HISTORIA_CIEN_A_PONUKY}}`.
- Pravidlá platforiem sa kontrolujú len proti datovanej `platform_policy_snapshot`, inak `NOT_VERIFIED`.
- V rizikových triedach (zdravotné a kozmetické tvrdenia, deti, porovnávanie, finančné tvrdenia, „pred/po") S7 nikdy sám nevydá `PASS`. Rozhoduje Compliance Owner alebo právnik.
- Výstup obsahuje verdikt na každý asset: `outputs.assets[{id, status, reason}]`.

**S7b · Final Artifact Compliance (nezávislý).** Samostatný agent kontroluje presný finálny artefakt, nie scenár: hotové video, prepis, text na obrazovke, titulky, popis a hashtagy, licenciu zvuku, označenie spolupráce a cieľovú stránku. Beží po S9 a pred GO-3 a kontroluje hash verzie, ktorá pôjde do publikovania. Zmena po kontrole = nová kontrola. Po publikovaní urobí kontrolu v lehote `{{LEHOTA_KONTROLY}}` a vráti nález, ak sa niečo zmenilo (schválenie platformy, komentáre, stav ponuky).

**S8 · Creative Critic (nezávislý).** Samostatný agent s vlastným kontextom a tromi režimami: `angle_review` (voliteľné, pred GO-1), `hook_triage` (po S3, pred S4) a `creative_review` (po S6, pred GO-2). Skóruje výlučne podľa rubriky (nie S3). Rubrika pre hooky 0–100 s váhami **30 / 25 / 25 / 10 / 10**: sila zastavenia pohľadu 30, špecifickosť a zvedavosť 25, relevancia pre definovaný segment 25, prirodzenosť platformy 10, zrozumiteľnosť bez zvuku 10. Prah 70 je východiskový a nekalibrovaný. Označenie „heuristika, nepreukázané" sa uvedie raz v hlavičke výstupu. Do top 10 smú byť najviac 3 hooky rovnakého vzoru. Pri kreatíve hodnotí aj štruktúru udržania pozornosti, zdieľateľnosť (spoločenská mena, spúšťače, emócia, viditeľnosť, praktická hodnota, príbeh), zhodu so značkou a realizovateľnosť výroby. Nevracia číselné predpovede výkonu. Vráti poradie, hypotézu k testu a návrh, čo testovať ako prvé.

**S9 · Production Pack.** Pre každý schválený scenár: tri výrobné úrovne (len telefón / tvorca / štúdio) s odhadom náročnosti označeným ako odhad. Poradie záberov minimalizujúce prestavby, poznámky k strihu (tempo, titulky, b-roll), obálka, špecifikácia exportu a kontrolný zoznam kvality (bezpečné zóny, hlasitosť zvuku, titulky, právne vety, názvy súborov).

**S10 · Experiment & Measurement Plan.** Beží pred S6 a určí rozpočet, počet variantov a strop počtu buniek. Východisková čiara z `{{BASELINE}}`. Ak je `NOT_VERIFIED`, stupeň nie je `NOT_VERIFIED`: je to **studený štart**. Vráti `PASS` s `baseline: "NOT_VERIFIED"` a plánom „prvý beh je východisková čiara".
- Šablóna hypotézy: „Ak [zmena], tak [metrika] [smer], pretože [mechanizmus]. Zamietneme, ak [podmienka]." Jedna premenná na test.
- **Rebrík metrík:** hook/hold → klik → vloženie do košíka → nákup. Pri každej úrovni uveď, čo smie a čo nesmie rozhodnúť. Víťaza neurčuje samotné CTR, ale CPA alebo POAS s ochrannými metrikami (hook rate, frekvencia).
- Minimálny rozpočet na bunku podľa očakávaného počtu konverzií, s ukázaným výpočtom a uvedenými predpokladmi. Pri nízkej vzorke sa rozhoduje na najvyššej úrovni, ktorú vzorka podporí, a výsledok sa označí „smerový".
- Pravidlá rozhodovania (zastaviť / ponechať / škálovať) voči bodu zvratu. Stop pravidlo: N × maximálne CPA bez nákupu; N určí človek pri GO-3. Strop straty.
- Dĺžka testu pokrýva aspoň jeden týždenný cyklus. „Nahliadať" sa smie iba z bezpečnostných dôvodov, nie na vyhlásenie víťaza.
- Kolo potvrdenia víťaza a postupné škálovanie (pravidlá učiacej fázy platformy overiť v dokumentácii).
- Plán obnovy pri únave kreatívy (klesajúci hook rate, rastúca frekvencia). Zohľadní `{{KALENDAR}}` vrátane okien zmrazenia cien a ponúk.

**S11 · Learning Loop.** Samostatný beh po zbere výsledkov. Povinná vstupná schéma výsledkov: obdobie, výdavok, zobrazenia, 3-sekundové zhliadnutia, kliky, nákupy, hodnota konverzií, atribučné okno a nastavenia, zdroj (platforma alebo backend obchodu), základ DPH, vratky a storná. Pravdou je backend obchodu. Pri nezhode vráti `NOT_VERIFIED` s veľkosťou rozdielu. Výsledky sa označia „atribuované, nie inkrementálne". Zaloguje poradie podľa rubriky voči skutočnému poradiu hookov, aby sa rubrika dala kalibrovať. Meria učenie: rozhodnutia za mesiac, náklad na rozhodnutie, podiel „nerozhodnuté". Aktualizuje banku poznatkov, zoznam dôkazov a knižnicu víťazných vzorov. Každý poznatok nesie stupeň dôkazu a dátum expirácie. Navrhne backlog ďalšieho šprintu. Nikdy nedopĺňa výsledky, ktoré neboli dodané.

**Orchestrátor.** Napíš samostatný prompt, ktorý:
- určuje poradie a paralelizmus podľa DAG vyššie,
- pri `BLOCKED` v S0 beh zastaví a vypíše iba `missing_inputs`,
- vynucuje brány: **GO-1** po S2 (uhly), **GO-2** po S7 a S8 pred výrobou (každý asset, ktorý ide do výroby, musí byť v S7 `PASS`), **GO-3** pred každým publikovaním, míňaním rozpočtu a zmenou v reklamnom účte (po S7b), **GO-4** pred oslovením tvorcov alebo zákazníkov, podpisom zmlúv a zberom súhlasov,
- vedie **denník GO**: `{gate, asset_id, version_hash, decision, decided_by, decided_at, reason}`; GO bez `decided_by` = Compliance Owner je neplatné (pri GO-2 a GO-3),
- spravuje stavy a opravné slučky (max. dva cykly na stupeň) a po vyčerpaní vráti `STOP` s konkrétnou prekážkou,
- vedie denník behu (vstupy, verzie, rozhodnutia ľudí),
- definuje „hotovo" ako: všetky povinné stupne `PASS` pre tento beh (studený štart S10 sa počíta ako `PASS`), každý publikovaný asset je `PASS` v S7 aj v S7b, žiadny asset nie je `FAIL` ani `NOT_VERIFIED` a GO-3 zaznamenal Compliance Owner,
- opisuje, ako sa beh obnoví po prerušení.
</architecture>

<output_format>
Odovzdaj jeden dokument v Markdown v **troch častiach**:

- **Časť 1/3:** sekcie 1–5 (zhrnutie, účel, princípy, vstupy a slovník metrík, orchestrátor) a stupne S0–S3.
- **Časť 2/3:** stupne S4–S8 vrátane S7b.
- **Časť 3/3:** stupne S9–S11, sekcie 7–11 a kontrolný zoznam.

Každá časť končí riadkom `POKRAČOVANIE: <čo presne ešte chýba>`. Ak sa blížiš k limitu dĺžky, skonči na hranici promptu (nikdy v polovici) a pokračuj až po „pokračuj". Nikdy neskracuj zvyšok tak, aby vyzeral kompletný.

Štruktúra celého dokumentu:

1. Zhrnutie pre človeka (max. 15 riadkov): čo stack robí, aké sú brány, čo sa musí doplniť.
2. Účel
3. Záväzné princípy (prenesené z `<principles>` do tvaru použiteľného v promptoch)
4. Vstupy, kontext, ktorý sa overuje pri každom spustení, a **Slovník metrík** (hook rate, hold rate, zdieľania na dosah, CTR, CVR, CPA, ROAS, POAS: definícia, čo metrika smie a nesmie rozhodnúť, a poznámka „definíciu overiť v dokumentácii platformy")
5. SPOLOČNÝ PREFIX a Orchestrátor (prompt)
6. Stupne S0–S11 a S7b (jeden prompt na stupeň)
7. Schémy (obsah `outputs` pre každý stupeň)
8. Hodnotiace rubriky (hook, výkonnostná kritika, compliance kontrolný zoznam)
9. Testovacie fixtúry (aspoň päť minibriefov) a očakávané správanie stacku: (a) dobrý brief → beh prejde po GO-3; (b) chýba jednotková ekonomika → S0 `BLOCKED`; (c) riskantné tvrdenie → `FAIL` v S7; (d) asset `NOT_VERIFIED` → GO-2 sa odmietne; (e) chýba Compliance Owner → S0 `BLOCKED`
10. Otvorené neznáme a čo treba doplniť (zoznam, ktorý je doslova doplniteľný zadávateľom)
11. Čo som nedokázal overiť (povinná sekcia, aj keď prázdna s vetou „nič")

**Pravidlá formátu:**
- Každý prompt, vrátane orchestrátora, je v samostatnom bloku s oplotením `~~~~`, aby sa dal skopírovať. Vo vnútri promptu nesmú byť ďalšie `~~~~` ani trojité spätné apostrofy. Obálku JSON vkladaj ako odsadený text.
- Výstup je v slovenčine. Technické identifikátory, názvy stavov, ID stupňov a kľúče schém ostávajú v pôvodnom tvare.
</output_format>

<example>
Takto hlboký a konkrétny má byť jeden stupňový prompt. Je to skrátená ukážka tvaru stupňa S3, nie jeho finálny text:

~~~~
[SPOLOČNÝ PREFIX: vlož doslova]

ROLA A ÚLOHA
Si hook copywriter pre short-form video. Pre každý schválený uhol vyrob hooky, ktoré môžu
zastaviť scrollovanie v prvej sekunde a súčasne zostanú v medziach zoznamu dôkazov.
Dôvod: v prvých sekundách sa rozhoduje o tom, či kreatíva dostane šancu, a zároveň je to
miesto, kde sa najľahšie porušia pravidlá (prehnaný sľub).

VSTUPY
- S2.outputs.approved_angles
- S0.outputs.proof_inventory a S0.outputs.legal_preset
- Značkový hlas: {{TONE_OF_VOICE}}

POSTUP
1. Pre každý uhol vygeneruj ≥ 20 hookov v ≥ 8 vzoroch.
2. Každý hook = {visual_1s, spoken (≤ 12 slov), on_screen_text (≤ 7 slov), pattern, angle_id, claim_id|null}.
3. Aplikuj tvrdé filtre áno/nie: hook s tvrdením bez claim_id, mimo proof_inventory, s porovnaním,
   so zdravotným alebo „pred/po" tvrdením mimo právneho presetu alebo s falošnou naliehavosťou zahoď
   a zapíš do kill_list s dôvodom.
4. Over zrozumiteľnosť bez zvuku (text a vizuál nesú význam sami).
5. Hooky typu „medzera zvedavosti" označ a uveď, kde sa odpoveď objaví (video, cieľová stránka).
6. NESKÓRUJ. Skórovanie robí S8 v režime hook_triage.

VÝSTUP
Obálka a outputs.survivors[hooky bez skóre, ≥ 10 na uhol] + outputs.kill_list[{hook, reason}].

KRITÉRIÁ KVALITY (PASS)
- ≥ 10 prežívajúcich hookov na uhol v ≥ 6 vzoroch,
- každé tvrdenie má claim_id,
- žiadny hook neobsahuje skóre.

ZLYHANIA
- chýba proof_inventory → BLOCKED, vráť presný zoznam chýbajúcich tvrdení,
- po 2 opravných cykloch stále < 10 prežívajúcich hookov na uhol → STOP s konkrétnou príčinou
  (napr. slabé poznatky v S1), nepridávaj slabé hooky.

ODOVZDANIE
→ S8 (hook_triage), kill_list → S11.
~~~~
</example>

<process>
Postupuj takto:

1. Najprv v bloku `<plan>` (max. 15 riadkov) napíš: ktoré údaje z `<brief>` máš, ktoré chýbajú, ktoré predpoklady ti dovoľujú pokračovať a ktoré nie. Chýbajúci ★ údaj nezastaví písanie stacku. Zastaví len spúšťanie. Zaznamenaj ho do sekcie „Otvorené neznáme".
2. Potom napíš dokument podľa `<output_format>`, po častiach.
3. Pred odovzdaním každej časti prejdi všetky vety, ktoré obsahujú právne alebo platformové tvrdenie. Ak veta nemá „overiť v aktuálnej dokumentácii / legislatíve / u právnika", prepíš ju, alebo ju označ ako `NOT_VERIFIED`. V sekcii „Čo som nedokázal overiť" uveď všetko, čo nesplníš alebo nevieš overiť.
4. Prompty stupňov napíš po slovensky. Názvy tagov, názvy stavov, ID stupňov a kľúče JSON nechaj v pôvodnom tvare. Označenia `{{…}}` vo vnútri promptov stupňov nechaj ako parametre, ktoré sa dosadia pri spustení. Nevpisuj do nich hodnoty natvrdo. Hodnoty z `<brief>` použi na prispôsobenie návrhu (segmenty, kanály, preset), nie na nahradenie parametrov.
</process>

<quality_bar>
Dokument je hotový, až keď platí:

- Každý stupeň (S0–S11 a S7b) má všetkých sedem častí zo sekcie `<architecture>` a jeho prompt funguje samostatne, vrátane SPOLOČNÉHO PREFIXU.
- Každá brána (GO-1 až GO-4) je pomenovaná a každý stupeň má jasné `FAIL` / `BLOCKED` / `NOT_VERIFIED` správanie.
- Nikde nie je sľub výsledku, vymyslené číslo, vymyslená štatistika, benchmark z pamäte ani „zaručená virálnosť". Odhady sú označené.
- Nikde sa negeneruje falošná recenzia, falošný zákazník, AI avatar vydávaný za zákazníka ani falošná naliehavosť.
- Každé tvrdenie v ukážkach odkazuje na záznam v zozname dôkazov alebo je označené ako hypotéza.
- Limity platforiem a právne pravidlá sú označené „overiť v aktuálnej dokumentácii / legislatíve / u právnika".
- Existuje aspoň päť testovacích fixtúr (a–e) s očakávaným správaním.
- Compliance Owner je pomenovaný a GO-2 a GO-3 bez neho nie sú platné.
- Každý prompt je v samostatnom `~~~~` bloku bez vnorených oplotení.
- Zhrnutie na začiatku zrozumie človek za desať minút.
</quality_bar>

<task>
Teraz napíš kompletný dokument Agentic Prompt Stack podľa vyššie uvedených pokynov a použi údaje z `<brief>`. Začni blokom `<plan>`.
</task>

---

## Poznámky autora (nevkladať do AI)

- **Prečo dokument, nie obsah:** stack sa dá opakovať, auditovať a zlepšovať podľa výsledkov. Jednorazový obsah sa nedá.
- **Prečo „ultra virálne" a „maximálne ziskové" v promptoch nie sú cieľ:** žiadna AI ani agentúra ich nezaručí. Prompt ich preloží na KPI a testy. Stack tak zvyšuje pravdepodobnosť a rýchlosť učenia, nie sľubuje výsledok.
- **Prečo nezávislé kritiky (S7, S7b, S8):** autor vlastný text vníma ako správny. Samostatný kontext chytá viac chýb. S7b kontroluje hotový artefakt, lebo schválený scenár a finálne video sa môžu líšiť.
- **Prečo brány GO-1 až GO-4 a Compliance Owner:** publikovanie, míňanie a oslovenie ľudí sú nevratné a patria človeku s menom. GO bez mena nie je GO.
- **Prečo S3 nehodnotí a S10 beží pred S6:** kto vyrobil hooky, nesmie ich sám skórovať. A počet variantov musí vychádzať z rozpočtu, nie rozpočet z počtu variantov.
- **Ako sa stack zlepšuje:** po prvom behu dodaj do S11 skutočné výsledky (nie odhady, s backendom obchodu ako zdrojom pravdy) a nechaj stack aktualizovať banku poznatkov a vzory. Rubrika sa kalibruje podľa logu poradie-vs-skutočnosť.
- **Čo prompt zámerne nerobí:** negeneruje falošné UGC, nesľubuje percentá nárastu, neodporúča tajné obchádzanie pravidiel platforiem.
- **Čo ostáva na tebe:** pravidlá platforiem a právne lehoty (referenčná cena, označenie spolupráce, AI obsah) prompt zámerne nevypisuje z pamäte. Dodaj ich cez `{{PRAVNY_PRESET}}` s dátumom a zdrojom, inak ich stack označí `NOT_VERIFIED`.
