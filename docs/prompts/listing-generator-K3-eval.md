# K3 (C4 regenerácia 2026-08-07) — Eval: FINAL prompt × ListingContent

> **C4 CLOSED** — výstupný JSON = produkčný typ `ListingContent` (+ optionals).  
> Predchádzajúce K3/K4 JSON so schémou `mainText`/`socialText` sú **superseded**.

**Finálny prompt:** `docs/prompts/listing-generator-system-prompt-FINAL.md`  
**Typ SoT:** `apps/crm/src/lib/ai/listing-content.ts` → `ListingContent`  
**C4 dôkaz (vitest):** `apps/crm/tests/verification/listing-content-c4-schema.verification.test.ts`  
**Fixtures:** `apps/crm/tests/verification/fixtures/listing-c4/`  
**K1:** `docs/prompts/listing-generator-K1-analysis.md`  
**K4 log:** `docs/prompts/listing-generator-K4-review.md`  
**K5 handoff:** `docs/prompts/listing-generator-K5-handoff.md`  
**Dátum:** 2026-08-07 (C4)  
**Metóda:** simulácia výstupu podľa FINAL — produkčné kľúče, žiadny mapper  
**Vstupné fakty:** parametre z `smolko-inzerat-demo-2026-07-30.md` + `smolko-inzeraty-3x-2026-08-06.md` (+ 2 stress)

### C4 validácia (2026-08-07)

| Test | Fixture | `portal_text` slov | Vitest |
|---|---|---|---|
| T1 Sabinov | t1-sabinov.json | 252 | PASS |
| T2 Teriakovce | t2-terakovce.json | 232 | PASS |
| T3 Ľubotice | t3-lubotice.json | 226 | PASS |
| T4 Modrá | t4-modra.json | 229 | PASS |
| T5 stress empty | t5-stress-empty.json | 97 | PASS |
| T6 stress BA | t6-stress-ba.json | 96 | PASS |

**Citát typu** (`listing-content.ts`):

```ts
export interface ListingContent {
  portal_text:  string;
  fb_ad_copy:   string;
  ig_caption:   string;
  email_subject: string;
  email_body:   string;
  seo_keywords: string[];
  titles?: string[];
  missingData?: string[];
  recommendations?: string[];
  techniquesUsed?: number[];
}
```

---

## Test 1 — Sabinov byt (golden)

### Vstup (parametre)
```
typ: byt, predaj
lokalita: Sabinov
izby: 2
plocha: 64 m²
poschodie: prízemie / 3
cena: 131 000 €
stav: čiastočná rekonštrukcia; zateplený dom; nové sadrokartónové stropy
príslušenstvo: murovaná pivnica; malá záhradka
maklér: Eva Burgrová, 0907 920 193
porovnanie €/m² okolia: NIE VO VSTUPE
```

### Výstup JSON (`ListingContent`)
```json
{
  "portal_text": "Ráno vyjdete z bytu a stojíte na vlastnej tráve — nie na spoločnej chodbe.\n\nPreto je tento byt na prízemí. Vlastná záhradka pri byte inak neexistuje: buď prízemie a kúsok zeme, alebo vyššie poschodie a balkón. Tu máte 2-izbový byt 64 m² v Sabinove, čiastočne zrekonštruovaný, v zateplenom dome, s novými sadrokartónovými stropmi. K bytu patrí murovaná pivnica — skutočná pivnica, nie kobka v spoločnej chodbe — a malá záhradka, ktorú si na obhliadke môžete prejsť krok za krokom.\n\nCena 131 000 € pri 64 m² je 2 047 €/m². Čísla hovoria sami: za túto sumu kupujete výmeru aj vonkajší priestor, ktorý na vyšších poschodiach neexistuje. Ak chcete porovnať cenu s inou lokalitou, do vstupu treba doplniť porovnávacie číslo — bez neho trhové porovnanie neuvádzame. [DOPLNIŤ: výmera záhradky v m²] [DOPLNIŤ: orientácia záhradky] [DOPLNIŤ: typ vykurovania]\n\nPre koho je to trafené presne:\n— Rodina s malým dieťaťom: priestor na hry vonku, bez nosenia kočíka po schodoch.\n— Majiteľ psa: ráno von bez výťahu a chodby.\n— Kto chce pestovať v zemi, nie v kvetináči na balkóne.\n— Kto nechce schody — dnes ani o pätnásť rokov.\n\nBytov s vlastnou záhradkou je toľko, koľko je bytov na prízemí. To nie je reklamný slogan, ale logický dôsledok dispozície. Zavolajte Eve Burgrovej na 0907 920 193 a na obhliadke si nechajte čas postáť na tej záhradke — to predáva lepšie ako akýkoľvek odsek o „prízemí“ v zozname parametrov. Ak Vám chýba rok výstavby alebo detail rekonštrukcie, pýtajte sa priamo na mieste; v texte ich nevymýšľame.",
  "fb_ad_copy": "Byt, kde dvere vedú na vlastnú trávu. 🌱\n\n2-izbový byt 64 m² v Sabinove na prízemí: malá záhradka, murovaná pivnica, zateplený dom, čiastočná rekonštrukcia, nové sadrokartónové stropy. Cena 131 000 € — to je 2 047 €/m². Prízemie tu nie je kompromis, ale jediná cesta k záhradke pri byte.\n\nObhliadka: Eva Burgrová, 0907 920 193. Nechajte si na záhradke desať minút — uvidíte, či to sedí.",
  "ig_caption": "2-izbový byt 64 m² v Sabinove: prízemie, malá záhradka, murovaná pivnica, zateplený dom. 131 000 €.\n\nObhliadka s Evou Burgrovou: 0907 920 193\n\n#byt #Sabinov #záhradka #prízemie #nehnuteľnosť #predaj #pivnica",
  "email_subject": "Sabinov: 64 m² + záhradka, 131 000 €",
  "email_body": "Dobrý deň,\n\nponúkam Vám 2-izbový byt 64 m² v Sabinove na prízemí — s malou záhradkou a murovanou pivnicou. Dom je zateplený, byt po čiastočnej rekonštrukcii s novými sadrokartónovými stropmi. Cena 131 000 € (2 047 €/m²).\n\nPrízemie tu nie je kompromis: bez neho by záhradka pri byte nebola. Hodí sa rodine s dieťaťom, majiteľovi psa alebo komukoľvek, kto nechce schody.\n\nAk Vás to zaujíma, zavolajte Eve Burgrovej na 0907 920 193 a dohodnite obhliadku — na mieste si nechajte čas na záhradke.\n\nS pozdravom",
  "seo_keywords": ["2-izbový byt Sabinov", "byt so záhradkou", "byt prízemie Sabinov", "64 m² Sabinov", "murovaná pivnica", "predaj bytu Sabinov"],
  "titles": [
    "Byt so záhradkou — Sabinov, 64 m², prízemie, 131 000 €",
    "2 izby, kde dvere vedú na trávu, nie na chodbu (Sabinov)",
    "64 m² + murovaná pivnica a vlastná záhradka — Sabinov"
  ],
  "missingData": [
    "výmera záhradky v m²",
    "orientácia záhradky",
    "typ vykurovania",
    "parkovanie",
    "rok výstavby / čo zahŕňala čiastočná rekonštrukcia",
    "typ konštrukcie (panel / tehla)",
    "energetický certifikát",
    "vzdialenosť do centra / školy / obchodu",
    "porovnávacie €/m² (ak chcete cenové ukotvenie voči Prešovu)"
  ],
  "recommendations": [
    "Titulok 1 na portály — „so záhradkou“ dopredu.",
    "Bez doloženého porovnávacieho €/m² neporovnávať s Prešovom — doplňte číslo do vstupu, ak ho chcete v texte.",
    "Doplnenie výmery/orientácie záhradky výrazne posilní scénu.",
    "Doplniť charakterLokality (enum + voľný text), ak chcete soft municipal tone (napr. povaha Sabinova)."
  ],
  "techniquesUsed": [1, 2, 3, 5, 7, 8, 9, 10]
}
```

---

## Test 2 — Teriakovce dom (golden)

### Vstup (parametre)
```
typ: dom, predaj
lokalita: Teriakovce (pri Prešove)
izby: 4 · úžitková 102 m² · pozemok 698 m²
rok: 2012, kolaudácia 2013
dispozícia: všetko na jednom podlaží + pochôdzne podkrovie s elektrinou
vonku: terasa 18 m² krytá lexanom · letná kuchyňa · altánok
infra: podlahové kúrenie · studňa s ponorným čerpadlom · čistička + 12 000 l nádrž
       (kanalizácia v obci v riešení) · optika · 3D Matterport
cena: 325 000 €
maklér: Ing. Iveta Adamovičová, 0904 898 696
MHD: áno (vo vstupe)
```

### Výstup JSON (`ListingContent`)
```json
{
  "portal_text": "V tomto dome neexistuje veta „vynesieš to hore?“ — niet kam. Celý život je dole.\n\n4 izby, úžitková 102 m², všetko na jednom podlaží. Podkrovie je pochôdzne, s elektrinou — sklad alebo priestor s potenciálom; absolútne „bez jediného schodu“ neuvádzame, kým nie je potvrdený prístup na pôjd. Vonku na 698 m² stojí letná kuchyňa, altánok a 18 m² terasa krytá lexanom: od jari do jesene máte o tri miestnosti viac, než hovorí pôdorys. To je zhmotnenie čísla — nie metafora, ale tri vonkajšie priestory navyše.\n\nDom z roku 2012 (kolaudácia 2013), podlahové vykurovanie, optika. Voda a odpad na rovinu: vlastná studňa s ponorným čerpadlom a čistička s 12 000 l nádržou; obecná kanalizácia je v riešení. V praxi ste menej viazaní na vodárne — bez sľubov o výnosoch, len o prevádzke. Cena 325 000 €.\n\nPre koho je to trafené presne:\n— Rodina, ktorá chce dvor na očiach, nie výhľad na cudzí dvor.\n— Kto nechce schody v obytnej časti — s kočíkom ani o dvadsať rokov.\n— Kto pracuje v Prešove a chce ticho; Teriakovce majú MHD.\n\nDom si môžete prejsť z gauča — má 3D obhliadku Matterport. Potom zavolajte Ivete Adamovičovej na 0904 898 696 a príďte si sadnúť do altánku. [DOPLNIŤ: parkovanie/garáž] [DOPLNIŤ: vzdialenosť do centra Prešova] [DOPLNIŤ: energetický certifikát]. Na obhliadke si overte aj to, či vedú schody na pochôdzne podkrovie — v texte to bez vstupu nešpekulujeme.",
  "fb_ad_copy": "Dom na jednom podlaží — v lete sa varí vonku. ☀️\n\n4 izby, 102 m², Teriakovce pri Prešove s MHD, pozemok 698 m²: letná kuchyňa, altánok, terasa 18 m² krytá lexanom. Studňa s ponorným čerpadlom a čistička 12 000 l. Rok 2012, podlahové kúrenie, optika, 3D obhliadka. Cena 325 000 €.\n\nIveta Adamovičová, 0904 898 696 — dohodnite osobnú obhliadku alebo 3D prehliadku ešte dnes.",
  "ig_caption": "4-izbový dom Teriakovce: obytné priestory na jednom podlaží, 102 m², pozemok 698 m², letná kuchyňa, altánok, terasa 18 m². Studňa + čistička. 325 000 €.\n\nIveta Adamovičová, 0904 898 696\n\n#dom #Teriakovce #bungalov #Prešov #predaj #záhrada #MHD",
  "email_subject": "Teriakovce: dom na 1 podlaží, 325k",
  "email_body": "Dobrý deň,\n\nponúkam Vám 4-izbový dom v Teriakovciach (MHD do Prešova): úžitková 102 m², pozemok 698 m², všetko obytné na jednom podlaží plus pochôdzne podkrovie s elektrinou. Vonku letná kuchyňa, altánok a 18 m² terasa krytá lexanom. Rok 2012 / kolaudácia 2013, podlahové kúrenie, optika, studňa s ponorným čerpadlom a čistička s 12 000 l nádržou (obecná kanalizácia v riešení). Cena 325 000 €.\n\nK dispozícii je 3D obhliadka. Ak Vás to osloví, zavolajte Ivete Adamovičovej na 0904 898 696.\n\nS pozdravom",
  "seo_keywords": ["dom Teriakovce", "4-izbový dom Prešov", "bungalov Teriakovce", "dom so studňou", "letná kuchyňa", "predaj domu 698 m²"],
  "titles": [
    "Dom na jednom podlaží + letná kuchyňa — Teriakovce, 698 m², 325 000 €",
    "4-izbový bungalov, kde sa v lete varí vonku (Teriakovce)",
    "Jedno podlažie, terasa, altánok, studňa a čistička — Teriakovce"
  ],
  "missingData": [
    "vzdialenosť/minúty do centra Prešova",
    "solárny systém — potvrdiť rozsah (ak sa spomína v RK)",
    "energetický certifikát",
    "parkovanie/garáž",
    "či vedú schody na pochôdzne podkrovie"
  ],
  "recommendations": [
    "Nepoužívať „novostavba“ pri dome z 2012 — „udržiavaný dom z r. 2012“.",
    "Titulok 1 na portály: „jedno podlažie“ / „pri Prešove“ — nie absolútne „bez schodov“, kým nie je potvrdený pôjd.",
    "Ak je pôjd bez schodov / výlučne rebrík, uveďte to vo vstupe — silnejší uhol.",
    "Doplniť charakterLokality, ak chcete soft municipal tone o Teriakovciach."
  ],
  "techniquesUsed": [1, 2, 3, 5, 6, 8, 9, 10]
}
```

---

## Test 3 — Ľubotice pozemky (golden)

### Vstup (parametre)
```
typ: pozemok, predaj (2×)
lokalita: Ľubotice – Prešov
fakty: intravilán · rovina · slnečné · oplotené
menší: 623 m² / 155 500 € · väčší: 854 m² / 205 500 €
ku každému: podiel 117 m² na prístupovej ceste
siete NA pozemku: elektrina, voda, kanalizácia, plyn, optika
prístup: asfalt · ÚP: RD, zastavanosť 40 %
cena: konečná vrátane provízie a právneho servisu
maklér: Erik Birkner, 0949 553 341
susednosť pozemkov: NIE EXPLICITNE VO VSTUPE (len spoločná cesta)
```

### Výstup JSON (`ListingContent`)
```json
{
  "portal_text": "Najdrahšie na stavbe domu nebýva betón. Býva čakanie na siete a povolenia.\n\nTieto pozemky v Ľuboticiach majú elektrinu, vodu, kanalizáciu, plyn aj optiku priamo na pozemku a prístup po asfalte. Projektant sa môže pustiť do práce bez rokov ťahania prípojok. Intravilán, podľa ÚP na rodinné domy, koeficient zastavanosti až 40 %. Rovina, slnko, oplotené — fakty zo vstupu, nie marketingové prívlastky. Asfaltový prístup znamená, že na pozemok dojdete rovnako v januári ako v júli.\n\nNa výber:\n— 623 m² za 155 500 €\n— 854 m² za 205 500 €\nKu každému patrí spoluvlastnícky podiel 117 m² na prístupovej ceste. Cena je konečná — zahŕňa províziu, právny servis, zmluvy aj poplatky za prevod. To je cenové ukotvenie zo vstupu, nie sľub o výnosoch.\n\nPre koho je to trafené presne:\n— Staviteľ, ktorý nechce čakať na siete.\n— Domácnosť, ktorá chce pozemok s jasnými pravidlami ÚP a sieťami na pozemku.\n— [DOPLNIŤ: či sú pozemky susediace — ak áno, uhol „dve spriaznené domácnosti“ dostane plnú silu]\n\nZavolajte Erikovi Birknerovi na 0949 553 341 — prevedie vás pozemkami a odpovie aj na otázky k územnému plánu. Bez potvrdených tarch alebo „právnej čistoty“ vo vstupe tieto tvrdenia neuvádzame. Ak Vám chýba šírka pozemku alebo vzdialenosť do centra Prešova, pýtajte sa priamo — v texte ich nevymýšľame. Susednosť dvoch pozemkov potvrďte vo vstupe, kým ju budeme predávať ako hlavný uhol.",
  "fb_ad_copy": "Pozemok, kde sa nečaká na siete.\n\nĽubotice pri Prešove: elektrina, voda, kanalizácia, plyn aj optika priamo na pozemku, asfaltový prístup, ÚP na rodinné domy. Na výber 623 m² za 155 500 € alebo 854 m² za 205 500 €. Ceny konečné vrátane právneho servisu.\n\nErik Birkner, 0949 553 341 — dohodnite si prehliadku pozemku.",
  "ig_caption": "Stavebné pozemky Ľubotice: siete na pozemku, asfalt, ÚP na RD. 623 m² / 155 500 € alebo 854 m² / 205 500 €. Ceny konečné vrátane servisu.\n\nErik Birkner, 0949 553 341\n\n#pozemok #Ľubotice #Prešov #stavba #siete #intravilán #predaj",
  "email_subject": "Ľubotice: pozemok so sieťami na pozemku",
  "email_body": "Dobrý deň,\n\nv Ľuboticiach pri Prešove máme dva stavebné pozemky so sieťami priamo na pozemku (elektrina, voda, kanalizácia, plyn, optika), asfaltovým prístupom a ÚP na rodinné domy (zastavanosť až 40 %). Na výber 623 m² za 155 500 € alebo 854 m² za 205 500 €; ku každému podiel 117 m² na prístupovej ceste. Ceny sú konečné vrátane provízie a právneho servisu.\n\nAk plánujete stavať bez rokov čakania na prípojky, zavolajte Erikovi Birknerovi na 0949 553 341.\n\nS pozdravom",
  "seo_keywords": ["pozemok Ľubotice", "stavebný pozemok Prešov", "pozemok so sieťami", "intravilán Ľubotice", "ÚP rodinný dom", "predaj pozemku"],
  "titles": [
    "Stavebný pozemok so sieťami NA pozemku — Ľubotice, 623 / 854 m²",
    "Ľubotice: elektrina, plyn, voda, optika hotové — dva pozemky na výber",
    "Intravilán Ľubotice: asfaltový prístup, ÚP na RD, cena vrátane servisu"
  ],
  "missingData": [
    "sú pozemky susediace? (inzerát hovorí len o spoločnej ceste)",
    "šírka každého pozemku samostatne",
    "vzdialenosť do centra Prešova"
  ],
  "recommendations": [
    "Nepoužívať „EXKLUZÍVNE“ v titulku — „siete na pozemku“ dopredu.",
    "Kým nie je potvrdená susednosť, nepredávať silno uhol dvoch spriaznených domácností.",
    "Nepísať „papierovo čistý“ — ÚP a siete uvádzaj fakticky; tarchy len ak sú vo vstupe.",
    "Doplniť charakterLokality, ak chcete soft municipal tone."
  ],
  "techniquesUsed": [2, 3, 4, 5, 8, 9, 10]
}
```

---

## Test 4 — Modrá n. C. dom+veľký pozemok (golden)

### Vstup (parametre)
```
typ: dom + veľký pozemok, predaj
lokalita: Modrá nad Cirochou, okr. Humenné, Školská ul.
izby: 5 · úžitková 120 m² · obytná 76 m² · zastavaná 167 m²
pozemok: 4 500 m²
rok: 2016 · jedno podlažie + možnosť podkrovnej izby
stavba: murivo 450 mm · TONDACH · el. podlahové kúrenie · 3-komorové okná · krytá terasa
siete: elektrina, voda, kanalizácia, možnosť optiky
cena: na vyžiadanie v RK
maklér: Ing. Anna Chalčaková, 0905 960 447
```

### Výstup JSON (`ListingContent`)
```json
{
  "portal_text": "Postavte sa doprostred pozemku a rozhliadnite sa: všetko, kam dovidíte, je vaše — 4 500 m².\n\nTo nie je záhrada za domom. To je priestor na sad, záhony, výbeh, dielňu aj vonkajšie hry naraz. Tu je pozemok hlavný produkt; dom je druhý. Bez referenčného rozsahu bežnej parcely vo vstupe neporovnávame „ako X bežných parciel“ — zhmotňujeme samotnú výmeru a čo sa na ňu zmestí ako potenciál, nie ako hotové vybavenie.\n\nDom je murovaný, z roku 2016, celý na jednom podlaží. Murivo hrúbky 450 mm, strecha TONDACH, plastové 3-komorové okná, elektrické podlahové vykurovanie, krytá terasa. Napojený na elektrinu, vodu a kanalizáciu, s možnosťou optiky. Úžitková plocha 120 m², obytná 76 m², zastavaná 167 m², 5 izieb; podkrovie ponúka možnosť ďalšej izby. [DOPLNIŤ: detailná dispozícia miestností] [DOPLNIŤ: stav dokončenia — nasťahovanie vs. holodom]\n\nPre koho je to trafené presne:\n— Rodina, ktorá chce detstvo vonku, nie na parkovisku.\n— Kto chce chovať a pestovať bez rozhodovania „čo z toho“.\n— Remeselník alebo podnikateľ, ktorému doma chýba dielňa a sklad.\n\nCena je na vyžiadanie v RK — na portáli to znižuje počet reakcií; uveďte aspoň orientačnú sumu, ak ju máte. Zavolajte Anne Chalčakovej na 0905 960 447 a prejdite si ten pozemok pešo od plotu k plotu. Lokalita: Modrá nad Cirochou, okr. Humenné, Školská ulica. Bez vzdialeností vo vstupe neuvádzame minúty do Humenného. [DOPLNIŤ: vzdialenosť do Humenného / Sniny] [DOPLNIŤ: energetický certifikát].",
  "fb_ad_copy": "4 500 m² len pre vás. 🌳\n\nMurovaný 5-izbový bungalov z roku 2016 v Modrej nad Cirochou (okr. Humenné): úžitková 120 m², murivo 450 mm, strecha TONDACH, podlahové kúrenie, krytá terasa, elektrina voda kanalizácia. Pozemok je hlavný produkt, dom druhý. Cena na vyžiadanie v RK.\n\nAnna Chalčaková, 0905 960 447 — dohodnite pešiu obhliadku pozemku.",
  "ig_caption": "Dom + 4 500 m² v Modrej nad Cirochou: 5 izieb, 120 m², murivo 450 mm, TONDACH, podlahové kúrenie, krytá terasa (2016). Cena na vyžiadanie.\n\nAnna Chalčaková, 0905 960 447\n\n#dom #ModráNadCirochou #Humenné #pozemok #bungalov #predaj #záhrada",
  "email_subject": "Modrá n. C.: dom + 4 500 m² pozemok",
  "email_body": "Dobrý deň,\n\nponúkam murovaný 5-izbový dom (2016) v Modrej nad Cirochou na Školskej ulici s pozemkom 4 500 m². Úžitková 120 m², jedno podlažie, murivo 450 mm, strecha TONDACH, 3-komorové okná, elektrické podlahové kúrenie, krytá terasa; siete elektrina/voda/kanalizácia, možnosť optiky. Cena na vyžiadanie v RK.\n\nAk hľadáte priestor na sad, chov alebo dielňu, zavolajte Anne Chalčakovej na 0905 960 447 a dohodnite pešiu obhliadku pozemku.\n\nS pozdravom",
  "seo_keywords": ["dom Modrá nad Cirochou", "pozemok 4500 m²", "5-izbový dom Humenné", "murovaný dom 2016", "bungalov východ", "predaj domu Školská"],
  "titles": [
    "Dom s pozemkom 4 500 m² — Modrá nad Cirochou, 5 izieb",
    "Takmer pol hektára len pre vás: bungalov v okr. Humenné",
    "5-izbový murovaný dom (2016) + 4 500 m² na sad, zvieratá, dielňu"
  ],
  "missingData": [
    "cena (alebo aspoň „od“)",
    "energetický certifikát",
    "stav dokončenia (nasťahovanie vs. holodom)",
    "detailná dispozícia miestností",
    "vzdialenosť do Humenného / Sniny",
    "porovnanie s bežnou výmerou parcely (ak chcete „X bežných parciel“)"
  ],
  "recommendations": [
    "Uverejniť cenu — „na vyžiadanie“ výrazne znižuje reakcie.",
    "„Novostavba“ pri 2016 radšej nahradiť „mladý murovaný dom (2016)“.",
    "Ak chcete zhmotnenie „šesť bežných parciel“, doplňte do vstupu referenčný rozsah (napr. 400–800 m²).",
    "Doplniť charakterLokality, ak chcete soft municipal tone."
  ],
  "techniquesUsed": [2, 3, 5, 6, 8, 9, 10]
}
```

---

## Test 5 — Stress: prázdny popis

### Vstup (parametre)
```
typ: byt, predaj
lokalita: Prešov, Sídlisko III
izby: 3
plocha: 72 m²
poschodie: 4/8
cena: 149 900 €
rok: (chýba)
stav / vybavenie: (chýba)
popis: ""
maklér: Jana Nováková, 0900 111 222
```

### Výstup JSON (`ListingContent`)
```json
{
  "portal_text": "Tri izby na 72 m² v Prešove na Sídlisku III — štvrté poschodie z ôsmich.\n\nCena 149 900 € (2 082 €/m²). Ďalšie detaily o stave, vykurovaní, balkóne či parkovaní v parametroch chýbajú — pred silnejším textom ich treba doplniť.\n\nPre koho je to trafené presne:\n— Domácnosť, ktorá hľadá 3-izbový byt v Prešove na Sídlisku III.\n— Kupujúci, ktorý chce najprv overiť stav a dispozíciu na obhliadke.\n\n[DOPLNIŤ: rok výstavby] · [DOPLNIŤ: stav / rekonštrukcia] · [DOPLNIŤ: balkón/pivnica/parkovanie] · [DOPLNIŤ: vykurovanie] · [DOPLNIŤ: energetický certifikát]\n\nZavolajte Jane Novákovej na 0900 111 222 a dohodnite si obhliadku.",
  "fb_ad_copy": "3-izbový byt 72 m² v Prešove na Sídlisku III — štvrté poschodie z ôsmich. Cena 149 900 € (2 082 €/m²). Stav, balkón a parkovanie ešte dopĺňame; text je preto krátky a poctivý.\n\nObhliadka: Jana Nováková, 0900 111 222 — na mieste overíte dispozíciu aj stav.",
  "ig_caption": "Prešov Sídlisko III: 3 izby, 72 m², 4. poschodie z 8, 149 900 €.\n\nJana Nováková, 0900 111 222\n\n#byt #Prešov #SídliskoIII #3izbový #predaj #nehnuteľnosť #obhliadka",
  "email_subject": "Prešov Sídlisko III: 3 izby, 72 m²",
  "email_body": "Dobrý deň,\n\naktuálne máme 3-izbový byt 72 m² v Prešove na Sídlisku III, 4. poschodie z 8, cena 149 900 € (2 082 €/m²). Stav, rok, balkón a parkovanie ešte dopĺňame — preto je text krátky a poctivý.\n\nAk hľadáte 3 izby na Sídlisku III, zavolajte Jane Novákovej na 0900 111 222 a dohodnite obhliadku.\n\nS pozdravom",
  "seo_keywords": ["3-izbový byt Prešov", "Sídlisko III byt", "byt 72 m² Prešov", "predaj bytu Prešov", "4. poschodie", "Sídlisko III"],
  "titles": [
    "3-izbový byt 72 m² — Prešov, Sídlisko III, 149 900 €",
    "Prešov Sídlisko III: 3 izby, 72 m², 4. poschodie",
    "72 m² / 3 izby na Sídlisku III — Prešov, 149 900 €"
  ],
  "missingData": [
    "rok výstavby",
    "stav / čo zahŕňala rekonštrukcia",
    "balkón / lodžia / pivnica",
    "parkovanie",
    "typ vykurovania",
    "energetický certifikát",
    "orientácia / výhľad",
    "vlastníctvo / list vlastníctva poznámky"
  ],
  "recommendations": [
    "Doplniť aspoň 4–5 faktov — inak text ostane správne slabý.",
    "Bez skrytej prednosti neforceovať obrátenie námietky ani scénu zo života.",
    "Doplniť charakterLokality (napr. sídlisko), ak chcete soft municipal tone."
  ],
  "techniquesUsed": [3, 5, 8, 10]
}
```

### Founder feedback (b) — 2026-08-07

Founder označil `fb_ad_copy` lead vyššie ako „písal človek“. Artefakt = **FINAL stress** (nie golden). Interpretácia: prompt oklamal foundera na riedkom vstupe → **pozitívny** signál pre stress/C3, nie FAIL. **Nie** C2 verdikt Teriakovce/Ľubotice. Detail: `listing-generator-C2-notes.md`.

---

## Test 6 — Stress: luxusná novostavba BA

### Vstup (parametre)
```
typ: novostavba, predaj (byt)
lokalita: Bratislava – Eurovea / rieka
izby: 4
plocha: 128 m²
poschodie: 12/16
cena: 689 000 €
rok: 2025
vybavenie: klimatizácia · podlahové kúrenie · pivničná kobka · 1 parking
popis: "LUXUSNÝ APARTMÁN S VÝHĽADOM NA DUNAJ — PRESTIŽNA ADRESA!!!"
maklér: Peter Kováč, 0911 222 333
porovnanie trhu: NIE VO VSTUPE
```

### Výstup JSON (`ListingContent`)
```json
{
  "portal_text": "Na dvanástom poschodí novostavby z roku 2025 máte 128 m² a štyri izby — s klimatizáciou, podlahovým kúrením, pivničnou kobkou a jedným parkovacím miestom. Cena 689 000 € (5 383 €/m²).\n\nLokalita: Bratislava. Marketingový popis v CAPS („LUXUSNÝ… PRESTIŽNA…“) do klientského textu nekopírujeme. [DOPLNIŤ: či je výhľad na rieku z obývačky / spálne]\n\nPre koho je to trafené presne:\n— Domácnosť, ktorá chce väčší byt v novostavbe bez rekonštrukcie.\n— Kto potrebuje parking priamo pri byte.\n— Kupujúci, ktorý porovnáva novostavby podľa výmery, poschodia a ceny.\n\nZavolajte Petrovi Kováčovi na 0911 222 333 a dohodnite obhliadku.",
  "fb_ad_copy": "Novostavba 2025 v Bratislave: 4 izby, 128 m², 12. poschodie z 16. Klimatizácia, podlahové kúrenie, pivničná kobka, jedno parkovacie miesto. Cena 689 000 € (5 383 €/m²). Bez prázdnych „luxusných“ prívlastkov.\n\nPeter Kováč, 0911 222 333 — dohodnite obhliadku.",
  "ig_caption": "Bratislava novostavba 2025: 4 izby, 128 m², 12. poschodie z 16, klimatizácia, podlahové kúrenie, pivničná kobka, 1 parking. 689 000 €.\n\nPeter Kováč, 0911 222 333\n\n#byt #Bratislava #novostavba #4izbový #predaj #parking #podlahové",
  "email_subject": "BA novostavba 2025: 128 m², 4 izby",
  "email_body": "Dobrý deň,\n\nnabízam 4-izbový byt 128 m² v novostavbe 2025 v Bratislave, 12. poschodie z 16. Vybavenie: klimatizácia, podlahové kúrenie, pivničná kobka, jedno parkovacie miesto. Cena 689 000 € (5 383 €/m²). Výhľad na rieku potvrdíme až ako fakt dispozície — nie z marketingového popisu.\n\nObhliadka: Peter Kováč, 0911 222 333.\n\nS pozdravom",
  "seo_keywords": ["4-izbový byt Bratislava", "novostavba 2025 BA", "byt 128 m² Bratislava", "byt s parkingom", "podlahové kúrenie", "predaj bytu Bratislava"],
  "titles": [
    "4-izbový byt 128 m², novostavba 2025 — Bratislava, 12. poschodie",
    "Novostavba BA: 128 m², klimatizácia, parking, 12/16",
    "128 m² / 4 izby, podlahové kúrenie + parking — Bratislava 2025"
  ],
  "missingData": [
    "potvrdený výhľad (ktoré miestnosti, na čo)",
    "energetický certifikát",
    "poplatky do fondu opráv / mesačné náklady",
    "orientácia bytu",
    "stav projektu (kolaudácia / odovzdanie)"
  ],
  "recommendations": [
    "Ignorovať CAPS a prázdne „LUXUSNÝ/PRESTIŽNA“ z pôvodného popisu — v klientskom texte ich neopakovať.",
    "Ak je výhľad kľúčový predajný argument, musí byť vo vstupe ako fakt dispozície — nie len z marketingového popisu.",
    "Doplniť charakterLokality (napr. centrum), ak chcete soft municipal tone."
  ],
  "techniquesUsed": [2, 3, 5, 8, 9, 10]
}
```

---

## Self-eval (C4)

| Kritérium | Nález |
|---|---|
| Schema = typ | 6/6 PASS — povinné snake_case + optionals; žiadne `mainText`/`socialText` |
| Latka vs. golden | Štruktúra scéna → fakty → segmenty → CTA; scény parafrázy, nie copy-paste |
| Uzemnenie (O2) | Bez paneláku, inventovaných miestností, soft municipal, trhového €/m², „pri Dunaji“ bez faktu |
| Právo (O3) | Bez výnosov; bez právnej čistoty; „bez schodov“ zmiernené pri podkroví |
| E2 dĺžka | T1–T4 portal_text v 220–320; T5/T6 pod 220 OK (§6 chudobný vstup) |
| social split | `socialText` → `fb_ad_copy` + `ig_caption` (produkčná sémantika) |
| Riziko | **PR-A** (wire FINAL do `generateListingContent`) + C2 founder — mimo C4 |

---

**CHECKPOINT C4 CLOSED** — dôkaz hotový · PR-A WIRED · handoff: `listing-generator-K5-handoff.md`.
