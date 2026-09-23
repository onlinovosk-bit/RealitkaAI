# Ekonomika majiteľa RK → akvizičný systém Revolis.AI

**Dátum:** 2026-09-18 · **Stav:** NÁVRH · **Engineering:** 0 € (okrem výslovne označených)
**Nadväzuje na:** `docs/sales/founder-acquisition-loop-2026-09-18.md` · `gtm-playbook-2026-09-18.md` ·
`positioning-v1-zdroj-predavajucich.md` · `segmentacia-a-b-c-outreach.md`

> **Čo tento dokument NEROBÍ:** neopakuje 80/20 profil, 8 stratégií, 5 engines ani 30-dňový OS —
> tie sú v dokumentoch vyššie. Pridáva to, čo v nich chýba: **ekonomický model majiteľa,
> spúšťače nákupu, mapu námietok, cenovú psychológiu, štruktúru pilotu, rebrík dôkazov
> a experimenty E1–E6.**

---

## 0. Východisko: nezačíname produktom, začíname jeho peniazmi

Majiteľ RK nekupuje softvér. Kupuje **zmenu v jednom z piatich čísel**, z ktorých mu vzniká príjem.
Kým nevieme, ktoré číslo meníme a o koľko, predávame nádej.

---

## 1. Ekonomický model majiteľa RK

### 1.1 Reťaz peňazí (rozklad, nie štatistika)

```
PRÍJEM RK
  = uzavreté obchody × priemerná provízia
      ↑                      ↑
      |                      └─ (E) cena nehnuteľnosti × % sadzba
      |
  = mandáty × miera predaja mandátu
      ↑              ↑
      |              └─ (D) schopnosť predať — maklérska zručnosť
      |
  = rozhovory s majiteľmi × miera získania exkluzivity
      ↑                            ↑
      |                            └─ (C) dôvera, argumentácia, načasovanie
      |
  = dopyty × miera dovolania sa VČAS
      ↑              ↑
      |              └─ (B) SLA, disciplína follow-upu
      └─ (A) objem dopytov od majiteľov
```

### 1.2 Kde Revolis reálne siaha — a kde nie

| Páka | Kto ju ovláda | Siaha na ňu Revolis? |
|---|---|---|
| **(A) objem dopytov** | marketing, web, Ads, reputácia | **ÁNO** — kalkulačka `/odhad` vyrába rozhovory s majiteľmi |
| **(B) miera dovolania sa včas** | disciplína makléra | **ÁNO** — ranný zoznam, SLA, notifikácie |
| **(C) získanie exkluzivity** | osobná zručnosť makléra | **NIE** (nanajvýš kontext pred hovorom) |
| **(D) schopnosť predať** | zručnosť + trh | **NIE** |
| **(E) provízna sadzba** | vyjednávanie, značka | **NIE** |

**Toto je najpoctivejšia veta celého predaja:** *„Nezlepším vám maklérov. Zvýšim počet rozhovorov,
ktoré dostanú, a postrážim, aby ich nepremeškali."*

Predávať (C)–(E) je klamstvo, ktoré sa prevalí v 60. deň pilotu.

### 1.3 Ako model inštancovať u konkrétneho majiteľa

Pri prvom hovore zisti **päť čísel** (a nikdy ich nedopĺňaj odhadom):

| # | Otázka | Prečo |
|---|---|---|
| 1 | Koľko dopytov na ocenenie/predaj vám príde mesačne? | vstup do (A) |
| 2 | Do koľkých hodín na ne reálne zavoláte? | (B) — hlavná páka |
| 3 | Koľko z nich skončí podpisom zmluvy? | (C), baseline |
| 4 | Aká je vaša priemerná provízia z obchodu? | (E), prevod na € |
| 5 | Koľko maklérov na tom reálne robí? | kapacita |

**Bez čísla 4 sa nedá vyčísliť nič.** Ak ho nechce povedať, počítaj v obchodoch, nie v eurách,
a povedz to nahlas. **Nikdy nedosadzuj „priemer trhu"** — to je AP-001.

---

## 2. 20 % insightov, ktoré vysvetľujú 80 % nákupného správania

`gtm-playbook` §3 má 10 vecí o tom, **ako majiteľ funguje**. Tu je vrstva hlbšie: **čo cíti**.

### 2.1 Túžby (čo chce)

| Túžba | Ako to hovorí nahlas | Čo tým naozaj myslí |
|---|---|---|
| Viac mandátov | „potrebujem zákazky" | chcem výhradné, nie ďalšie neexkluzívne inzeráty |
| Predvídateľnosť | „nech to nie je hojdačka" | chcem vedieť, či bude mesiac dobrý, skôr ako skončí |
| Nezávislosť od hviezdy | „aby to nestálo na jednom človeku" | bojím sa, že najlepší maklér odíde |
| Byť značka, nie sprostredkovateľ | „chcem, aby nás volali oni" | chcem inbound, nie studené volanie |

### 2.2 Strachy (čo nepovie, ale rozhoduje)

| Strach | Prejav v rozhovore | Ako s ním zaobchádzať |
|---|---|---|
| **Že vyzerá ako hlupák pred tímom** | „to u nás nepôjde" | nikdy nezavádzaj nástroj cez jeho autoritu — nech to makléri chcú sami |
| Že odhalí, ako zle to má nastavené | vyhýba sa konkrétnym číslam | audit rám: *„nejde o kontrolu, ide o to, kde ležia peniaze"* |
| Že maklér odíde aj s databázou | otázka „a čie sú tie dáta?" | **maj písomnú odpoveď pripravenú** — toto je uzatváracia otázka |
| Že zaplatí a nič sa nezmení | „a koľko to stojí" príliš skoro | ohraničená záruka + krátky pilot |
| Že ho AI nahradí / znevierohodní | irónia, „to vám tá umelá inteligencia povie?" | neveď AI; veď výsledok (`positioning-v1` §5) |

**Najsilnejší z nich je prvý.** Softvér, ktorý majiteľ nariadi a tím ignoruje, ho poníži.
Preto ranný zoznam bez loginu nie je len UX rozhodnutie — je to **predajný argument**.

### 2.3 Prevádzkové úzke hrdlá (čo ho brzdí bez ohľadu na chuť)

1. Nemá koho poveriť nasadením — je to on alebo nikto.
2. Makléri sú živnostníci → nulová vynútiteľnosť.
3. Dáta má v troch systémoch a v hlave.
4. Sezóna: v jarnom/jesennom vrchole nemá kapacitu na projekt.

---

## 3. Spúšťače nákupu — kedy kupuje TERAZ

Bez spúšťača je aj správna ponuka odložená „na neskôr". Toto je zoznam udalostí, po ktorých
majiteľ kupuje rýchlo, s tým, ako ich rozpoznať.

| # | Spúšťač | Ako ho rozpoznať | Prvá veta |
|---|---|---|---|
| T1 | **Práve stratil mandát, o ktorom vedel** | sám to spomenie, s frustráciou | „Koľkokrát sa to stalo tento rok?" |
| T2 | Odišiel maklér a zobral kontakty | personálna zmena, nové meno na webe | „Čie sú dnes tie kontakty, keď niekto odíde?" |
| T3 | Najal nových ľudí | inzerát na pozíciu, nové tváre | „Ako viete, či nový človek volá načas?" |
| T4 | Konkurent nasadil kalkulačku | vidno na webe konkurencie v regióne | „Videli ste, čo má {konkurent} na webe?" |
| T5 | **Platí Ads a nestíha reagovať** | gclid na webe, platená kampaň na ocenenie | najsilnejší — platí za dopyt, ktorý mu vychladne |
| T6 | Koniec/začiatok roka | december–február | „Ako vám vyšiel rok a čo chcete inak?" |
| T7 | Odporúčanie od kolegu | volá sám | najlacnejší predaj, aký existuje |

**T5 je detekovateľný z verejných zdrojov** (platená kampaň na „ocenenie nehnuteľnosti" v regióne)
a zároveň je to presne ten majiteľ, ktorému kalkulačka + SLA dáva okamžitú hodnotu.
**Zoznam T5 je najlepší cieľový zoznam, aký vieme dnes zostaviť.**

---

## 4. Mapa námietok

Formát: **námietka → čo je pod ňou → odpoveď → čo NEROBIŤ.**

| # | Námietka | Čo je pod ňou | Odpoveď | Nerob |
|---|---|---|---|---|
| O1 | „Už máme CRM." | strach z migrácie | „Nechajte si ho. Sedíme nad Realviou." (segment A) | nesľubuj integráciu, ktorú nemáš |
| O2 | „Sme malí, nepotrebujeme systém." | nechce projekt | „Súhlasím. Nezačíname systémom, ale jedným ranným e-mailom." | netlač CRM |
| O3 | **„Makléri to nebudú používať."** | skúsenosť + strach z poníženia | „Preto to nevyžaduje prihlásenie. Príde im 5 mien ráno na mobil." | nesľubuj školenia |
| O4 | „Koľko to stojí?" (príliš skoro) | hľadá dôvod skončiť | „Záleží od toho, čo vám to prinesie — preto navrhujem najprv 14 dní bez záväzku." | nehovor mesačnú cenu ako prvú |
| O5 | „Skúšali sme to, nefungovalo." | zle nastavené očakávanie | „Čo presne ste merali?" — obvykle nemerali nič | nespochybňuj predchádzajúceho dodávateľa |
| O6 | „Nemám čas na nasadenie." | reálne úzke hrdlo | Shadow CRM: read-only, 0 zmien v ich práci | nesľubuj „nasadenie za hodinu" |
| O7 | **„A čo s našimi dátami? Čie sú?"** | strach o databázu | **pripravená písomná odpoveď**: vlastník dát je kancelária, export kedykoľvek, spracovateľská zmluva | neimprovizuj |
| O8 | „Pošlite mi to mailom." | zdvorilé nie | „Pošlem. Aby to nebolo zbytočné — mám poslať skóre vašich inzerátov alebo cenník?" | neposielaj generický PDF |
| O9 | „Musím sa poradiť." | nie je jediný rozhodovateľ | „S kým? Rád sa pripojím na 15 minút." | nečakaj pasívne |
| O10 | „Zavolajte o mesiac." | nemá spúšťač | „Dobre. Čo sa má za ten mesiac stať, aby to bolo aktuálne?" | needáduj dátum bez dôvodu |

**O3 a O7 sú uzatváracie.** Kto na ne nemá hotovú odpoveď, stráca obchod, ktorý už mal.

---

## 5. Cenová psychológia

### 5.1 Tri kotvy, ktoré má majiteľ v hlave

| Kotva | Hodnota | Zdroj |
|---|---|---|
| **Tip na predávajúceho** | **300 € / tip** | `call-list-2026-07-w30.md` (overené) |
| Portálová inzercia | jeho mesačný náklad | spýtaj sa — nehádaj |
| Jedna provízia | jeho číslo 4 z §1.3 | spýtaj sa — nehádaj |

**Pravidlo:** cenu vždy stavaj vedľa kotvy, nikdy vedľa nuly.
*„Dnes platíte 300 € za jeden tip od človeka. Toto ich vyrába systematicky."*

### 5.2 Architektúra ponuky

| Vrstva | Čo to je | Psychologická funkcia |
|---|---|---|
| **0 — Shadow (14 dní)** | read-only pozorovanie, bez záväzku | odstraňuje riziko aj prácu; nie je to „trial", je to diagnostika |
| **1 — Vstup** | ranný zoznam + kalkulačka, nízka mesačná cena | vstup bez schvaľovania, „to nemusím ani riešiť" |
| **2 — Štandard** | + CRM, triage, SLA notifikácie | sem sa prirodzene prejde po 60 dňoch používania |
| **3 — Cockpit** | prehľad pre majiteľa naprieč maklérmi | toto je jediná vrstva, ktorú kupuje **on pre seba** |

**Interná poznámka:** číslo 349 € figuruje v `decisions.md` [2026-08-24] ako **draft pre Cockpit**,
nie ako overená cena. Nepoužívaj ho ako fakt, kým ho nepotvrdí podpis.

### 5.3 Pravidlá, ktoré sa neporušujú

1. **Nikdy neveď mesačnou cenou.** Veď výsledkom, potom kotvou, potom cenou.
2. **Záruka musí byť ohraničená** — strop, písomná definícia metriky, písomná atribúcia.
3. **Ročná platba so zľavou** len ak už beží hodnota; inak je to pôžička od zákazníka.
4. **Zadarmo nikdy neznamená validáciu.** Aj symbolická cena meria ochotu platiť (`decisions.md:387`).
5. **Zľava sa nedáva za „rozmyslím si to"**, len za niečo (referencia, dlhší záväzok, prípadová štúdia).

---

## 6. Štruktúra pilotu

### Fáza 0 — Shadow, 14 dní, bezplatne

| Položka | Obsah |
|---|---|
| Čo robíme | read-only napojenie (segment A: Realvia), denný záznam, nula zmien v ich práci |
| Čo od nich chceme | prístup + 15 min na začiatku a na konci |
| Výstup | report na 14. deň: koľko dopytov, aký čas do prvého kontaktu, koľko bez follow-upu |
| **Podmienka** | **GDPR brána G2 uzavretá pred prvým dátovým prístupom** |
| Exit | ktorákoľvek strana, bez dôvodu |

### Fáza 1 — Platený pilot, 60–90 dní

| Položka | Obsah |
|---|---|
| Cena | vstupná vrstva, symbolická ale nenulová |
| Merané (písomne, vopred) | (a) medián času do prvého kontaktu, (b) počet dopytov z kalkulačky, (c) % dopytov kontaktovaných do SLA |
| **Nemerané** | počet uzavretých obchodov — priveľa cudzích premenných; nesľubovať |
| Záruka | ak (a) neklesne a (c) nestúpne → vrátenie ceny pilotu, strop = cena pilotu |
| Ich záväzok | týždenných 30 min, prístup k číslam, rozhodnutie v 90. deň |
| Výstup | rozhodnutie áno/nie, plus súhlas s menovaním pri áno |

**Prečo sa nemeria počet obchodov:** medzi kontaktom a províziou stoja páky (C)–(E), ktoré
neovládame (§1.2). Sľúbiť ich = nevymáhateľná záruka a stratený zákazník v 90. deň.

---

## 7. Rebrík dôkazov

Každý stupeň je lacnejší než ten pod ním a dôveryhodnejší než ten nad ním.

| Stupeň | Dôkaz | Máme dnes? |
|---|---|---|
| 1 | Skóre ich vlastných inzerátov (verejné fakty) | **ÁNO** — Guardian |
| 2 | Diagnostika z ich exportu | **ÁNO** — `/proof` engine, ručne |
| 3 | 14-dňový shadow report na ich živých dátach | po G2 |
| 4 | Vlastné čísla z 90-dňového pilotu | po prvom pilote |
| 5 | Menovaná prípadová štúdia | **blokované** — chýba písomný súhlas (G5) |
| 6 | Benchmark naprieč kanceláriami | **Strategic Backlog** — timing veto, treba ≥ 8 RK |

**Dnes vieme doručiť stupne 1 a 2 okamžite.** Stupeň 5 je to, čo najviac chýba, a nedá sa
vyriešiť textom — len ďalším zákazníkom, ktorý súhlasí byť menovaný.

---

## 8. Konverzné experimenty

E0 je v `founder-acquisition-loop` §2. Tu sú nadväzujúce, zoradené podľa **ceny a rýchlosti**.

| # | Otázka | Zásah | Úspech | Zlyhanie | Ďalší krok |
|---|---|---|---|---|---|
| **E0** | H1 nedostatok vs H2 únik | 20 + 20 e-mailov | rozdiel ≥ 5 p. b. | obe < 5 % → zlý zoznam/kanál | víťaz na 60 dní |
| **E1** | Funguje Guardian skóre ako otvárač? | 20 e-mailov so skóre vs 20 bez | skóre má vyššiu odpoveď | žiadny rozdiel → personalizácia nie je páka | ponechať lacnejšiu verziu |
| **E2** | Je T5 (platí Ads) lepší segment? | 20 firiem s platenou kampaňou vs 20 bez | T5 konvertuje na hovor lepšie | žiadny rozdiel → spúšťač nie je detekovateľný | prepnúť cielenie |
| **E3** | Zaberie Shadow viac než Audit? | prvá ponuka Shadow vs prvá ponuka Audit | vyšší podiel súhlasov | oboje < 10 % → problém je dôvera, nie ponuka | zmeniť poradie ponuky |
| **E4** | Znesie trh cenu proti kotve 300 €? | 5 hovorov s výkonnostným rámom | aspoň 1 podpis pilotu | „to je drahé" 5/5 → kotva neplatí plošne | overiť kotvu (U6) |
| **E5** | Otvára maklér ranný zoznam? | 5 dní × 5 mien u referenčného klienta | `activities` > 0 každý deň | 0 → problém je obsah zoznamu | zúžiť na 2 mená |
| **E6** | Konvertuje `/proof` s novou prvou vetou? | víťazná veta z E0 na hero | prvý **reálny** `saas_lead` | nula → funnel nie je problém, doprava áno | všetko úsilie na outbound |

**Poradie:** E0 → (E5 paralelne, je interné) → E1/E2 → E3 → E4 → E6.
**Kill kritérium celého bloku:** ak po E0–E3 (≈ 3 týždne, ~120 oslovení) nie je **ani jeden
dohodnutý 20-min hovor**, problém nie je v správe ani ponuke — je v **zozname alebo v kanáli**,
a ďalšie varianty textu sú plytvanie.

---

## 9. Dôkaz vs. predpoklad — register tohto dokumentu

| Tvrdenie | Status |
|---|---|
| 300 €/tip existuje ako kotva | **DÔKAZ** (`call-list-2026-07-w30.md`) |
| Kancelárie chcú predávajúcich, nie CRM | **DÔKAZ** (3 SK rozhovory, `decisions.md:501`) |
| Verbálny záujem ≠ ochota platiť | **DÔKAZ** (`decisions.md:387`) |
| Reťaz peňazí §1.1 | **MODEL** — logický rozklad, nie meranie |
| Strachy §2.2 | **PREDPOKLAD** — overiť v prvých 5 hovoroch |
| Spúšťače §3 | **PREDPOKLAD**, okrem T5 (detekovateľný) |
| Účinnosť námietkových odpovedí §4 | **PREDPOKLAD** — meria sa v E0–E3 |
| 349 € Cockpit | **DRAFT**, nie cena |
| Akékoľvek € číslo o úspore klienta | **NEEXISTUJE** — počíta sa až z jeho čísel |

---

## 10. Brány a čo sa nerobí

| # | Brána | Stav k 2026-09-18 |
|---|---|---|
| G1 | GDPR základ pre B2B outreach | **OTVORENÁ** — blokuje prvú vlnu; skill `gdpr-advisor` v tejto session nedostupný |
| G2 | GDPR pre prístup k ich dátam (Shadow, audit) | **OTVORENÁ** — blokuje Fázu 0 |
| G3 | S2 rozsah (NBS na maklérskej strane?) | **OTVORENÁ** |
| G4 | `leads.last_contact_at` | **ČIASTOČNE ZAVRETÁ** — migrácia `20260817220000` je na `main` (#437). **Aplikácia v PROD neoverená** — kód ≠ dáta |
| G5 | Písomný súhlas s menovaním | **OTVORENÁ** — blokuje stupeň 5 rebríka |

**Nerobíme:** nesľubujeme páky (C)–(E), nemeriame pilot počtom obchodov, nedosadzujeme trhové
priemery za chýbajúce čísla klienta, nekupujeme databázy, nescrapujeme osobné údaje,
nepoužívame US prieskumy ako tvrdenie o SK trhu, nezverejňujeme meno referenčného klienta.

---

## 11. Jedna veta

> Majiteľ RK nekupuje AI. Kupuje viac rozhovorov s ľuďmi, ktorí chcú predať,
> a istotu, že ich maklér stihne zavolať prvý. Všetko ostatné je doručovací mechanizmus.
