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
| A3 | Lievik | 14 dní celej AIRA, **bez karty**, po skončení sa sama vypne; Google prihlásenie; SK/CZ; dáta v EÚ, nepoužité na tréning; **asistovaný onboarding zadarmo do 30. 9. 2026** (pripoja schránku) | 1 |
| A4 | AI Inbox | e-mail + WhatsApp Business na jednom mieste, AI návrh odpovede, zápisy do CRM | 2 |
| A5 | Automatizácie / smart úlohy | dopyt → kontakt → ponuka → obhliadka → follow-up | 2 |
| A6 | Obhliadky a protokoly | digitálny protokol, podpis, spätná väzba klienta napojená na nehnuteľnosť | 2 |
| A7 | Párovanie | skóre + vysvetlenie zhody, upozornenia na nové zhody, párovanie s ponukami iných kancelárií | 6 |
| A8 | Ask AIRA | chat nad CRM („koho mám dnes kontaktovať?“, zhrnutie zákazky) | 7 |
| A9 | AIRA Studio | AI úprava fotiek, virtuálny staging, vyprázdnenie miestnosti, video/reels, 2D/3D pôdorysy, texty inzerátov | 8 |
| A10 | Exporty | jeden zápis → portály, web, burza, API; zmena ceny sa premietne všade | 9 |
| A11 | Burza ponúk | cross-office matching, kontakty chránené, upozornenie na kolíziu, dohoda o provízii zaznamenaná | 10 |
| A12 | Webstránka | 5 šablón, vlastná doména, 19,90 €/mes, web na mieru od 1 490 € | 11, 12 |

Silná stránka AIRAmax: **šírka a kompletný príbeh od registrácie po web**. Slabé miesto, ktoré z webu vidno: všetko je sľub bez zverejnených výsledkov (žiadne „klient X zachránil Y €“; v snímkach nie je ani jedno meranie).

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

**Ťah 2 — Dokázať to, čo AIRAmax len sľubuje.** Ich web nemá jediné meranie. Naša páka je **dôkaz výsledku na reálnych dátach**: „X leadov zachránených, Y minút do prvej reakcie, Z € v pipeline“ — z PROD, nie z marketingu. (Pozn.: forecast dnes dosádza 180 000 € pri chýbajúcom rozpočte; nesmie sa ukazovať ako fakt.)

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
Predbežná hypotéza (nepodložená, čaká na rozhovory): **export na portály** (ušetrí prepisovanie, použiť Realvia ako rail → REUSE) a **digitálny protokol z obhliadky** (priamy krok Lead → Obhliadka → Zmluva). AI foto a staging **nekupovať ako vlastný vývoj** — ak sa preukáže dopyt, integrovať hotové API (COMPOSE), nie stavať.
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
3. Cenník AIRAmax nemáme (snímka stránky Cenník chýba) — chýba porovnanie ceny.
4. Stav `revolis-ai` stránky, WhatsApp, protokol, export cez Realvia: † vyžaduje plný P01.
5. Cieľové termíny a rozpočet: určuje founder.

## 8. Využité RAU prompty

P01 (tabuľka v §2), P02 (§3), P03 (Stena 0 pripravená ako kontrakt po GO), P05 (REUSE→BUILD pravidlo v Stene 2), P23 (§6 jedno ďalšie rozhodnutie). Leverage L01–L05 **nepoužité**: súbor sám uvádza, že podľa Ústavy v2 ide o REJECT (skóre ≈ 2/12). Prompty P18–P23 a L01–L05 som celé neprečítal (načítanie sa skončilo na riadku 686 z 1235) — použil som ich len podľa tabuľky prehľadu.

## 9. Referenčný klient

V tomto dokumente je referenčný klient zámerne nepomenovaný. Dokument nie je určený na zdieľanie navonok.
