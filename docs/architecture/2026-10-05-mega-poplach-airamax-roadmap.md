# MEGA POPLACH — roadmap na dobehnutie a predbehnutie AIRAmax

**Vyhlásil:** founder, 2026-10-05 · **Stav dokumentu:** NÁVRH — čaká na GO foundera (nič z neho sa nestavia bez GO)
**Rozsah dôkazov:** (a) 10 snímok verejného webu a registrácie airamax.com od foundera, (b) grep/glob repa `apps/crm`
(NIE plný P01 audit), (c) `capability-truth-matrix.md`, `memory/open-tasks.md`, SCOREBOARD z 1. 10.
Router `rau-route` sa nespustil (príkaz bol zamietnutý). Brána určená ručne: **GO_REQUIRED** (roadmap = nová scope).

---

## 0. Founder Brief (12 riadkov)

1. **Čo navrhujem:** nekopírovať AIRAmax modul po module. Tri kroky: (0) odblokovať predaj, (1) dokázať jadro, ktoré už máme, (2) vybrať 2 paritné funkcie, ktoré rozhodujú o kúpe, a (3) predbehnúť na teréne, kde AIRAmax nemá dôkaz.
2. **Najväčšie zistenie:** AIRAmax má dnes na webe **hotový predajný lievik** (14 dní zadarmo bez karty, Google prihlásenie, asistovaný onboarding, cenník). My máme **nefunkčný checkout v PROD** (chýbajú Stripe seat ceny, `/upgrade` zlyháva), nasadzovanie blokuje Vercel limit a dokázaných je 30 % prvej reakcie na lead. Náš problém nie je „chýba nám 6 funkcií“, ale „nevieme zákazníka zobrať od registrácie po platbu“.
3. **Čo je pravda o konkurencii a čo nie:** vidíme len ich marketing. Čísla „100 kancelárií / 400+ maklérov“ sú **tvrdenie, nie dôkaz**. Neoverené, či moduly na webe fungujú v produkcii.
4. **Čo to stojí:** čas foundera a agenta; € a tokeny `NEMERANÉ`.
5. **Odporúčané rozhodnutie (jedno):** GO na **Stenu 0 „Môžem predať“** (viď §6).

---

## 1. Čo AIRAmax ukazuje (zo snímok, nie z produktu)

| # | Modul na webe | Čo tvrdí | Zdroj |
|---|---|---|---|
| A1 | Pozícia | „Menej klikania. Viac uzavretých obchodov.“ — CRM, ktoré sa píše samo | snímka 1 |
| A2 | Dôvera | „AIRA nikdy nič neodošle bez vášho potvrdenia“ (opakuje sa pri každom module) | 1, 2, 5, 7 |
| A3 | Lievik | 14 dní celej AIRA, **bez karty**, po skončení sa sama vypne; Google prihlásenie; SK/CZ; dáta v EÚ, nepoužité na tréning; asistovaný onboarding zadarmo do 30. 9. 2026 (pripoja schránku; **akcia už skončila**, viď A17) | 1 |
| A4 | AI Inbox | e-mail + WhatsApp Business na jednom mieste, AI návrh odpovede, zápisy do CRM | 2 |
| A5 | Automatizácie / smart úlohy | dopyt → kontakt → ponuka → obhliadka → follow-up | 2 |
| A6 | Obhliadky a protokoly | digitálny protokol, podpis, spätná väzba klienta napojená na nehnuteľnosť | 2 |
| A7 | Párovanie | skóre + vysvetlenie zhody, upozornenia na nové zhody, párovanie s ponukami iných kancelárií | 6 |
| A8 | Ask AIRA | chat nad CRM („koho mám dnes kontaktovať?“, zhrnutie zákazky) | 7 |
| A9 | AIRA Studio | AI úprava fotiek, virtuálny staging, vyprázdnenie miestnosti, video/reels, 2D/3D pôdorysy, texty inzerátov | 8 |
| A10 | Exporty | jeden zápis → portály, web, burza, API; zmena ceny sa premietne všade | 9 |
| A11 | Burza ponúk | cross-office matching, kontakty chránené, upozornenie na kolíziu, dohoda o provízii zaznamenaná | 10 |
| A12 | Webstránka | 5 šablón, vlastná doména, 19,90 €/mes, web na mieru od 1 490 € | 11, 12 |

| A13 | Spolupráca s treťou stranou | pozvanie právnika/notára/fotografa, úlohy, nahrané dokumenty, aktivita | snímka 13 |
| A14 | Reporty | predajný lievik, konverzia obhliadok, cena za m² podľa lokality, ponuka vs. dopyt, úspešnosť a ziskovosť maklérov | 14 |
| A15 | Referencie | 5 menovaných referencií (majitelia kancelárií, makléri) k AIRA Studio; tvrdia, že Studio používajú „stovky maklérov“ **pod starým názvom Aura** | 15 |
| A16 | Porovnávacia tabuľka | AIRA Studio vs. Box Brownie, Reimagine Home, Virtual Staging AI, Collov AI (staging, reel, pôdorys, text, náhľad pred registráciou) — „zostavené z verejných funkcií a cien, júl 2026“ | 16 |
| A17 | Migrácia | import kontaktov/nehnuteľností/dopytov, tím a roly, e-mail + WhatsApp, exporty na portály, školenie; **svojpomocne 0 €, asistovaný setup 299 €**; akcia „zadarmo“ platila do 30. 9. 2026 (**už skončila**) | 17 |

Silná stránka AIRAmax: **šírka, kompletný príbeh od registrácie po web a — nová informácia — existujúci produkt s údajným reálnym používaním** (Studio ako Aura). Oprava voči prvej verzii tohto dokumentu: tvrdil som, že web nemá žiadne referencie; **má 5 menovaných kvalitatívnych referencií**. Stále platí, že na snímkach nie je **žiadne meranie** (€, minúty, % zachránených leadov) a že referencie sú výber, ktorý si vybrali sami.

**Čo z toho plynie:** Studio nie je „nová funkcia“, ale **distribučný kanál s etablovanou značkou**. To zvyšuje jeho váhu pri hodnotení hrozby, ale nemení to, že vyrobiť ho od nuly je zlá investícia (viď Stena 2: COMPOSE, nie BUILD).

---

## 2. Naša realita (P01-štýl, dôkaz = cesta v repe)

Stavy: **LIVE** (volajúci v produkčnej ceste) · **DEFINED** · **MISSING** · **UNVERIFIED**. Poznámka: grep ≠ úplný audit; riadky označené † treba potvrdiť plným P01.

| Oblasť (AIRAmax ekvivalent) | Revolis stav | Dôkaz |
|---|---|---|
| A3 Registrácia | LIVE stránka, **ale trial flow MISSING †** | `app/(public)/register/page.tsx`; „trial“ sa v `app/` nachádza len v právnych textoch |
| A3 Platba | **BLOKOVANÉ v PROD** | `open-tasks.md` CHECKOUT-ENV-01: seat Stripe ceny neexistujú, krok C čaká na foundera |
| A3 Nasadzovanie | **BLOKOVANÉ** | SCOREBOARD bod 10: Vercel Hobby limit 100/deň |
| A4 Inbox (e-mail) | LIVE | príjem leadov z portálových e-mailov, 9 leadov / 30 dní (matica pravdy) |
| A4 WhatsApp | **MISSING †** | v kóde len zmienky ako zdroj leadu v `acquire/` testoch; žiadna WhatsApp trasa v `app/api` |
| A4 AI triáž | LIVE | cron `lead-ai-triage`, 511/513 leadov |
| A4 Návrhy odpovedí so schválením | LIVE (čiastočne dokázané) | SCOREBOARD 3–5; `authorize-send` v control-plane |
| A5 Automatizácie | DEFINED/LIVE † | `api/automation/rules`, `cron/follow-up-sweep` |
| A6 Obhliadky + digitálny protokol | **UNVERIFIED †** | nenašiel som protokol/podpis |
| A7 Párovanie | DEFINED → čaká na PROD | D4 hotové (51 testov), `lead_property_matches` = 0 na PROD, čaká na D1 |
| A8 Ask AI chat | UNVERIFIED † | existuje `(dashboard)/revolis-ai/page.tsx`; nepreverené, či ide o chat nad CRM |
| A9 Studio (foto, staging, video, pôdorysy) | **MISSING** | grep: 0 relevantných zásahov; existuje len textový generátor `inzerat-generator`, `api/ai/listing-content`, `property-launch-pack` |
| A10 Export na portály | **MISSING †** | `api/properties` je CRUD; portály sa len čítajú (`PortalNehnutelnostiSource`); Realvia fronta existuje (možný export-rail, UNVERIFIED) |
| A11 Burza ponúk | **MISSING** | žiadny cross-agency matching; navyše GDPR/zmluvný dizajn nevyriešený |
| A12 Web kancelárie | **MISSING** | žiadna verejná šablóna webu |
| A13 Spolupráca s treťou stranou | **MISSING †** | v `app/api` nenájdený pozvánkový tok pre externistu s dokumentmi |
| A14 Reporty | DEFINED/LIVE † | stránky `performance`, `forecast`, `forecasting`, `sales-funnel`, `management`; **forecast dosádza 180 000 € pri chýbajúcom rozpočte** (matica pravdy) — nesmie sa ukazovať ako fakt |
| A15–A16 Referencie a porovnanie | **MISSING** | žiadna zverejniteľná referencia; referenčný klient sa nesmie pomenovať bez súhlasu (CLAUDE.md, smernica 2) |
| A17 Migrácia/import | DEFINED † | existuje `(dashboard)/import/page.tsx`; rozsah (kontakty/nehnuteľnosti/dopyty) a cena asistovaného setupu nezmerané |
| Naše unikáty | LIVE/DEFINED | Realvia worker, Gmail pull, call-coach/analyzer, `competitor-watch`, `arbitrage`, `seller-rescue`, price-trail, control-contract (vynucované brány), PII redakcia pred LLM (`ai/sanitize.ts`) |

**Čo z toho mení plán:** AIRAmax nás nepredbieha v „AI“. Predbieha nás v **ceste od záujemcu k platiacemu zákazníkovi** a v **šírke balíka**. Šírku (Studio, web, burza) nedoženieme za týždne bez straty zamerania; cestu k platbe áno.

---

## 3. ULTRATHINK — najprv zabi plán (P02 skrátene)

- **Plán „skopírujme ich 12 modulov“ zlyhá**, lebo: (1) Studio a web sú ťažké na výrobu aj podporu a nízkomarginálne (web 19,90 €/mes), (2) nič z toho nevytvára náš moat (Ústava v2 vrstva 3), (3) burza ponúk potrebuje hustú sieť kancelárií — pri nulovom PROD využití je „príliš skoro“, (4) rozbijeme sa o už otvorené P0 (checkout, nasadenie).
- **Najväčší bottleneck:** nemáme čo zákazníkovi dať **kliknúť a zaplatiť**. Každá nová funkcia pred opravou toho je investícia bez návratu.
- **Najväčšia neoverená domnienka:** že AIRAmax je „ďaleko pred nami“ aj v **produkte**. Vidíme len web.
- **Najpravdepodobnejší failure mode:** panický sprint na funkcie → ďalších 6 PR bez platiaceho klienta (Feature Trap, Founder Ego, Technology Bias).
- **Najsilnejší dôvod NEpokračovať v kopírovaní:** referenčný klient dnes ani nemá zapnutú auto-odpoveď (SCOREBOARD bod 7) — najprv potvrdiť, že jadro nám platí.

---

## 4. Stratégia: tri ťahy

**Ťah 1 — Dobehnúť to, čo rozhoduje o kúpe (lievik).** Trial 14 dní bez karty, fungujúca platba, asistovaný onboarding, cenník. Bez toho nič ďalšie nemá odbyt.

**Ťah 1b — Znížiť cenu prechodu.** AIRAmax dnes predáva prechod ako službu (299 €, akcia skončila 30. 9.). Kto je v inom CRM, nemá dôvod meniť, ak je prechod bolestivý. Revolis má `import` a Realvia; cieľ je „prechod za 1 deň, bez poplatku pre prvých N kancelárií“ (počet N a cenu určuje founder). Overí sa rozhovorom, nie odhadom.

**Ťah 2 — Dokázať to, čo AIRAmax len sľubuje.** Ich web má kvalitatívne referencie, ale nemá jediné meranie. Naša páka je **dôkaz výsledku na reálnych dátach**: „X leadov zachránených, Y minút do prvej reakcie, Z € v pipeline“ — z PROD, nie z marketingu. (Pozn.: forecast dnes dosádza 180 000 € pri chýbajúcom rozpočte; nesmie sa ukazovať ako fakt.)

**Ťah 3 — Predbehnúť tam, kde máme dáta a oni (na snímkach) nič.** Strana **získavania mandátov a predávajúceho** (seller-rescue, price-trail, competitor-watch, arbitrage, acquisition OS), integrácie Realvia/RealSoft, dôkazná kontrola odosielania (control-contract). Ich „nič neodošle bez potvrdenia“ je slogan; náš je vynútený kódom a testovaný (mutation proofs). Toto je argument pre dôveryhodnosť, nie pre funkciu.

Toto je len **hypotéza o moate**. Overí sa rozhovorom s klientmi (viď §7, otázka 1).

---

## 5. Roadmap (steny, nie skrutky)

Každá stena = jeden blok, jedno GO, dôkaz naraz. Predbežná klasifikácia podľa Ústavy v2: **skóre nevymýšľam** (odpovede 1, 10, 11, 12 závisia od foundera) → uvádzam len **navrhovaný režim** a veto.

### STENA 0 — „Môžem predať“ · 0–7 dní · navrhované: BUILD
Čo: (a) Stripe seat ceny v live móde (krok C `open-tasks` — **robí founder**, agent ceny nevytvára) → env → `/upgrade` smoke; (b) odblokovať nasadzovanie (Vercel Pro alebo obmedziť preview `claude/*`); (c) **14-dňový trial bez karty** (po skončení sa vypne, nič sa neúčtuje automaticky) — stav v kóde † najprv overiť P01; (d) merge #780 + e2e dôkaz.
Hotovo, keď: nový používateľ prejde registrácia → trial → `/upgrade` → Stripe Checkout na PROD (PRODUCTION VERIFIED, nie IMPLEMENTED).
Reťazec RAU: P00 → P01 → P03 → P10 → P11 (nezávislý) → P15 → P17 → (GO) P18 → P19.
Dotknuté: billing, ceny, migrácie = **denylist auto-merge**, vždy founder.

### STENA 1 — „Dokáž jadro“ · dni 8–30 · navrhované: BUILD
Čo: dostať **existujúce** schopnosti z CODE na PRODUCTION PROVEN: D1 demand extraction (backfill gate + privacy gate), D4 matching na overenom dopyte (flag `DEMAND_MATCHING_ENABLED`), ranný brief (UI nastavenia, dnes posiela 0), follow-up (merať schválené a odoslané), PII MINIMIZE (19 miest).
Plus **„Dashboard výsledku“**: 3 čísla z reálneho PROD (čas do prvej reakcie, zachránené leady, aktívny pipeline) s popisom zdroja; pri nepripojenom zdroji „vypočítané z {zdroj}“, nikdy vymyslené číslo.
Hotovo, keď: aspoň jedna agentúra má v PROD za 30 dní nenulové `lead_property_matches` a viditeľný výsledok. Eval (P12) s predom určeným prahom; dáta označuje niekto iný než implementátor.
Reťazec: P01 → P04 → P06 → P12 → P13/P14 → P17.

### STENA 2 — „Dve paritné funkcie, ktoré rozhodujú“ · dni 31–60 · **VALIDATE, nie BUILD**
Najprv rozhovor s 5–10 maklérmi/kanceláriami (Segment A/B/C): ktoré z A4-WhatsApp, A6-protokol, A10-export na portály, A9-AI foto by **zaplatili**? Ústava v2 Q1: ak NIE → max VALIDATE.
Predbežná hypotéza (nepodložená, čaká na rozhovory): **export na portály** (ušetrí prepisovanie, použiť Realvia ako rail → REUSE) a **digitálny protokol z obhliadky** (priamy krok Lead → Obhliadka → Zmluva). AI foto a staging **nekupovať ako vlastný vývoj** — ak sa preukáže dopyt, integrovať hotové API (COMPOSE), nie stavať. Pozor: ich porovnávacia tabuľka ukazuje, že staging robí „takmer každý“; odlíšenie je až reel/pôdorys/text, čiže hodnotu tvorí balík, nie jedna funkcia.
Do rozhovorov pridať: (a) prechod z iného CRM — čo by kanceláriu zastavilo, (b) spolupráca s treťou stranou (A13), (c) ktoré z A14 reportov riadia ich týždeň.
Reťazec: P02 → P04 → P05 (REUSE → EXTEND → COMPOSE → BUILD) → P03 → …

### STENA 3 — „Predbehnúť“ · dni 61–90 · navrhované: BUILD len po výsledku Steny 1
Čo: balík pre **získavanie mandátov** (seller-rescue, price-trail, competitor-watch) ako jeden zákaznícky príbeh „získate viac exkluzívnych ponúk“, s dôkazom z PROD; „Ask“ nad CRM (ak `revolis-ai` nie je chat — najprv P01); zdieľanie dôvery ako argument (verejná stránka „Čo Revolis nikdy neodošle bez vás“ s odkazom na testované brány).
GDPR: zdroje len z `master-data-sourcing-map.md`, katastrálni vlastníci výhradne cez zmluvu s ÚGKK; `gdpr-advisor` skill v repe neexistuje (AP-024) → právny základ 6(1)(f) + balancing test písať ručne.

### STRATEGICKÝ BACKLOG (nestavať teraz, s podmienkou odomknutia)
| Položka | Prečo backlog | Odomkne |
|---|---|---|
| Burza ponúk (A11) | sieťový efekt bez siete = prázdna burza; GDPR a zmluvný režim provízií | ≥ 10 platiacich kancelárií a 2 z nich výslovne žiadajú cross-office |
| Web kancelárie (A12) | nízka marža (19,90 €/mes), vysoká podpora, žiadny moat | partner/white-label namiesto vývoja |
| Vlastné AI Studio (foto/video/pôdorysy) | ťažké, zameniteľné; trh má hotové API | doložený dopyt zo Steny 2 → COMPOSE |
| WhatsApp Business inbox | schválenia Meta, GDPR, náklady | doložený dopyt + právny základ |

---

## 6. Jedno rozhodnutie foundera

**GO na Stenu 0 „Môžem predať“** (jedna stena: trial + platba + nasadzovanie + e2e dôkaz).
Alternatívy: (B) GO na kopírovací sprint A9–A12 — **neodporúčam** (Feature Trap, bez moatu, riziko P0). (C) Nič nerobiť — neodporúčam, konkurent už má lievik.
Čo od vás potrebujem v rámci Steny 0: Stripe live ceny (krok C), rozhodnutie o Vercel Pro / obmedzení preview, potvrdenie, že 14 dní bez karty je zámer.

## 7. Otvorené otázky (nehádam)

1. Zaplatil by dnešný klient za čokoľvek z A4–A12? (Ústava Q1 — odpoveď mám len od vás.)
2. Je „AIRAmax je ďaleko pred nami“ tvrdenie o **produkte** alebo o **webe**? Navrhujem jeden overený trial (transparentne, pod vlastným menom, bez obchádzania) a checklist: čo naozaj funguje po prihlásení. Rozhodnutie o registrácii u konkurenta je vaše.
3. Plný cenník AIRAmax nemáme (snímka stránky Cenník chýba). Známe sú len: web 19,90 €/mes (zriadenie 490 € alebo od 1 490 € na mieru) a asistovaný setup 299 €. Cenu samotného CRM nepoznáme → porovnanie ceny nie je možné.
3b. Referencie o Studiu sú ich výber a „stovky maklérov pod názvom Aura“ je ich tvrdenie; nevieme overiť, či ide o ten istý tím a produkt.
4. Stav `revolis-ai` stránky, WhatsApp, protokol, export cez Realvia: † vyžaduje plný P01.
5. Cieľové termíny a rozpočet: určuje founder.

## 8. Využité RAU prompty

P01 (tabuľka v §2), P02 (§3), P03 (Stena 0 pripravená ako kontrakt po GO), P05 (REUSE→BUILD pravidlo v Stene 2), P23 (§6 jedno ďalšie rozhodnutie). Leverage L01–L05 **nepoužité**: súbor sám uvádza, že podľa Ústavy v2 ide o REJECT (skóre ≈ 2/12). Prompty P18–P23 a L01–L05 som celé neprečítal (načítanie sa skončilo na riadku 686 z 1235) — použil som ich len podľa tabuľky prehľadu.

## 9. Cenový ťah — „o koľko lacnejší?"

### 9.1 Oprava Steny 0 (CONFLICT medzi zdrojmi)
`memory/decisions.md` **DEC-20260924-001** (founder) nahradil seat model 79/71/63 € cenou **199 € / kancelária / mesiac s DPH, onboarding 0 €, AI bez kreditov**; „Stripe Products/Prices sa nevytvárajú“. `memory/open-tasks.md` (2026-09-29) a kód checkoutu (`areSeatCheckoutPricesConfigured`) pritom stále vyžadujú seat ceny. Stena 0 bod (a) preto **neznamená automaticky „vytvoriť seat ceny“**: najprv founder rozhodne, ako sa dnes platí (faktúra vs. Stripe) a ktorý cenový model platí. Ako platia dnešné 3 kancelárie (MRR 597 € podľa DEC-20260924-001) je **UNVERIFIED** (žiadna nemala `stripe_subscription_id`).

### 9.2 Cenník AIRAmax (zo snímok; DPH na snímkach neuvedená)
| Pásmo | Ľudia | Cena / mes | Kredity / mes (hodnota) | € na človeka (pri okrajoch pásma) |
|---|---|---|---|---|
| Sólo | 1 | 29 € | 20 (16 €) | 29 |
| Tím | 2–6 | 69 € | 50 (40 €) | 34,50 → 11,50 |
| Kancelária | 7–25 | 179 € | 100 (80 €) | 25,57 → 7,16 |
| Sieť | 26+ | od 399 € | 150 (120 €) | ≈ 15,35 a nižšie |
Kredit = 0,80 € (hodnota ÷ počet, rovnaká vo všetkých pásmach). 1 kredit = 1 úprava fotky / pôdorys z náčrtu / text inzerátu. Všetky funkcie sú v každom pásme (pásmo určuje počet ľudí); externisti a roly od pásma Tím. Ďalej: web 19,90 €/mes (+490 € zriadenie), asistovaný setup 299 €. Ročná platba Tím = 828 € (= 12 × 69 €); či mesačná platba stojí viac, nevieme.

### 9.3 Naša cena vs. ich (199 € / kancelária, jedna cena pre všetkých)
| Veľkosť kancelárie | AIRAmax | Revolis (199 € s DPH) | Rozdiel |
|---|---|---|---|
| 1 človek | 29 € | 199 € | ≈ 6,9× drahší |
| 4 ľudia (typická?) | 69 € | 199 € | ≈ 2,9× drahší |
| 6 ľudí | 69 € | 199 € | ≈ 2,9× |
| 7–25 ľudí | 179 € | 199 € | +11 % |
Pozn.: z ich tvrdenia „100 kancelárií / 400+ maklérov“ (neoverené) vychádza priemer ≈ 4 makléri na kanceláriu, teda **ich typický zákazník je v pásme, kde sme 2,9× drahší**. Porovnanie DPH: ak ich ceny sú bez DPH, 69 € = ≈ 84,9 € s DPH (sadzba 23 % — overiť); rozdiel by sa zmenšil na ≈ 2,3×, nie zmizol.

### 9.4 Odporúčanie
**Nie je to otázka „o koľko %“.** Pri jednej cene 199 € nie sme lacnejší v žiadnom pásme a plošná zľava o 10–30 % by nás neposunula pod ich cenu pre malé kancelárie (6,9× a 2,9× rozdiel). Navrhujem:
1. **Nezľavovať 199 €** pre existujúce kancelárie (founder rozhodol po rozhovoroch; 3 kancelárie platia) — zľava by bola čistá strata marže.
2. **Pridať vstupné pásmo „Tím 2–6“ a otestovať 3 varianty na novej kohorte** (30 dní, meria sa trial → platba): **69 €** (parita), **59 €** (−15 % voči nim), **99 €** (prémia, AI bez kreditov). Moje predbežné poradie: parita 69 € ako východisko; −15 % sú **moja heuristika, nie meranie**; viac než −15 % pod konkurenta so širšou ponukou signalizuje „lacné, lebo menej“ a pozýva cenovú vojnu, ktorú bez poznania nákladov nevyhráme.
3. **Lacnejší cez celkový náklad, nie cez cenník:** migrácia/onboarding **0 €** (oni 299 €, akcia skončila 30. 9.) = pre 4-člennú kanceláriu v 1. roku ≈ 299 € úspory, čo je ≈ 4,3 mesiaca ich predplatného; AI bez kreditov (oni účtujú 0,80 €/kredit).
4. **Spodná hranica ceny neexistuje, kým nepoznáme náklad AI na kanceláriu.** Ledger ho nenesie (merať sa začalo 24. 9. cez `callOpenAI()`, DEC-20260924-002); do tej doby je marža pri „AI bez kreditov“ **NEMERANÁ**. Návrh: najprv jedným SELECT-om zmerať skutočný mesačný náklad AI na existujúcu kanceláriu, potom stanoviť minimum.

Rozhodnutie o cenách je výlučne founderovo a zmeny cien/billingu sú na denylist auto-merge. Tento oddiel je návrh, nie zmena.

### 9.5 Návrh foundera z 5. 10. (cenník + kredity) a prepočet

**Stav:** návrh foundera, **nie schválená zmena**. Ak sa schváli, nahrádza `DEC-20260924-001` (199 € / kancelária, „AI bez kreditov“).

| Pásmo | Ľudia | Cena s DPH | Bez DPH (23 %, overiť) | AIRAmax | Rozdiel (nominálne) | Kredity |
|---|---|---|---|---|---|---|
| Start | 1 | 25 € | 20,33 € | 29 € | −13,8 % | 25 |
| Team | 2–6 | 60 € | 48,78 € | 69 € | −13,0 % | 60 |
| Kancelária | 7–22 | 149 € | 121,14 € | 179 € | −16,8 % | 120 |
| Sieť | 23+ | od 349 € | 283,74 € | od 399 € | −12,5 % | 175 |

**Ak sú ich ceny bez DPH** (na snímkach neuvedené), ich ceny s DPH sú ≈ 35,67 / 84,87 / 220,17 / 490,77 € a my sme lacnejší o ≈ 29–32 %, nie o 13–17 %. Pred zverejnením cenníka to treba zistiť z ich VOP/pätičky.

**Prepočet kreditov podľa ich logiky.** Ich logika (odvodená zo snímok): jedna pevná cena kreditu 0,80 € vo všetkých pásmach; „hodnota kreditov v pláne“ = kredity × 0,80 €; podiel hodnoty na cene plánu klesá 55 → 58 → 45 → 30 %. Navrhujem **pevnú cenu kreditu 0,70 €** (−12,5 % voči ich 0,80 €, v súlade s rozdielom cien plánov):

| Pásmo | Kredity | Hodnota pri 0,70 € | Podiel na cene plánu | Ich podiel | Kreditov na 1 € plánu (my vs. oni) |
|---|---|---|---|---|---|
| Start | 25 | 17,50 € | 70 % | 55 % | 1,00 vs. 0,69 (+45 %) |
| Team | 60 | 42,00 € | 70 % | 58 % | 1,00 vs. 0,73 (+38 %) |
| Kancelária | 120 | 84,00 € | 56 % | 45 % | 0,81 vs. 0,56 (+44 %) |
| Sieť | 175 | 122,50 € | 35 % | 30 % | 0,50 vs. 0,38 (+33 %) |

Dôsledok: za nižšiu cenu dávame o 33–45 % viac kreditov na 1 € plánu. Je to silná ponuka, **ale pri neznámom nákladovom kredite je to nemeraná expozícia** (viď nižšie).

**Čo kontrolor musí povedať nahlas:**
1. **Okno 23–25 používateľov:** pri našom okraji „Sieť od 23“ platí kancelária s 23–25 ľuďmi 349 €, u nich 179 € (+95 %). U 26+ sme zasa lacnejší (349 vs. 399 €). Riešenie je rozhodnutie foundera (posun hranice Siete, napr. na 26+, alebo vedomé prijatie okna).
2. **Rozdiel cien vs. dnešných 199 €:** pri pásme Team (60 €) je to −70 % príjmu na kanceláriu. Na vyrovnanie 1 kancelárie za 199 € treba ≈ 3,3 kancelárie za 60 €. Ak by dnešné 3 platiace kancelárie (MRR 597 €) mali ≤ 6 ľudí a prešli na Team, MRR by klesol na 180 €. Ich veľkosti sú **UNVERIFIED**; navrhujem **grandfathering** (ostávajú na dojednanej cene), nie automatickú migráciu.
3. **Sadzba za akciu je dôležitejšia než cena kreditu.** V `credit-rates.ts`: `LISTING_DESCRIPTION` = **2 kredity**, `AI_ANALYSIS` = 1, `AI_EMAIL` = 1, `LEAD_UNLOCK` = 20. U nich je text inzerátu **1 kredit = 0,80 €**; u nás by popis stál 2 × 0,70 = **1,40 € (+75 %)**. Pri −12,5 % cieli treba sadzbu popisu znížiť na 1 kredit (0,70 €). Rozhodnutie foundera („founder decides which actions spend credits“ — komentár v kóde).
4. **Čo kredity reálne míňajú:** spotreba kreditov je zapojená len v dvoch trasách (`api/ai/listing-content`, `api/ai/property-launch-pack`). `AI_ANALYSIS`, `AI_EMAIL` a `LEAD_UNLOCK` majú sadzbu, ale volajúceho som nenašiel (DEFINED). Naše kredity nekúpia fotky ani video (Studio nemáme), teda „25 kreditov“ pre nás znamená hlavne texty a analýzy.
5. **Náklad na kredit je NEMERANÝ.** Cena kreditu 0,70 € je zmysluplná len ak náklad (LLM, prípadné API na obrázky) na najdrahšiu akciu, ktorú za kredit predáme, je pod ňou s maržou. Vzorec: marža na kredit = 1 − (náklad na kredit ÷ 0,70 €). Číslo dosadím po zmeraní z `callOpenAI()` telemetrie (DEC-20260924-002). Do tej doby je 0,70 € **predbežné**.
6. **Doplnkové balíky (top-up) musia sedieť s „hodnotou“.** Dnešné balíky: 50 kr = 49 € (0,98), 150 = 129 € (0,86), 500 = 379 € (0,76), 1 500 = 999 € (0,67). Ak plán uvádza „hodnotu 0,70 €/kredit“, balík za 0,98 € vyzerá nepoctivo. Návrh (heuristika): 50 kr = 35 €, 150 kr = 99 €, 500 kr = 315 €, 1 500 kr = 900 € (0,70 → 0,60 €/kr). Balíky sú samostatné rozhodnutie a Stripe ceny nevytvára agent.
7. **Implementácia nie je zmena konštanty.** Nový model je cena podľa pásma počtu ľudí, kým kód je seat model (cena × počet seatov). Potrebné: pásma v `program-tier-pricing.ts`, UI (`/billing`, `/upgrade`, `/porovnanie-programov`), testy, nové Stripe produkty (zakladá founder). Je to billing/ceny = **denylist auto-merge**, vždy founder. Prácu nemeriam (`NEMERANÉ`).

**Rozhodnutia pre foundera (po jednom):** (a) hranica Siete (23+ vs. 26+), (b) sadzba `LISTING_DESCRIPTION` 2 → 1, (c) cena kreditu 0,70 € ako predbežná, (d) grandfathering dnešných kancelárií, (e) či zrušiť „AI bez kreditov“ z `DEC-20260924-001`.

## 10. Referenčný klient

V tomto dokumente je referenčný klient zámerne nepomenovaný. Dokument nie je určený na zdieľanie navonok.
