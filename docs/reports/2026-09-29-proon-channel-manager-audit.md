# Audit konkurencie: Proon Channel Manager (channelmanager.proon.tech)

**Dátum:** 2026-09-29 · **Zadanie:** hĺbkový audit webu, agentický workflow,
roadmapa „všetky funkcie LIVE v Revolise do 1 týždňa", konkurenčné výhody.
**Brána:** `revolis-constitution-v2.md` (12 otázok + VETO).

---

## 0. Ako bol audit spravený a čo NIE JE overené

- `channelmanager.proon.tech` aj `proon.tech` sú v tomto prostredí **zablokované
  sieťovým proxy** (`EGRESS_BLOCKED`). Stránky som teda **neprešiel priamo**.
- Zdroj auditu: verejný index vyhľadávača (titulky, popisy, úryvky stránok
  `channelmanager.proon.tech`, `proon.tech`, `proon.tech/funkcionality/rezervacny-system`)
  a ich LinkedIn/Instagram profil.
- **Neoverené:** presný cenník Proonu, úplný zoznam podstránok, screenshoty UI,
  referencie klientov. Cena v bode 1 je **odhad trhu** z porovnávacieho článku,
  nie ich cenník.
- Nápravu (skutočný crawl všetkých podstránok) viď bod 7, otázka 1.

## 1. Čo Proon Channel Manager je

**Kľúčové zistenie: nie je to realitný softvér.** Ide o **PMS + channel manager
pre ubytovanie** (penzióny, apartmány, krátkodobé prenájmy), ktorý je
jedným z 13 modulov horizontálneho CRM/ERP **PROON** (projekty, úlohy,
fakturácia, sklad, HR, AI asistent na web, sociálny inbox — „50+ funkcií").

| Funkcia (podľa verejných úryvkov) | Popis |
|---|---|
| Synchronizácia kanálov | Booking.com, Airbnb, Hauzi, vlastný web (úryvky spomínajú aj Expedia, VRBO) |
| Jeden kalendár | Rezervácia na jednom kanáli okamžite zavrie termín na ostatných |
| Kniha ubytovaných + reporty | Plnia sa automaticky |
| Automatický check-in | E-mail pred príchodom: adresa, PIN (smart lock) alebo QR |
| Generovanie formulárov | Registračné formuláre hostí |
| Jednotný inbox | Správy zo všetkých platforiem na jednom mieste |
| Cenotvorba | Centrálna správa cien, dynamické ceny |
| Automatizácia | n8n workflowy + AI agenti (OpenAI, Claude): auto-fakturácia, AI odpovede na e-maily |
| Trh | Slovenské riešenie pre stredoeurópskych ubytovateľov |
| Cena (odhad trhu, nie Proon) | Kategória CM+PMS ~30–150 €/mes., malé ubytovanie 40–60 €/mes. |

## 2. Záver pre rozhodnutie (vopred, lebo mení zadanie)

**„Všetky funkcie Proonu LIVE v Revolise do 1 týždňa" neodporúčam. Verdikt: REJECT
ako celok, s dvomi prenositeľnými vzormi na VALIDATE/BUILD.**

Dôvody podľa Ústavy:
- **Q1 VETO (zaplatil by dnešný klient?)** — Reality Smolko predáva
  nehnuteľnosti; synchronizáciu Booking/Airbnb, smart-lock check-in ani knihu
  ubytovaných nepotrebuje. Strop = VALIDATE.
- **Q3 (Lead → Provízia)** — ubytovacie funkcie neskracujú ani jeden krok reťazca.
- **Q8 VETO (timing)** — otvorené sú Stripe KYB + cenník, RLS na `bri_history`,
  Calendly webhook. Nový trh pred prvým platiacim klientom = Founder Trap
  „rozširovanie pred PMF".
- **Q9** — „100 % všetkého do 1 týždňa na PROD" je v rozpore s našimi GO bránami
  (migrácie, RLS, CI); by sa to dalo iba bez dôkazov, čo je horšie než nedodať.

## 3. Mapovanie funkcia → Revolis → verdikt

| Proon | Realitný ekvivalent | Stav v repozitári | Verdikt |
|---|---|---|---|
| Jednotný inbox z kanálov | Jeden inbox dopytov z portálov (nehnutelnosti.sk, topreality, bazoš, e-mail) | **Čiastočne existuje:** `api/inbound/gmail-pull`, `api/acquire/email` (rozpoznanie zdroja podľa odosielateľa, #739) | **BUILD kandidát** — dokončiť, nie stavať nanovo |
| AI odpovede na e-maily | Návrh odpovede na dopyt záujemcu (človek schvaľuje) | **Existuje:** `api/ghostwriter/generate`, `send-email` | **VALIDATE** — napojiť na inbox, nie nový modul |
| Jeden kalendár, auto-zatváranie termínov | Obhliadky bez dvojitého bookingu | **Existuje:** `integrations/calendar/sync`, `concierge/freebusy`, `scheduled-events` | Hotové — len overiť 404-PATH-01 |
| Sync na Booking/Airbnb | Export inzerátov na portály | Realvia robí syndikáciu, Revolis je na jej výstupe (ZHLUK 8) | **REJECT** — duplikovali by sme partnera |
| Dynamické ceny | Odporúčaná cena / cenová stopa | **Existuje:** `valuation`, `price-trail` | Hotové |
| Kniha ubytovaných, reporty | Report pre predávajúceho | **Existuje:** seller-trust vrstva, `reports` | Hotové |
| Auto-fakturácia | Provízna faktúra po podpise | Nie | **BACKLOG** — Q1 neznáme, najprv Stripe/KYB |
| Generovanie formulárov | Náborová zmluva, preberací protokol | Nie | **VALIDATE** so Smolkom (1 otázka) |
| Smart-lock check-in | Samoobslužná obhliadka | Nie | **REJECT** — bezpečnosť, poistenie, GDPR |
| HR, sklad, projekty (PROON ERP) | — | — | **REJECT** — horizontálny ERP nie je náš moat |

## 4. Konkurenčné výhody Revolisu oproti Proonu

Úprimne: **dnes nie sme priami konkurenti.** Proon je horizontálny SMB
CRM/ERP s ubytovacím modulom; Revolis je vertikálny revenue systém pre
realitné kancelárie. Kde by sme sa stretli, je PROON CRM predávané
realitke ako „všeobecné CRM".

**Kde vyhráva Revolis:**
1. **Vertikálne dáta** — kataster (výhradne cez zmluvu s ÚGKK), ocenenie,
   cenová stopa, BRI, krajské koeficienty. Horizontálne CRM ich nemá a
   nepostaví ich rýchlo.
2. **Výsledok, nie evidencia** — merané na Lead → Obhliadka → Zmluva → Provízia
   (skóre leadov, denné akcie, follow-up), nie „50+ funkcií".
3. **Ingest z realitného ekosystému** — Realvia, Realsoft, universal-import,
   rozpoznanie portálového zdroja v e-maile.
4. **GDPR ako produkt** — podpísaná DPA, tenant RLS s dôkazom na PROD,
   právny základ 6(1)(f) zdokumentovaný pri každom zdroji.
5. **Referencia v praxi** — živý klient na PROD (bez menovania navonok).

**Kde vyhráva Proon (a nemáme ho kopírovať):** šírka (fakturácia, HR, sklad),
nízka SMB cena, hotový onboarding a marketing webu.

**Riziko na sledovanie:** keby PROON spustil realitný vertikál, jeho
fakturácia + inbox + nízka cena by boli silný balík. Odpoveď nie je
kopírovať šírku, ale mať hlbšie dáta a merateľný výsledok.

## 5. Agentický workflow (realistická verzia)

Každý agent má jeden výstup a GO bránu; nič neide na PROD bez foundera.

```
Scout ──► Kontrolór ──► Ústava (12Q) ──► Builder ──► Tester ──► Release ──► Meranie
 crawl      overí        BUILD/          feature     CI + RLS     flag pre     KPI po
 webu       tvrdenia     BACKLOG         flag OFF    sonda        1 tenanta    7 dňoch
                                                               [GO founder]
```

| Agent | Vstup | Výstup | Brána |
|---|---|---|---|
| Scout | povolená doména / screenshoty | zoznam podstránok + funkcií s dôkazom | — |
| Kontrolór (`kontrolor` skill) | výstup Scouta | označené: overené / predpoklad | nepodložené tvrdenia → späť |
| Ústava | funkcia | skóre + VETO | zapísané v `decisions.md` |
| Builder | 1 funkcia BUILD | PR za feature flagom | CI zelené |
| Tester | PR | unit + integračné testy, RLS sonda | 0 úniku medzi tenantmi |
| Release | zmergovaný PR | zapnutý flag pre 1 tenanta | **GO founder** |
| Meranie | 7 dní dát | čas do prvej odpovede, počet vybavených dopytov | rozhodnutie ponechať/zrušiť |

## 6. Roadmapa na 1 týždeň (čo sa naozaj dá dodať s dôkazom)

Cieľ: **„Jeden inbox dopytov z portálov s AI návrhom odpovede"** — jediný
Proon vzor, ktorý skracuje Lead → Telefonát.

| Deň | Krok | Dôkaz hotovosti |
|---|---|---|
| D1 | Validácia so Smolkom: koľko dopytov/týždeň, z ktorých portálov, ako rýchlo odpovedajú dnes | 3 odpovede zapísané; ak < ~5 dopytov/týž. → STOP, BACKLOG |
| D1 | GDPR gate (`gdpr-advisor`) na e-mailový zdroj dopytov | balančný test v `decisions.md` |
| D2–D3 | Inbox view nad `acquire/email` + `gmail-pull`: zdroj, nehnuteľnosť, stav (nový/odpovedaný) | testy + staging |
| D3–D4 | Ghostwriter návrh odpovede v inboxe, odoslanie iba po kliknutí maklera | test: nič sa neodošle bez akcie |
| D5 | Preview na Verceli, RLS sonda (tenant izolácia), CI 7/7 | zelené CI, výsledok sondy |
| D6 | **GO founder** → flag ON pre 1 tenanta na PROD | zapnutý flag, audit log |
| D7 | Meranie: medián času do prvej odpovede pred/po | číslo, nie odhad |

Všetko ostatné z bodu 3 zostáva VALIDATE/BACKLOG/REJECT podľa tabuľky.

## 7. Na čo si nespomenul — otázky pre foundera

1. **Plný crawl** — pridaj `proon.tech` a `channelmanager.proon.tech` do
   povolených domén prostredia (alebo pošli screenshoty všetkých podstránok
   a cenníka). Bez toho je bod 1 z úryvkov, nie z webu.
2. **Aký bol zámer?** (a) nové funkcie pre realitky, (b) vstup do segmentu
   **správa krátkodobých prenájmov** (niektoré RK spravujú byty investorov),
   alebo (c) sledovanie konkurencie? Pri (b) je to nový trh → Ústava na celý
   segment, nie na funkcie.
3. **Partner namiesto konkurenta?** RK, ktoré spravujú prenájmy, môžu Proon
   používať popri Revolise; integrácia (napr. export nájomcu/obsadenosti) môže
   byť lacnejšia než kópia.
4. **Kopírovanie** — neberieme ich texty, UI ani názvy funkcií; porovnávame
   výsledky.
5. **Blokery pred akýmkoľvek novým scope:** Stripe KYB + cenník, `RLS-BRI-HISTORY`,
   Calendly webhook, PR #720.

## Zdroje

- [Channel Manager a PMS systém pre ubytovanie | Proon](https://channelmanager.proon.tech/) (úryvok z indexu)
- [CRM systém PROON](https://proon.tech/) (úryvok z indexu)
- [Rezervačný systém | Proon](https://proon.tech/funkcionality/rezervacny-system) (úryvok z indexu)
- [Proon-Tech na LinkedIn](https://www.linkedin.com/company/proon-tech)
- [Channel Manager Slovensko 2026 (vezpa.it)](https://vezpa.it/sk/blog/channel-manager-booking-airbnb/) — cenový odhad kategórie
