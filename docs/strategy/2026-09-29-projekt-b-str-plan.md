# Projekt B — správa krátkodobých prenájmov (plán, roadmapa, agentický workflow)

**Dátum:** 2026-09-29 · **Rozhodnutie foundera:** vstup do segmentu správy
krátkodobých prenájmov ako **samostatný produkt** (záložný variant), ktorý
znovu použije, čo sa z Revolisu dá.
**Pracovný názov:** „Projekt B" (meno a doména = rozhodnutie foundera).
**Súvisí:** `docs/reports/2026-09-29-proon-channel-manager-audit.md`

> Tento dokument žije v repozitári Revolisu len dočasne. Po `GO B-REPO` sa
> presunie do nového repozitára ako `ROADMAP.md` a odtiaľto sa zmaže.

---

## 1. Čo je overené zo screenshotov Proonu (2026-09-29)

**Pozicionovanie:** „Pre apartmány, chaty a penzióny". „Jeden kalendár pre
všetky portály." Predaj cez „Konzultáciu zdarma", AI chat na webe, v ukážke
dashboardu je „AI asistent · MCP".

**Kanály (sekcia Prepojenia):** Booking.com, Airbnb (s tvrdením „Preferred
Software Partner 2026"), Hauzi, Google Vacation Rentals, Houfy, Noclegi.pl,
Mega Ubytovanie, fiemso a ďalšie.
**Smart zámky:** „43 značiek" (Kwikset, Latch, Linear, Lockly, Minut,
NoiseAware, Nuki, Omnitec, Salto KS, Salto Space, Schlage, Sifely,
SmartThings, SwitchBot…). PIN dostane hosť automaticky po online check-ine.

**Sedem bolestí, ktoré riešia (ich sekcia „Poznáte to?"):**

| # | Bolesť | Ich riešenie |
|---|---|---|
| 01 | Dvojitá rezervácia | Zatvorenie termínu na všetkých portáloch v reálnom čase |
| 02 | Tri extranety, jedna cena | Ceny a dostupnosť raz, v jednom kalendári |
| 03 | Hlásenia pre cudzineckú políciu | Formuláre z online check-inu, s elektronickým podpisom |
| 04 | Miestna daň každý mesiac | Výpočet podľa sadzby obce, veku hostí a dĺžky pobytu |
| 05 | Výkaz CR 1-12 + ubytovacia kniha | Mesačný výkaz pre Štatistický úrad a kniha sa vyplnia samé |
| 06 | Odovzdávanie kľúčov | PIN zo smart zámku |
| 07 | Stále dookola vysvetľovať postup | Automatická komunikácia (kľúč, check-in, Wi-Fi, parkovanie) |

**Moduly (sekcia „Vyberte si…"):** Channel Manager · PMS (rezervácie, online
check-in, apartmány a izby, fakturácia) · Online správa ubytovania (cloud,
mobilná appka, real-time) · Správa online rezervácií (centrálny kalendár,
multi-zariadenie, auto-komunikácia) · Rezervačný systém (widget, garantovaná
dostupnosť, online platby, auto e-maily a SMS) · Hotelový systém (recepcia,
reštaurácia, housekeeping).

**Neoverené:** stránka Cenník, čísla v štatistikách (na screenshote sa
nenačítali: „0+", „0,0 %", „8/5"), tvrdenie o Airbnb partnerstve, počet klientov.

## 2. Najdôležitejšie zistenie pre rýchlosť: channel manager nestaviame sami

| Závislosť | Fakt | Dôsledok |
|---|---|---|
| **Airbnb API** | Program je od 2026 **uzavretý pre nové žiadosti**, Airbnb partnerov oslovuje sám | Priama integrácia do týždňa **nie je možná**. Cesta = cez certifikovaného partnera |
| **Channex.io** | White-label channel manager API: 68 kanálov vrátane Booking.com, Airbnb, Expedia, Google. **$130/mes. + $0,50 za jednotku** (dovolenkové prenájmy), bez setup poplatku | **Odporúčaný základ.** Booking + Airbnb sa napoja cez ich certifikované spojenie |
| **Seam** | Jedno API pre smart zámky (Nuki, Salto KS, Schlage, Kwikset…, 100+ značiek), prístupové kódy | PIN pri check-ine bez vlastných integrácií na každú značku |
| **Hauzi, Mega Ubytovanie, fiemso** | Pokrytie cez Channex **neoverené** | Záloha: iCal (nie je real-time → riziko dvojitej rezervácie ostáva) |
| **Cudzinecká polícia** | slovensko.sk prijíma **import z elektronickej knihy ubytovaných**; podanie vyžaduje **eID a KEP ubytovateľa** | MVP: vygenerujeme súbor na import, podáva ubytovateľ. Automatické podanie za neho = neskôr, po právnom posúdení |
| **Daň z ubytovania** | Sadzby určuje každá obec vo VZN, centrálne API nepoznám | Sadzba sa zadá pri nehnuteľnosti ručne; výpočet automaticky |
| **Výkaz CR 1-12** | Štatistický úrad SR | Formát exportu **overiť**, zatiaľ otvorená neznáma |

Presné zákonné lehoty (hlásenie cudzincov, výkaz) **sa pred implementáciou
overia v zákone**; zdroje ich uvádzajú rôzne.

## 3. Architektúra „zvlášť"

- **Nový súkromný repozitár, nový Supabase projekt, nový Vercel projekt, nový
  Stripe účet.** Žiadne zdieľané databázy ani tajné kľúče s Revolisom. Ak
  Revolis skončí, Projekt B beží ďalej bez zásahu.
- **Znovupoužitie z Revolisu = kópia (fork vzorov), nie spoločný balík.**
  Spoločný balík by nás zviazal presne tým, čomu sa chceme vyhnúť.

| Z Revolisu preberieme | Prečo |
|---|---|
| Next.js 16 + React 19 + Supabase kostra, auth, onboarding | Týždne práce, overené na PROD |
| Tenant RLS vzor + RLS sonda (`set local role authenticated`) | Izolácia hostiteľov od prvého dňa |
| CI pipeline (lint, test, build, migrácie na čistej PG) | Rovnaká kvalita bez nového vymýšľania |
| Ghostwriter vzor (AI návrh správy, odoslanie po schválení / pravidle) | Bolesť 07 |
| Stripe billing (plány, limity) | Predplatné Projektu B |
| Google Calendar sync, Resend e-maily | Notifikácie, kalendár upratovania |
| GDPR dokumenty (DPA šablóna, balančné testy) | Hostia = osobné údaje vrátane dokladov |

**Dátový model v1:** `hosts` (tenant) · `properties` · `units` · `channels`
(Channex mapovanie) · `rate_plans` · `availability` · `reservations` ·
`guests` · `checkins` (údaje z dokladu, podpis) · `guest_book` ·
`tax_rules` (sadzba obce) · `lock_codes` (Seam) · `messages`.

## 4. Roadmapa — čo je naozaj LIVE za 1 týždeň

**„100 % všetkých funkcií Proonu LIVE za 1 týždeň" nie je reálne.** Proon má
roky integrácií; my máme dnes nulu. Reálne za týždeň je **pilot v ostrej
prevádzke na 1–3 skutočných jednotkách** s bolesťami 01, 02, 03, 05, 06, 07.
Plná parita je 6–8 týždňov a závisí od Channexu, nie od nás.

### Týždeň 1 (pilot)

| Deň | Blok | Dôkaz hotovosti |
|---|---|---|
| D0 | GO rozhodnutia (bod 7), registrácia Channex + Seam sandbox, pilotný ubytovateľ | účty aktívne, pilot potvrdený |
| D1 | Repo z kostry Revolisu, migrácia dátového modelu, RLS | CI zelené, RLS sonda: 0 únikov |
| D2 | Nehnuteľnosti/jednotky, jeden kalendár, cena a dostupnosť → Channex (ARI) | zmena ceny sa prejaví v Channex sandboxe |
| D3 | Príjem rezervácií (Channex webhooky) → automatické zatvorenie termínu všade + iCal záloha | test: 2 súbežné rezervácie → 1 prijatá |
| D4 | Online check-in (údaje, podpis), kniha ubytovaných, export pre políciu, výpočet dane | vygenerovaný súbor prejde importom na slovensko.sk (ubytovateľ) |
| D5 | Automatické správy hosťom (AI + šablóny) a PIN zo Seam po check-ine | sandbox zámok dostane kód, hosť správu |
| D6 | Staging s pilotom, GDPR balík (DPA, retencia), Kontrolór audit | podpísaná DPA s pilotom |
| D7 | **GO founder** → ostrá prevádzka pre pilota (Channex produkčné mapovanie) | 1 reálna rezervácia prejde celým tokom |

### Týždne 2–8 (parita a predaj)

| Týždne | Obsah |
|---|---|
| 2–3 | Booking.com + Airbnb produkčne cez Channex pre všetkých pilotov, rezervačný widget na web ubytovateľa, online platby (Stripe) |
| 3–4 | Výkaz CR 1-12, fakturácia, mesačný report dane pre obec |
| 4–6 | Mobilná PWA, upratovanie (housekeeping), multi-vlastník pre správcov |
| 6–8 | Dynamické ceny z vlastnej histórie a sezónnosti, verejný cenník, onboarding bez konzultácie |
| BACKLOG | Hotelový modul (recepcia, reštaurácia) — iný segment, nie náš prvý zákazník |

## 5. Agentický workflow

```
                ┌──────────── Kontrolór (overí každé tvrdenie a PR) ────────────┐
Architekt ──► Integrácie ──► Compliance ──► Builder A ║ Builder B ──► Tester ──► Release
 dátový        Channex,       GDPR, polícia,   (UI)      (API,        RLS sonda,  [GO founder]
 model, ADR    Seam, iCal     daň, výkaz CR              webhooky)    E2E tok
```

| Agent | Vlastní | Výstup | Brána |
|---|---|---|---|
| Architekt | schéma, ADR | migrácie + ADR | Kontrolór |
| Integrácie | `lib/channex`, `lib/seam`, `lib/ical` | klienti + webhooky s testami na sandboxe | kontrakt test zelený |
| Compliance | `lib/compliance` | export pre políciu, daň, výkaz, DPA | overené proti zákonu, nie z pamäti |
| Builder A / B | disjunktné súbory (UI vs API) | PR za feature flagom | CI zelené |
| Tester | `tests/e2e` | tok rezervácia → check-in → PIN → kniha | 0 dvojitých rezervácií |
| Release | nasadenie | flag ON pre pilota | **GO founder** |

Builderi A a B bežia paralelne len nad disjunktnými cestami (UI vs API), inak
sériovo.

## 6. Konkurenčné výhody Projektu B oproti Proonu

Úprimne: **v deň štartu nemáme žiadnu.** Proon má integrácie, 43 zámkov a
zákazníkov. Výhody si musíme postaviť:

1. **Pre správcov, nie len pre hostiteľov** — viac vlastníkov, výplaty a
   reporty pre investora. Proon ide smerom k hotelom (recepcia, reštaurácia);
   my ideme k správcom investičných bytov. Tých poznáme z realitného sveta.
2. **Samoobsluha a verejná cena** — registrácia a prvý kalendár do 15 minút
   bez konzultácie. Proon predáva cez „Konzultáciu zdarma".
3. **Zákonné povinnosti ako jadro, nie doplnok** — polícia, daň, výkaz CR,
   kniha: jeden mesačný „compliance balík" s istotou termínov.
4. **AI správy vo viacerých jazykoch hostí** (SK, CZ, PL, HU, DE, EN) so
   schvaľovaním, overený vzor z Revolisu.
5. **Cena postavená na Channexe** — náklad ~0,50 $ za jednotku nám dovoľuje
   agresívnu cenu pre malých ubytovateľov (1–5 jednotiek).

Dynamické ceny z trhových dát **nesľubujeme**: scraping Airbnb porušuje ich
podmienky a iný zdroj trhových dát zatiaľ nemáme (otvorená neznáma).

## 7. Na čo si nespomenul — rozhodnutia pred štartom

1. **Právna entita a vlastníctvo kódu.** Záložný variant funguje, len ak ho
   vlastní iná entita než Revolis. Kód skopírovaný z Revolisu musí mať
   vyjasnené vlastníctvo (licencia alebo prevod), inak ho v prípade krachu
   Revolisu nemusíš smieť používať.
2. **Čas foundera.** Revolis ešte nemá dokončený Stripe KYB a cenník. Návrh:
   pevný rozpočet (napr. 1 deň v týždni) a kritérium po 8 týždňoch
   (napr. 5 platiacich ubytovateľov → pokračovať, inak zmraziť).
3. **Pilotný ubytovateľ.** Bez 1–3 skutočných jednotiek D7 nemá čo nasadiť.
   Poznáš niekoho?
4. **Účty na tvoje meno/firmu:** Channex, Seam, Stripe, doména. Registrácie
   a podmienky musíš prijať ty.
5. **GDPR:** údaje z dokladov hostí sú osobné údaje; právny základ pre knihu
   a hlásenie je zákonná povinnosť (čl. 6 ods. 1 písm. c), sme sprostredkovateľ
   → DPA s každým ubytovateľom, retencia, deti. Pred D4 prebehne `gdpr-advisor`.
6. **Nepretržitá prevádzka:** rezervácie chodia o polnoci; kto rieši výpadok
   synchronizácie v sobotu večer?
7. **Nekopírujeme** texty, dizajn ani ilustrácie Proonu.

## Zdroje

- [Channex — cenník](https://channex.io/pricing), [Channex — prehľad](https://channex.io/)
- [Airbnb API: prístup a obmedzenia 2026 (KVETOIQ)](https://kvetoiq.com/airbnb-api/), [Elfsight: Airbnb API partnerstvo](https://elfsight.com/blog/how-to-get-and-use-airbnb-api-partnership-and-integration/)
- [Seam — Smart Locks API](https://docs.seam.co/latest/capability-guides/smart-locks/get-started-with-smartlocks-api), [Seam — Nuki](https://docs.seam.co/latest/device-and-system-integration-guides/nuki-locks)
- [slovensko.sk — Hlásenie pobytu cudzincov, zápis do knihy ubytovaných](https://www.slovensko.sk/sk/detail-sluzby?externalCode=ks_336506), [MV SR — Hlásenie pobytu cudzincov](https://portal.minv.sk/wps/wcm/connect/sk/site/main/zivotne-situacie/Cudzinci/Hlasenie-pobytu-cudzincov)
- Screenshoty `channelmanager.proon.tech` od foundera, 2026-09-29
