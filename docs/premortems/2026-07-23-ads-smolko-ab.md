# PREMORTEM: Google Ads A/B kampaň Smolko (Novák)

**Cieľová cesta:** `docs/premortems/2026-07-23-ads-smolko-ab.md`
**Podľa šablóny:** `docs/templates/premortem.md` · Timebox: dodržaný
**Iniciatíva:** 50/50 A/B — A: realitysmolko.sk/ponuka-dopyt ·
B: app.revolis.ai/odhad/reality-smolko?utm_campaign=odhad-ab

## KROK 1 — Podklad
Plán existuje čiastočne (A/B URL, UTM, realizátor Novák). **CHÝBA: rozpočet,
denný cap, dĺžka testu, cieľová metrika úspechu.** → Predpoklad pre tento
premortem: 10 €/deň cap, 14 dní, metrika = cena za lead (CPL) variant B.
Founder potvrdí/upraví pred GO — bez toho kampaň neštartovať.

## KROK 2 — Perspektívy
1. **Founder** ✓ (riziká nižšie F)
2. **Adversariálny inžinier** ✓ (T)
3. **Zákazník — Smolko:** simulované z reálneho kontextu (1 maklér +
   owner, 439 kontaktov, obmedzená kapacita volania). ⚠ REÁLNY HLAS
   CHÝBA — pred štartom poslať Smolkovi 1 otázku: „Koľko nových dopytov
   týždenne reálne stíhate zavolať do 24 hodín?" (Z)
4. **Externý realizátor — Novák:** async otázka pred štartom: „Čo pri
   podobných kampaniach najčastejšie spálilo rozpočet bez výsledku?" (N)
- [x] Min. 1 reálny hlas: **NESPLNENÉ zatiaľ** — 2 otázky vyššie odoslať
  pred GO; do ich zodpovedania je premortem podmienečný.

## KROK 3+4 — Zlyhania (je 7. september 2026, kampaň zlyhala, pretože...)
| # | Riziko (minulý čas, konkrétne) | Hlas | Kat. |
|---|---|---|---|
| 1 | Leady chodili, ale Smolko ich volal až po 2–3 dňoch — majitelia vychladli, konverzia na stretnutie ~0, minuli sme rozpočet na kontakty, ktoré konkurencia zobrala skôr | Z | TRH |
| 2 | UTM/GA4 tracking bol rozbitý od prvého dňa (redirect/proxy odstrihol parametre), po 14 dňoch sme nevedeli povedať, ktorý variant vyhral — celý A/B test bol nečitateľný | T | TECH |
| 3 | Geo-targeting bežal na celé SK namiesto Prešov+okolie, klikali ľudia z BA, ktorým Smolko nevie slúžiť — 60 % rozpočtu preč | N | BIZNIS |
| 4 | Počas kampane sa zopakoval incident typu 22.07 (deploy rozbil widget), Ads liali traffic na 500-ku dva dni, kým si to niekto všimol | T | TECH |
| 5 | Notifikácia o novom leade padala do spamu / nechodila, leady ležali v CRM bez povšimnutia | T | TECH |
| 6 | Reklamný text sľuboval „presnú cenu nehnuteľnosti", majitelia sa cítili oklamaní orientačným pásmom, prišla sťažnosť a negatívne recenzie | F | PRÁVO |
| 7 | CPL vyšlo 25 €+ (nízke skóre kvality, úzke publikum), za 140 € prišli 4 leady — ekonomika nedávala zmysel, ale nikto nemal vopred definované, kedy vypnúť | F | BIZNIS |
| 8 | Founder bol v demo/onboarding kolotoči (Kamzík, Harasim, Molnár) a kampaň 10 dní nikto nesledoval | F | PREVÁDZKA |
| 9 | trhovahodnota.sk prihadzovala na rovnaké kľúčové slová, CPC sa zdvojnásobilo | F | TRH |
| 10 | Consent zápis potichu regresol po niektorom deployi počas kampane — leady bez GDPR záznamu z platenej akvizície | T | PRÁVO |

## KROK 5 — Matica P×Z
| # | P | Z | Skóre | Pásmo |
|---|---|---|---|---|
| 1 | 3 | 3 | **9** | MITIGÁCIA POVINNÁ |
| 2 | 2 | 3 | **6** | MITIGÁCIA POVINNÁ |
| 3 | 2 | 3 | **6** | MITIGÁCIA POVINNÁ |
| 4 | 2 | 3 | **6** | MITIGÁCIA POVINNÁ |
| 5 | 2 | 3 | **6** | MITIGÁCIA POVINNÁ |
| 7 | 2 | 3 | **6** | MITIGÁCIA POVINNÁ |
| 8 | 3 | 2 | **6** | MITIGÁCIA POVINNÁ |
| 6 | 1 | 3 | 3 | vlastník sleduje |
| 9 | 1 | 2 | 2 | evidované |
| 10 | 1 | 3 | 3 | vlastník sleduje |

## KROK 6 — Mitigácie (zmeny PLÁNU pred GO)
| # | Mitigácia | Vlastník | Kill/stop signál | Check-in |
|---|---|---|---|---|
| 1 | PRED štartom dohoda so Smolkom: nové Ads leady volá do 4 prac. hodín (SLA veta do emailu/zmluvného dodatku); leady označené zdrojom `ads` | Andy | 3 leady bez kontaktu >24 h → PAUZA kampane | denne prvý týždeň |
| 2 | Deň -1: testovací preklik z Ads preview → over UTM v GA4 reálnym eventom; čistý link bez proxy | Novák | deň 1 bez dát v GA4 → PAUZA | deň 1, deň 3 |
| 3 | Geo: len okresy PO+SB+VT+PP (Smolkov akčný rádius), písomne v zadaní Novákovi | Novák | >20 % kliknutí mimo geo → oprava do 24 h | týždenne |
| 4 | W2 watchdog už beží (30 min); + pravidlo: deploy freeze na widget routes počas kampane okrem hotfixov | Andy/Cursor | widget ≠200 → Ads PAUZA v ten deň | automatické |
| 5 | Deň -1: testovací submit → notifikácia doručená do inboxu (nie spam); Smolko potvrdí príjem | Andy | 1 lead bez notifikácie → fix pred pokračovaním | deň 1 |
| 7 | Rozpočet cap 10 €/deň, 14 dní; vopred: po minutí 100 € s <4 leadmi (CPL>25 €) → PAUZA + revízia kľúčových slov | Andy+Novák | viď signál | po 100 € |
| 8 | Novák posiela pondelkový 5-riadkový report (spend/kliky/leady/CPL); Andy 10 min review | Novák | 2 týždne bez reportu → pauza | pondelky |

- [x] Plán zmenený: SLA veta Smolkovi, geo obmedzenie, cap+kill pravidlá,
  D-1 testy — všetko podmienky GO.
- [x] Zápis do brain/registry (process.premortem-template, premortem.ads-smolko-ab, rme-dec-20260723-001).

## Kvalitatívna brána
☐→✓ 4 hlasy (1 reálny PODMIENEČNE — 2 otázky odoslať) · ✓ 10 príčin,
5 kategórií · ✓ matica · ✓ mitigácie+kill+check-in pre všetkých 7 rizík ≥6
· ✓ plán zmenený · ✓ brain zápis · ✓ timebox

## VÝSLEDOK PRE GO ROZHODNUTIE
Ads GO je bezpečné až po: (1) Smolkova odpoveď na SLA otázku,
(2) potvrdený rozpočet/cap, (3) D-1 testy #2 a #5. Odhad: 1 deň práce.
