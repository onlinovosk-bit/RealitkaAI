# GTM Playbook — predaj Revolis.AI realitným kanceláriám

**Dátum:** 2026-09-18 · **Typ:** strategy / living-document · **Status:** NÁVRH (žiadny GO)
**Brány:** `docs/architecture/revolis-constitution-v2.md` (12Q) · `docs/architecture/clay-positioning-reframe.md` (jazyk) · `docs/architecture/master-data-sourcing-map.md` (dáta) · GDPR gate
**Stealth:** referenčný klient sa v tomto dokumente menuje interne; **von nejde meno bez písomného súhlasu**.

> Tento dokument je odpoveď na tri otázky foundera (stratégie predaja, 80/20 majiteľa RK,
> nápady na akvizíciu). Nie je to feature brief a nezakladá žiadnu implementáciu.

---

## 0. Východisko — čo hovoria DÁTA z repa (nie dojmy)

| # | Fakt | Dôkaz v repe |
|---|------|--------------|
| F1 | **Trh trikrát nezávisle odmietol „AI/CRM"** — kancelárie ho odmietajú, lebo *„nikto im nedodá klientov, ktorí chcú predať"* (Molnár 7/2026, Suchý 5.8.2026, pitch ARCHEUS) | `memory/decisions.md:501` |
| F2 | **Zákazník sám pomenoval wedge:** „CRM nie, ale vyhľadávanie predávajúcich áno" (Molnár, AA Reality) | `docs/sales/call-list-2026-07-w30.md` |
| F3 | **Existuje cenová kotva trhu: 300 €/tip** — RK už dnes platí za tip na predávajúceho | `docs/sales/call-list-2026-07-w30.md` (REALITY KAMZÍK) |
| F4 | **Loop je 31 dní na nule**: `matches=0`, `intents=0`, `outreach=0`, `viewings=0`, `closed_won=0`; `leads_new=28`, `activities=3` | `docs/reports/2026-09-15-north-star-backfill.md` |
| F5 | **Nikdy neprišiel reálny akvizičný signál Revolisu** — všetky `saas_leads` sú smoke/test | `docs/audit/d5-akvizicia-2026-07-09.md` (D5-1, D5-6) |
| F6 | **Verbálny záujem ≠ ochota platiť** — Smolko aj Molnár potvrdili záujem bez kanála, SLA a ceny | `memory/decisions.md:387` |
| F7 | **NBS dalo PÍSOMNÉ povolenie** na komerčné použitie verejných agregovaných krajských radov €/m² (86 kvartálov, 2005Q1–2026Q2) s povinnou atribúciou | `docs/legal/nbs-povolenie-2026-08-10.md`, `docs/reports/2026-08-15-nbs-kraj-rady-v0.2.md` |
| F8 | **Chýba len kalibrácia realizačná/ponuková** (ŠÚ SR = index, NBS = €/m² → nespárované). Koeficient = `null`, nič sa nepublikuje | `docs/reports/2026-08-15-nbs-kraj-rady-v0.2.md` |
| F9 | **Realvia integrácia je živá** — jediný automatický signál, webhooky bežia (výkyvy 7 / 9 / 2 za 31 dní) | north-star report, `master-data-sourcing-map.md` Zhluk 8 |
| F10 | **Founder je hrdlo fabriky** — odhad 118 PR / 15 vĺn ≈ 5–6 mesiacov jeden človek; desiatky otvorených fix PR čaká na merge | `memory/decisions.md:508`, `memory/session-summary.md` |

### Diagnóza v jednej vete

> Revolis predáva **softvér** trhu, ktorý trikrát povedal, že kupuje **predávajúcich**.
> Nie je to problém akvizície leadov. Je to problém **packagingu, dôkazu a aktivácie.**

---

## 1. Reframe problému (bez tohto je zvyšok kozmetika)

Pôvodná formulácia: *„mám problém predať SaaS/CRM/AI realitným kanceláriám."*

Presná formulácia podľa dôkazov:

1. **Predávam kategóriu, ktorú trh odmieta** (F1). „CRM" a „AI" sú pre majiteľa RK náklad, nie výnos.
2. **Nemám dôkaz** — 31 dní loopu na nule (F4) a žiadna publikovateľná referencia (stealth).
3. **Nemám aktiváciu** — `activities=3`/31 dní znamená, že ani platiaci klient nepracuje v nástroji.
4. **Nemám merateľnú distribúciu** — outreach existuje v Exceli, nie v systéme (F5, D5-7).
5. **Som sám a merge-ujem sám** (F10) — každá hodina v procese je hodina mimo zákazníka (Founder Trap: *Customer Avoidance* + *Distribution Blindness*).

Poradie riešenia je záväzné: **packaging → dôkaz → aktivácia → distribúcia.**
Kto škáluje distribúciu pred dôkazom, kupuje si drahšie „nie".

---

## 2. ČASŤ 1 — Stratégie riešenia (8, každá s bránou)

Formát: **Mechanizmus → Kroky → Výsledok → Ústavná brána → Riziko.**

---

### S1 — Preklopiť produkt z „CRM" na „zdroj predávajúcich" (kategória)

**Mechanizmus.** Trh nekupuje nástroj, kupuje mandát (výhradné zastúpenie). Revolis má
`/odhad/[agencySlug]` widget, ktorý vyrába rozhovory s majiteľmi, čo chcú predať. To
je jediná časť produktu, ktorú si trh sám vypýtal (F2). Všetko ostatné je *ako* sa to doručí.

**Kroky.**
1. Prepísať prvú vetu všade (web, e-mail, hovor) z „AI CRM" na výsledok:
   *„Privedieme vám majiteľov, ktorí chcú predať — a postrážime, aby ste im zavolali prví."*
2. CRM, Action Queue, triage, chatbot = **doručovací mechanizmus v pozadí**, nie predmet predaja.
3. Demo nesmie začať prihlásením do CRM. Začína widgetom a jedným leadom, ktorý z neho spadne.
4. Cenník prestavať na jazyk mandátu (viď S5), nie na „seaty a moduly".

**Výsledok.** Odstraňuje námietku č. 1 („ďalší systém nechcem"), lebo predávaš to,
čo si pýtali. Konverzia z hovoru na demo by mala stúpnuť — meraj, netvrď.

**Brána 12Q.** Q1 áno (trh to pomenoval sám) · Q2 áno (mandát = provízia) · Q3 priamo ·
Q8 správny čas (widget existuje, NBS licencia je na stole) · Q9 áno — je to **copy a packaging, nie kód.**
→ **BUILD (0 € engineering).** Toto je najlacnejšia zmena s najvyšším dopadom v celom dokumente.

**Riziko.** Nesmieš sľúbiť objem leadov, ktorý nevieš doručiť. Sľubuješ **mechanizmus a SLA**,
nie počet. Inak si za 60 dní v refund konverzácii.

---

### S2 — Odblokovať poctivý odhad z NBS dát (odstrániť VETO, nie ho obísť)

**Mechanizmus.** VETO na plný BUILD widgetu znelo: *chýba licencovaný reprodukovateľný zdroj
cenových dát; LLM nesmie vytvárať pásmo bez neho* (`decisions.md` 2026-07-19). **Tento
predpoklad už neplatí v pôvodnom rozsahu**: NBS dalo písomné povolenie na komerčné použitie
verejných krajských radov €/m² (F7). Čo stále chýba, je koeficient realizačná/ponuková (F8) —
to je **presnosť, nie legalita.**

**Kroky.**
1. Rozhodnúť rozsah tvrdenia: widget zobrazuje **ponukovú** úroveň kraja podľa NBS, výslovne
   označenú, s povinnou atribúciou. Nezobrazuje „trhovú cenu" ani „realizačnú cenu".
2. UI copy poctivo: *„Orientačné rozpätie z ponukových cien vo vašom kraji (zdroj: spracované
   údaje NBS — United Classifieds, NARKS). Presné číslo vám dá maklér po obhliadke."*
3. Koeficient realizačná/ponuková ostáva `null` a **nepublikuje sa**, kým sa nespáruje jednotka.
4. Regresný test na kalkulačku (historicky +40 % chyba poškodila značku platiaceho klienta —
   `decisions.md:584`). Bez zeleného testu sa widget nikam neposiela.

**Výsledok.** Widget prestáva byť „VALIDATE navždy" a stáva sa predajným artefaktom, ktorý
môžeš dať do rúk každej RK v regióne. Bez neho je celé S1 sľub bez produktu.

**Brána 12Q.** Q1 áno · Q4/Q6 áno (licencovaný zdroj + first-party seller intent = moat,
ktorý scraping nedá) · Q8 **správny čas — povolenie prišlo 10.8.2026** · Q9 áno (dáta sú
stiahnuté, SHA-256 zaznamenané).
→ **BUILD — ale vyžaduje samostatný founder GO**, lebo mení tvrdenie voči zákazníkovi.

**Riziko.** Ponuková ≠ realizačná. Ak to v UI nezaznie doslova, vyrábaš AP-001 (fake číslo)
a zopakuješ chybu +40 %. Atribúcia NBS je zmluvná povinnosť, nie estetika.

---

### S3 — „Nechajte si Realviu" — vrstva namiesto výmeny (zaslúžený claim)

**Mechanizmus.** Najväčší zabijak CRM predaja je migrácia. Realvia integrácia **reálne beží**
(F9), takže pre každú RK na Realvii je tvrdenie *„my sedíme nad tým, čo máte"* pravdivé —
a `clay-positioning-reframe.md` hovorí: *earn it, don't claim it*. Tu je to zaslúžené.

**Kroky.**
1. Segmentovať cieľový zoznam na **A: beží na Realvii** / B: iný systém / C: Excel+e-mail.
2. Pre segment A úplne iný otvárač: *„Realviu si nechávate. My len dorobíme ranný zoznam,
   komu volať a prečo."* (Tento hák už v obvolávacej listine funguje — GARANT REAL.)
3. Nulový migračný projekt = nulová výhovorka. Onboarding merať v minútach, nie dňoch.
4. Segment C (Excel) predávať ako náhradu — tam si CRM a je to v poriadku.

**Výsledok.** Segment A má najkratší predajný cyklus v celom trhu. Je to tvoj prvý zoznam.

**Brána 12Q.** Q1 áno · Q7 áno (nulový engineering, len segmentácia) · Q8 správny čas.
→ **BUILD (0 € engineering).**

**Riziko.** Neprekrič to. Kým nemáš RealSoft/Nehnuteľnosti adaptér, nehovor „vrstva nad
všetkými CRM" — hovor „nad Realviou", lebo len to je pravda.

---

### S4 — Audit-led predaj: predaj diagnostiku, nie prihlásenie

**Mechanizmus.** Namiesto „skúste demo" ponúkni **výstup na ich vlastných dátach**.
Repo na to má hotové diely: `/proof` engine, BRI diagnostika, Guardian listing scoring,
`createSaasLead()`. Klasika kategórie (HubSpot Website Grader): zadarmo dáš zrkadlo,
predáš to, čo v ňom vidia.

**Kroky.**
1. Vyžiadaj štandardný export (Realvia/CSV) → izolovaný tenant → beh diagnostiky.
2. Výstup = **jedna A4**: čas do prvého kontaktu, leady bez follow-up, kvalita inzerátov,
   odhad ušlej provízie **s poctivým labelom** *„vypočítané z vášho exportu"*.
3. 20-minútový readout naživo. Predaj až na konci, jednou vetou.
4. Prázdne polia = *honest pending*, nikdy dopočítané (viď BRI doktrína, `decisions.md` 2026-06-21).

**Výsledok.** Mení „nemám čas na demo" na „ukážte mi, kde strácam". Zároveň ti to dá dáta
o tom, ako vyzerajú dáta viacerých RK — dnes poznáš len jednu.

**Brána 12Q.** Q1 áno · Q5/Q6 áno (učíš sa naprieč kanceláriami = moat) · Q9 áno (reuse).
→ **VALIDATE → BUILD** po 3 odbehnutých auditoch manuálne. Neautomatizuj skôr.

**Riziko.** GDPR: cudzí export obsahuje osobné údaje. **Pred prvým auditom spusti `gdpr-advisor`**,
uzavri spracovateľskú zmluvu (processor), retenciu a mazanie. Bez toho sa audit nerobí.

---

### S5 — Cenotvorba proti známej kotve: 300 €/tip, nie „SaaS seat"

**Mechanizmus.** RK už dnes platí **300 € za tip** na predávajúceho (F3). To je jediná overená
cenová kotva v repe — silnejšia než akákoľvek úvaha o 349 €/mesiac. Keď predávaš „seat",
porovnávajú ťa s nákladom. Keď predávaš tipy, porovnávajú ťa s **alternatívou, ktorú už platia.**

**Kroky.**
1. Postav cenník s dvoma osami: **(a) prístup** (nízky mesačný, aby bol vstup bezbolestný) +
   **(b) výsledok** (fixný poplatok za doručeného predávajúceho / zazmluvnený mandát).
2. Argument v hovore: *„Dnes platíte 300 € za tip od človeka. Toto vám ich vyrába systematicky."*
3. Pilot 60–90 dní s **vopred písomne definovanou metrikou** (použi `growth-metrics-definitions-v0.md`),
   nie s „uvidíme".
4. Záruka musí byť **ohraničená** (strop, definícia, dôkaz z north-star inštrumentácie).

**Výsledok.** Odstraňuje cenovú námietku tým, že mení referenčný bod. Zároveň to je jediný
model, kde tvoja north-star inštrumentácia funguje ako **obchodné aktívum**, nie ako interný report.

**Brána 12Q.** Q1 áno · Q2 áno · Q8 **pozor** — outcome pricing bez funkčného loopu (F4) je
predčasné. Najprv musí byť `matches > 0`.
→ **VALIDATE.** Kotvu 300 € používaj v argumentácii **hneď**; výkonnostný cenník až po prvom
nenulovom týždni loopu.

**Riziko.** Atribúcia. Kto doručil predávajúceho — widget alebo maklérov známy? Bez toho je
záruka nevymáhateľná a skončí v spore. Definuj atribúciu **pred** podpisom.

---

### S6 — Vyriešiť aktiváciu jedným artefaktom, nie ďalšou obrazovkou

**Mechanizmus.** `activities=3` za 31 dní hovorí jednu vec: **maklér sa neprihlasuje.**
Každá ďalšia featúra v CRM je preto investícia do prázdnej miestnosti. Riešenie nie je
lepšie UI — je to produkt, ktorý **nevyžaduje prihlásenie.**

**Kroky.**
1. Ranný artefakt o 7:30: e-mail/SMS s **5 menami a 5 dôvodmi, prečo volať.** Žiadny login.
2. Odpoveď „hotovo" / klik na číslo = zápis aktivity. Tým vzniká Zhluk 1 (vlastné dáta),
   ktorý dnes chýba a blokuje ~6 ďalších featúr (`master-data-sourcing-map.md`).
3. Meraj jediné: **% mien, ktorým sa v ten deň zavolalo.** To je aktivačná metrika.
4. Až keď je toto číslo nenulové, má zmysel stavať čokoľvek ďalšie v dashboarde.

**Výsledok.** Odomyká flywheel (Q5), ktorý je dnes zastavený. Bez toho je retencia
existujúceho klienta ohrozená — a Prime Directive stavia retenciu na roveň akvizície.

**Brána 12Q.** Q1 áno · Q5 **áno — toto je ten chýbajúci kus flywheelu** · Q9 áno (digest
infra existuje).
→ **BUILD — najvyššia priorita z produktovej strany.** Fixuje F4, ktoré blokuje S5 aj každú referenciu.

**Riziko.** Ak 5 mien nie je dobrých, zabiješ dôveru za jedno ráno. Radšej 2 dobré než 5 vyplnených.

---

### S7 — Kohorta 3–5 design partnerov namiesto jedného klienta

**Mechanizmus.** Jeden referenčný klient = nulová štatistika, totálna závislosť a **zákaz
menovať ho v marketingu** (stealth pravidlo). To znamená, že dnes nemáš *žiadnu* publikovateľnú
referenciu. To sa nedá vyriešiť lepším textom, len ďalšími klientmi.

**Kroky.**
1. Osloviť 5 kancelárií, ktoré už verbálne prikývli (Molnár, ARCHEUS, Vitko, Suchý + 1).
2. Ponuka: 90 dní za symbolickú cenu **výmenou za tri veci v zmluve**: (a) týždenná spätná
   väzba 30 min, (b) **písomný súhlas byť menovaný**, (c) prístup k číslam pre prípadovú štúdiu.
3. Symbolická cena, nie zadarmo — zadarmo nemeria ochotu platiť (F6).
4. Zámerne rôzne segmenty (Realvia / iné CRM / Excel), aby si vedel, kde je onboarding bolestivý.

**Výsledok.** Rieši súčasne dôkaz, referencie aj vzorku. Bez toho každý ďalší predaj začína od nuly.

**Brána 12Q.** Q1 áno · Q11 **áno — toto je najlepšie využitie founderovho času** · Q12 áno.
→ **BUILD (obchodná úloha, nie engineering).**

**Riziko.** 5 design partnerov = 5× podpora pri jednom človeku. Strop je reálne 3, ak beží aj vývoj.

---

### S8 — Zrušiť procesnú daň, aby vznikol čas na zákazníka

**Mechanizmus.** 118 PR v 15 vlnách, desiatky otvorených fix PR, „founder merge-uje všetko" (F10).
Pri jednom človeku je to sebauväznenie. Ústava má na to pomenovanie: *Customer Avoidance* —
kód je pohodlnejší než hovor.

**Kroky.**
1. Definovať **auto-merge lane** pre úzko ohraničené bugfixy so zeleným CI (`docs/AUTOMERGE-POLICY.md` existuje).
2. Ostatné PR triage do troch kôp: *blokuje zákazníka* / *blokuje predaj* / *ostatné*. Tretia kopa sa zatvorí.
3. Fixný blok v kalendári: **min. 4 hodiny týždenne výhradne na hovory so zákazníkmi**, neprenosné.
4. Merge sa robí raz denne v jednom okne, nie priebežne.

**Výsledok.** Jediný zdroj, ktorý nevieš kúpiť, je founderov čas. Toto ho vracia do predaja.

**Brána 12Q.** Q11 áno.
→ **BUILD (proces, 0 € engineering).** Vyžaduje founder rozhodnutie o auto-merge rozsahu.

**Riziko.** Auto-merge bez pevného rozsahu = produkčný incident u jediného platiaceho klienta.
Lane musí byť úzka a testami krytá, inak sa nezavádza.

---

## 3. ČASŤ 2 — 80/20: majiteľ realitnej kancelárie

> Otázka bola o „Real Estate Owner". V tomto biznise sú to **dve rôzne osoby** a zamieňať ich
> je najdrahšia chyba: **majiteľ RK platí** (B2B), **majiteľ nehnuteľnosti je surovina** (B2C).
> Nižšie primárne prvý, sekundárne druhý.

### 3.1 Desať vecí, ktoré vysvetľujú 80 % jeho správania

**1. Jeho ekonomika je provízna a hrudkovitá.**
Príjem = % z predajnej ceny, nepravidelne. Jeden stratený obchod prevyšuje ročný náklad
na softvér o rád. *Aplikácia:* celý pitch sa zmestí do vety „jeden zachránený obchod zaplatí
roky". *Pozor:* konkrétne € doplň z reálneho priemeru klienta, nie z hlavy — inak vyrábaš AP-001.

**2. Jeho úzke hrdlo nie sú kupujúci, ale MANDÁTY.**
Kupujúcich je na trhu dosť. Chýbajú **výhradné zastúpenia**. Preto trh trikrát povedal to isté (F1):
nechcú systém na správu dopytov, chcú prísun predávajúcich. *Aplikácia:* toto je dôvod, prečo
je widget jadro ponuky a CRM príslušenstvo — nie naopak.

**3. Makléri nie sú zamestnanci, sú živnostníci.**
Majiteľ im **nemôže prikázať** používať softvér. Každý nástroj, ktorý stojí na disciplíne makléra,
zomrie. *Aplikácia:* toto je presná príčina `activities=3`. Nástroj musí maklérovi priniesť
**osobné peniaze v ten istý deň**, inak sa neotvorí (→ S6).

**4. Kupuje jeden človek, za jeden hovor.**
Žiadne obstarávanie, žiadny výbor. *Aplikácia:* predajný cyklus môže byť dni, nie mesiace —
ak sa dostaneš k majiteľovi s **konkrétnym číslom o jeho firme** (→ S4).

**5. Už niečo platí — a to je tvoja referenčná cena.**
Portálová inzercia, CRM licencia, Google Ads, tipy (300 €/tip, F3). *Aplikácia:* nikdy neporovnávaj
svoju cenu s nulou. Porovnávaj ju s tým, čo už uteká.

**6. Je softvérovo unavený a migračne alergický.**
Zažil aspoň jeden neúspešný CRM projekt. *Aplikácia:* „nechajte si, čo máte" (→ S3) je silnejší
argument než akákoľvek featúra.

**7. Rýchlosť prvého kontaktu je jediná vec, ktorú vie okamžite uznať.**
Vie z praxe, že kto volá prvý, berie mandát. *Aplikácia:* toto je tvoje jediné univerzálne,
poctivé tvrdenie — a zároveň jediné, ktoré vieš merať bez cudzích dát.

**8. Reputácia je lokálna a osobná.**
V Poprade/Košiciach sa referencie prenášajú telefonicky. *Aplikácia:* jeden spokojný majiteľ,
ktorý ťa smie menovať, prebije stovku studených e-mailov. Preto je S7 (design partneri)
akvizičná stratégia, nie produktová.

**9. GDPR sa bojí latentne.**
Väčšina tíško robí veci, ktoré by nemala (kúpené zoznamy, scraping). *Aplikácia:* „legálny zdroj
s atribúciou" (NBS, RPO, kataster geometria) je diferenciátor pri väčších a profesionálnejších
kanceláriách. Pri malých je to bezcenné — nestrácaj tým čas v segmente C.

**10. Nedôveruje číslu, ktoré nevie overiť.**
Ak mu ukážeš odhad ceny, ktorý je o 40 % vedľa, stratíš ho navždy — a to sa už raz stalo
(`decisions.md:584`). *Aplikácia:* radšej širšie pásmo s uvedeným zdrojom než presné číslo
bez zdroja. Poctivosť tu nie je etika, je to retencia.

### 3.2 Čo z toho plynie pre pitch (jeden odstavec)

> *„Nepredávam vám CRM. Postavím vám zdroj majiteľov, ktorí chcú predať, a postrážim,
> aby im maklér zavolal prvý. Realviu si nechávate. Odhad ceny počítam z oficiálnych
> krajských dát NBS a poviem vám presne, odkiaľ číslo je. Dnes platíte 300 € za jeden tip —
> toto vám ich vyrába systematicky."*

Každá veta v tomto odstavci je krytá dôkazom z repa. Žiadna nie je nárok do budúcnosti.

### 3.3 Sekundárne: majiteľ nehnuteľnosti (predávajúci) — 20 % z 20 %

| Insight | Dôsledok pre produkt |
|---|---|
| Jeho prvá otázka **nie je** „ktorá RK", ale **„koľko to má cenu"** | Preto je vstupný bod kalkulačka, nie kontaktný formulár |
| Osloví 2–3 kancelárie naraz | Vyhráva **prvý s dôveryhodným číslom** → SLA na prvý kontakt je celý produkt |
| Bojí sa viazanosti (výhradná zmluva) | V prvom kontakte sa o exkluzivite nehovorí |
| Nechce byť „lead" | Preto žiadne fake „AI analyzuje…", ale čestné *„počítame z krajských dát"* |
| Dal údaje dobrovoľne | **First-party + consent provenance = moat**, ktorý scraping nikdy nedá |

---

## 4. ČASŤ 3 — Akvizičné nápady (zoradené podľa pomeru dopad/úsilie)

### A1 — Postaviť TAM zoznam z RPO (legálne, zadarmo, hneď) ⭐

Dnes je outreach v Exceli a **nemerateľný** (D5-7). RPO REST API (`api.statistics.sk/rpo/v1/`,
mieri na V2) je **otvorené, CC BY 4.0** a agreguje ORSR + živnosti (`master-data-sourcing-map.md`
Zhluk 4). Vieš z neho vytiahnuť **úplný zoznam realitných subjektov v SR** podľa predmetu činnosti,
s IČO, sídlom a dátumom vzniku.

**Kroky:** dopyt RPO podľa NACE realitných činností → dedup → geo-segmentácia (PO/KE najprv) →
označenie segmentu A/B/C podľa používaného CRM → **jeden zdroj pravdy pre outreach** (nie xlsx).
**Výsledok:** po prvý raz merateľná akvizícia — vieš povedať „oslovených N, odpovedalo M".
**GDPR gate:** firemné údaje z RPO sú OK **s atribúciou**. Kontaktné údaje konkrétnych ľudí
= osobné údaje → 6(1)(f) + balancing test + informačná povinnosť čl. 14. **Spusti `gdpr-advisor`
pred prvým odoslaným e-mailom.** Žiadne kúpené zoznamy (Fáza 1 má túto bránu default OFF).
**Brána:** Q1 áno · Q8 správny čas · Q9 áno (API hotové) → **BUILD.**

### A2 — Guardian ako studený otvárač: „skóre vašich inzerátov" ⭐

Máš hotový listing scoring (Guardian, listing score, Launch Pack). Inzeráty RK sú **verejné
a ich fakty nie sú osobné údaje** (cena, plocha, lokalita, počet fotiek — `master-data-sourcing-map.md`
Zhluk 5). Oskóruj 5 inzerátov konkrétnej kancelárie a pošli to ako prvý kontakt.

**Prečo to funguje:** nie je to „predstavujem vám náš produkt", je to konkrétny, personalizovaný,
použiteľný výstup o **ich** práci. To je najvyššia odpovedná miera, akú vieš dosiahnuť.
**Kroky:** 5 inzerátov → skóre + 3 konkrétne nálezy → e-mail bez ponuky → hovor s ponukou.
**Pozor:** len fakty, žiadne osobné údaje predajcov, rešpektuj robots.txt a rate-limit.
**Brána:** Q1 áno · Q6 áno (učíš sa o kvalite inzercie naprieč trhom) · Q9 áno (reuse) →
**VALIDATE → BUILD** po 10 manuálnych odoslaniach.

### A3 — Partnerská distribúcia namiesto studeného predaja

Realvia / RealSoft / Nehnuteľnosti majú zákaznícku bázu, ktorú ty roky budovať nebudeš.
**Kroky:** návrh integračného listingu + revenue share → spoločný webinár pre ich klientov →
„odporúčaný doplnok". **Výsledok:** jeden podpísaný partner prebije 100 studených e-mailov.
**Brána:** Q1 áno · Q8 — vyžaduje aspoň jednu referenciu, inak nemáš čím argumentovať →
**BACKLOG do splnenia S7** (kohorta design partnerov).

### A4 — Realitná únia SR: členská výhoda + barometer

Draft pripomienky už existuje (`docs/sales/realitna-unia-pripomienka-draft.md`, bez odpovede
~2 týždne k 15.8.). Asociácia = distribúcia + dôveryhodnosť naraz.
**Kroky:** dotiahnuť odpoveď na barometer → ponúknuť členskú zľavu → požiadať o prednášku/webinár.
**Brána:** Q1 áno · Q9 áno (0 € engineering) → **BUILD (obchodná úloha).**

### A5 — Regionálny realitný index ako obsahový magnet

NBS krajské rady sú licencované (F7), kataster geometria je otvorená (Zhluk 2), RPO je otvorené
(Zhluk 4). Z toho vieš **legálne** publikovať mesačný prehľad pre Prešovský/Košický kraj.
**Výsledok:** v malom trhu sa z toho stane autorita v regióne = inbound bez rozpočtu.
**Pozor:** povinná atribúcia NBS v presnom znení, disclaimer, žiadne osobné údaje.
**Brána:** Q1 nepriamo · Q8 správny čas pre NBS časť · Q9 áno →
**VALIDATE** (najprv 1 vydanie, zmeraj odozvu; nezakladaj „mediálny program").

### A6 — Referral loop z existujúcej bázy

Majitelia RK sa poznajú (bod 8 vyššie). **Kroky:** za odporúčanie, ktoré skončí podpisom,
kredit/mesiac zadarmo. **Podmienka:** až keď je klient preukázateľne spokojný — inak
akceleruješ negatívny word-of-mouth. **Brána:** Q8 — predčasné pri `activities=3` → **BACKLOG do S6.**

### A7 — Vstupný produkt zadarmo, ktorý nepotrebuje login

To isté ako S6, ale ako akvizičný kanál: **ranný zoznam „komu volať"** ako samostatná
bezplatná služba na 14 dní. Nulová inštalácia, nulové riziko, okamžitá hodnota.
**Land-and-expand:** kto si 14 dní zvykol na ranný e-mail, kupuje zvyšok.
**Brána:** Q1 áno · Q5 áno · Q9 áno → **BUILD spolu s S6.**

### A8 — Sezónnosť a načasovanie outreachu

Realitný trh má jarný a jesenný vrchol; softvér sa kupuje v pokojnejších mesiacoch.
**Aplikácia:** studené oslovovanie plánuj mimo vrcholu transakcií, inak ti majiteľ nezdvihne.
**Brána:** 0 € — je to len kalendár. → **BUILD.**

---

## 5. Sekvencia 30 / 60 / 90 dní

| Okno | Cieľ | Obsah | Úspech = |
|---|---|---|---|
| **0–30 dní** | Dôkaz a aktivácia | S1 (packaging) · S3 (segmentácia A/B/C) · S6+A7 (ranný artefakt) · S8 (uvoľniť čas) · A1 (RPO zoznam) | `activities` **> 0 každý pracovný deň** u existujúceho klienta |
| **30–60 dní** | Prvé nezávislé potvrdenie | S2 (NBS odhad, po GO) · S4 (3 manuálne audity) · A2 (10 Guardian otváračov) · S7 (3 design partneri) | **2. platiaci zákazník podpísaný** |
| **60–90 dní** | Opakovateľný motion | S5 (cenník proti kotve 300 €) · A4 (Únia) · A3 (partner) · A5 (1. vydanie indexu) | **`closed_won` ≥ 1** v north-star |

**Poradie je záväzné.** Kto skočí na A3/A5 pred S6/S7, robí marketing pre produkt,
ktorý nikto denne neotvára.

---

## 6. Čo merať (inštrumentácia už existuje)

Nepotrebuješ nový dashboard. Potrebuješ, aby **týchto päť čísel prestalo byť nula**
(`.ai/bus/metrics/north-star-*.jsonl`, `scripts/sql/north-star-day.sql`):

| Metrika | Dnes | Prvý zmysluplný cieľ |
|---|---:|---|
| `activities` / pracovný deň | ~0 (3 za 31 dní) | > 0 každý deň |
| `matches_new` | **0** | > 0 do 30 dní |
| `auto_responses_sent` (SLA prvý kontakt) | **0** | medián < 4 h |
| Oslovené RK / týždeň (nový RPO zdroj) | nemerateľné | merateľné číslo |
| `closed_won` | **0** | 1 |

Kým je `matches_new = 0`, každá debata o cenníku je hypotetická.

---

## 7. Otvorené neznáme — dohľadať, NEHÁDAŤ

| # | Neznáma | Ako zistiť | Vlastník |
|---|---|---|---|
| U1 | Presný počet realitných subjektov v SR (TAM) | RPO API dopyt podľa predmetu činnosti (A1) | Founder / agent po GO |
| U2 | Priemerná provízia a priemerný počet obchodov RK | Spýtať sa design partnerov — **nepoužiť odhad z internetu** | Founder |
| U3 | Odpoveď Realitnej únie na barometer | Dotiahnuť pripomienku | Founder |
| U4 | Poskytujú portály dátové partnerstvo? | Napísať B2B oddeleniu (Zhluk 5) | Founder |
| U5 | Podmienky zmluvy ÚGKK na vlastníkov | CRZ vzor + podateľňa ÚGKK (Zhluk 3) | Founder |
| U6 | Je kotva 300 €/tip trhová alebo jednorazová? | Overiť u 3 kancelárií v kohorte S7 | Founder |

---

## 8. Čo tento dokument VÝSLOVNE neodporúča

- **Nový acquisition stack / lead factory** — `l99-lead-factory-initiative.md` to uzavrel ako VALIDATE, timing veto platí.
- **Kúpené databázy a externí lead provideri** — právna brána default OFF, bez podpísaného balancing testu a DPA.
- **Scraping vlastníkov z katastra alebo osobných údajov z portálov** — zakázané (Zhluk 3, ToS + GDPR).
- **Akadémia / certifikácie / komunita / marketplace** — pri 1 zákazníkovi cargo cult (`clay-positioning-reframe.md`). Až pri 50+ platiacich.
- **Tvrdenie „intelligence layer nad všetkými CRM"** — zaslúžené je dnes iba voči Realvii.
- **Akékoľvek číslo o úspore/výnose bez zdroja** — AP-001. Radšej `honest pending`.

---

## 9. Odporúčaný ďalší krok (task-loop, čaká na GO)

**Jedna úloha, nie balík:**

> **S2 — rozhodnúť rozsah tvrdenia valuačného widgetu na NBS dátach.**

**Prečo práve táto:**
- Odblokuje S1 (packaging), S4 (audit), A5 (index) a celú kohortu S7 — všetko ostatné na nej stojí.
- Licencia už je (F7), dáta sú stiahnuté a hashované (F8) — ide o **obchodné rozhodnutie o tvrdení**, nie o výskum.
- Prime Directive: priamo zvyšuje pravdepodobnosť 2. platiaceho klienta.
- Ústava: Q1 áno · Q4/Q6 áno (licencovaný zdroj = moat) · Q8 správny čas · Q9 áno.

**GO brána — founder rozhodne tri veci:**
1. Zobrazuje widget **ponukovú** úroveň NBS s explicitným označením? (áno / nie)
2. Ostáva koeficient realizačná/ponuková `null` a nepublikovaný, kým sa nespáruje jednotka? (áno / nie)
3. Presné znenie UI disclaimeru + atribúcie NBS — schváliť text pred nasadením.

**Bez `GO S2` sa nepíše žiadny kód** a widget ostáva v aktuálnom stave.
Paralelne bežia úlohy s nulovým engineeringom (S1, S3, S8, A4, A8) — tie GO nepotrebujú.
