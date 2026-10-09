> Podklad k `2026-10-09-q4-growth-strategy.md`. Agregáty z LeadHub MCP (read-only), bez osobných údajov. Definícia tržieb NIE JE overená (ROZPOR s P&L, viď sekciu A). Stav: VALIDATE.

# LEADHUB DATA PACK — onlinovo.sk (business_id e5a433ab1fc64fd7a7947fca2251a07d)
Zdroj: LeadHub MCP (read-only, agregáty), načítané 2026-10-08. Mena EUR. Definícia tržieb v LeadHube (s/bez DPH, so stornami?) NIE JE overená -> CONFLICT voči P&L (viď nižšie).

## A. Objednávky (order_statistics)
| Obdobie | objednávky | z toho nové / vracajúce sa | tržby | AOV | unik. zákazníci (noví/vracajúci) |
|---|---:|---:|---:|---:|---:|
| Q4 2025 (1.10.–31.12.2025) | 1403 | 842 / 561 | 64583.00 | 46.03 | 1273 (842/431) |
| Apr–Sep 2025 | 2059 | 1205 / 854 | 90244.20 | 43.83 | 1693 (1205/488) |
| Apr–Sep 2026 | 1443 | 734 / 709 | 63788.57 | 44.21 | 1189 (734/455) |

Odvodené (Apr–Sep 2026 vs Apr–Sep 2025): objednávky -29.9 %, tržby -29.3 %, noví zákazníci -39.1 %, vracajúce sa objednávky -17.0 %, AOV 0.9 %.
Podiel vracajúcich sa objednávok: Q4 2025 40.0 %; Apr–Sep 2026 49.1 %; Apr–Sep 2025 41.5 %. Podiel tržieb od vracajúcich sa: Q4 2025 44.0 %; Apr–Sep 2026 52.6 %.
CONFLICT voči P&L (Q4 2025): LeadHub 1403 objednávok / 64 583,00 € vs P&L 1290 objednávok / 46 857,97 € (tržby vrátane účtovanej dopravy, bez DPH) -> P&L x1,23 = 57 634 €. Rozdiel objednávok 113 ( 8.8 %), tržieb LeadHub vs P&L x1,23: 12.1 %. Príčina neznáma (storná/nezaplatené/DPH/doprava).

## B. Retencia (first_purchase_cohorts, repeat_purchase_cycle)
Celková miera návratu prvonákupcov: 28,66 % (5063 oprávnených; 1451 sa vrátilo). Kumulatívne: 7d 4,68 %, 14d 5,63 %, 30d 6,97 %, 60d 9,20 %, 90d 11,26 %, 180d 15,90 %, 365d 21,45 %, 730d 26,98 %.
Kohorty (veľkosť; retencia 30/90/180 d %; priemerné LTV 90 d / celkové € ):
- 2024-10: n=137, ret30=8.03, ret90=16.06, ret180=18.98, avgLTV90=51.44, avgLTV_total=70.19
- 2024-11: n=277, ret30=5.78, ret90=9.39, ret180=14.08, avgLTV90=46.67, avgLTV_total=65.99
- 2024-12: n=408, ret30=4.17, ret90=6.62, ret180=10.54, avgLTV90=49.06, avgLTV_total=64.01
- 2025-10: n=178, ret30=6.18, ret90=10.67, ret180=14.04, avgLTV90=41.19, avgLTV_total=49.76
- 2025-11: n=283, ret30=6.01, ret90=8.48, ret180=10.6, avgLTV90=49.35, avgLTV_total=54.91
- 2025-12: n=381, ret30=5.25, ret90=6.56, ret180=10.24, avgLTV90=48.05, avgLTV_total=53.98
- 2025-04: n=245, ret30=8.16, ret90=13.47, ret180=18.37, avgLTV90=43.55, avgLTV_total=56.48
- 2025-06: n=215, ret30=6.05, ret90=13.49, ret180=16.28, avgLTV90=56.05, avgLTV_total=69.84
- 2025-08: n=214, ret30=7.01, ret90=13.55, ret180=21.5, avgLTV90=47.03, avgLTV_total=60.01
- 2026-04: n=134, ret30=4.48, ret90=8.96, ret180=13.43, avgLTV90=48.38, avgLTV_total=52.69
- 2026-05: n=149, ret30=9.4, ret90=13.42, ret180=16.78, avgLTV90=44.94, avgLTV_total=49.41
- 2026-06: n=118, ret30=7.63, ret90=11.86, ret180=12.71, avgLTV90=45.79, avgLTV_total=46.29
- 2026-07: n=130, ret30=6.15, ret90=10.77, ret180=10.77, avgLTV90=47.86, avgLTV_total=47.86
- 2026-08: n=117, ret30=5.13, ret90=6.84, ret180=6.84, avgLTV90=44.48, avgLTV_total=44.48
- 2026-09: n=86, ret30=8.14, ret90=8.14, ret180=8.14, avgLTV90=43.64, avgLTV_total=43.64
Q4 kohorty (okt–dec) majú nižšiu retenciu než ostatné mesiace (dec 2024: 90d 6,62 %, dec 2025: 90d 6,56 % vs apr 2025 13,47 %). Priemerné celkové LTV prvonákupcu je ~44–70 € pri prvej objednávke ~41–48 € (LTV nad prvý nákup je malé).
Mesačná veľkosť kohort (noví zákazníci): 2025-10 178, 2025-11 283, 2025-12 381; 2026-04 134, 05 149, 06 118, 07 130, 08 117, 09 86 -> nové zákaznícke kohorty 2026 sú ~40–60 % nižšie než 2025 (apr 2025 245, jún 215, aug 214, sep 228).

## C. Návštevnosť podľa zdroja (session_statistics; last-click tržby, konverzie)
Q4 2025 (spolu: 31 414 sessions, last-click 60 369,56 €, 1 310 konverzií):
- google_ads / search: sessions 13201, last-click 33988.84 € (56.3 %), konverzie 753
- internal (neznámy pôvod, pravdepodobne artefakt): sessions 1740, last-click 8919.19 € (14.8 %), konverzie 167
- facebook / cpc: sessions 5539, last-click 6811.18 € (11.3 %), konverzie 167
- direct: sessions 7420, last-click 3390.26 € (5.6 %), konverzie 73
- leadhub / email: sessions 519, last-click 3018.36 € (5.0 %), konverzie 53
- google / search (organika): sessions 1042, last-click 1921.07 € (3.2 %), konverzie 42
- facebook / social: sessions 1272, last-click 1015.81 € (1.7 %), konverzie 27
- unknown: sessions 366, last-click 1011.95 € (1.7 %), konverzie 20
- google_ads / shopping: sessions 222, last-click 198.8 € (0.3 %), konverzie 5
Apr–7.10.2026 (spolu: 26 088 sessions, last-click 60 802,07 €, 1 376 konverzií):
- google_ads / search: sessions 15402, last-click 42160.65 € (69.3 %), konverzie 986
- internal: sessions 2126, last-click 11490.13 € (18.9 %), konverzie 224
- direct: sessions 6505, last-click 2892.25 € (4.8 %), konverzie 64
- leadhub / email: sessions 335, last-click 1568.77 € (2.6 %), konverzie 34
- unknown: sessions 379, last-click 836.51 € (1.4 %), konverzie 17
- google / search (organika): sessions 689, last-click 743.14 € (1.2 %), konverzie 21
- google_ads / shopping: sessions 304, last-click 396.69 € (0.7 %), konverzie 11
- facebook / social: sessions 139, last-click 376.24 € (0.6 %), konverzie 9
- leadhub / subscription-settings: sessions 65, last-click 176.4 € (0.3 %), konverzie 5
- facebook / cpc: sessions 4, last-click 0 € (0.0 %), konverzie 0
Poznámky: (1) Facebook/Meta cpc bol v Q4 2025 aktívny (5 539 sessions, 167 last-click objednávok, 6 811 €) a v Apr–Oct 2026 prakticky nebeží (4 sessions) — v zadanom strategickom dokumente sa Meta nespomína. (2) Google Ads search (PMax/Search podľa UTM) = ~56 % (Q4 2025) a ~69 % (2026) last-click tržieb: koncentrácia na jeden kanál. (3) Organické Google ~1–3 % tržieb. (4) E-mail 3 018 € (5,0 %) v Q4 2025 a 1 569 € (2,6 %) v 2026. (5) 'internal' = zdroj nie je externý (možno platobná brána/self-referral) — treba vyčistiť atribúciu.

## D. Kampane v LeadHube (list_campaigns)
Automatizácie (incremental-emailing) AKTÍVNE: 'Dochádzajúce produkty' (od 2025-09), 'Odmena 30 dní po 1. nákupe - motivace', 'Odmena 30/6 mes/9 mes/rok po 1. nákupe - připomínka' (4 kusy, predmet 'zľava na vás stále čaká'), 'Odmena 3/6/9 mesiacov od nákupu' (zľava 4 % v 9-mesačnom), 'Výročie rok + od nákupu' (5 % zľava).
PAUZA/DRAFT: 'A — 14 dní po nákupe - Crossell 15 ml' (paused, vytvorená 2026-09-08); 'B — e-mail na 80. deň (100 ml) / 60. deň (50 ml)' (draft, 2026-09-16) — t.j. replenishment flow podľa veľkosti balenia, ktorý stratégia odporúča, je v LeadHube pripravený, ale nezapnutý.
Q4 2025 jednorazové kampane: 'Black Friday 29.11.2025' (A/B, scheduled 2025-11-29 19:37 UTC — deň PO Black Friday 28.11.), 'KAMPAŇ MIKULASd' (6.12.2025, zľava 2 €), 'KAMPAŇ šťastne a vesele' (12.12.2025, A/B). V októbri 2025 a v prvých 4 týždňoch novembra 2025 žiadna jednorazová kampaň v zozname. Predošlé roky: 2023 BF a Mikuláš s 10 % zľavou; 'Povianočný výpredaj do -85 %' (detský sortiment pred pivotom na parfumy).
Popup: jediný záznam 'Súťaž o voucher' (archived, 2023) — aktuálny popup PRVYNAKUP nie je v tomto zozname typu popup (overiť inú cestu/ID).

## E. Produkty (product_statistics; ceny a nákup sú AKTUÁLNE v katalógu, nie historické)
Top podľa tržieb Q4 2025: 17415/100 (Yodeyma, 201 ks, 8 020 €, cena 39,90, nákup 25,20, marža 36,8 % z ceny s DPH?—definícia LeadHub: gross_profit_margin), 17574/100 (87 ks, 3 119 €, 29,7 %), 141/100 (99 ks, 2 870 €, 31,3 %), MFK 17184/70M (8 ks, 2 800 €, cena 350, nákup 265, GP 85 €/ks), 2037/100 (92 ks, 2 737 €), 69/100 (67 ks), 60/100 (66 ks), 75/100, 17574/50, 17427/100 ... tester 17538/51 (163 ks, cena 6,00, nákup 0,10 -> 'darček/tester' predávaný za 6 €, konverzia 28,8 %).
Apr–7.10.2026: 17415/100 (197 ks, 7 860 €), 141/100 (116 ks, 3 363 €), 17415/50 (123 ks, 2 768 €), 17574/100 (57 ks, 2 043 €), 69/100 (64 ks, 1 855 €), 99/100 (50 ks, 1 595 €), 81/100, 60/100, 2037/100, MFK 17184/70M (4 ks, 1 400 €) ... SET 17415/SET (21 ks, 987 €, marža 45,6 %).
Typická marža 100 ml Yodeyma pri aktuálnom katalógu: cena 28,99–39,90 €, nákup 19,91–25,20 € -> hrubý zisk 7,9–14,7 € /ks s DPH-cenou (nie čistá marža). 50 ml: cena 18,99–22,50, nákup 10,49–13,44 -> GP 8,5–9,1 €, marža 40–45 %. 15 ml: cena 9,75, nákup 5,77, GP 3,98.
Brandová koncentrácia Q4 2025: Yodeyma 66 614,79 € tržieb z 1 375 objednávok (349 produktov), Maison Francis Kurkdjian 2 926 € (12 objednávok, AOV 207 €, GP 805 €, marža 27,5 %), ostatné značky (Divique 449 €, detské licencie <360 €) zanedbateľné -> ~94 % tržieb z jednej značky/dodávateľa (Yodeyma).
Flagy v katalógu: 'ZĽAVA 2 € S KÓDOM: BLACK25' a 'PLATÍ PRI NÁKUPE NAD 70 €' sú ešte na produktoch (zostatok z Black Friday 2025 – skontrolovať, či zodpovedá aktuálnej akcii).

## F. RFM (list_rfm_profiles)
Default profil 'Nový RFM profil' (2026-04-17): window 365 dní, recency [30,90,180,365], frequency [2,3,5,8], monetary [500,1000,2000,4000] €. Pri AOV ~44 € a 1,2 objednávkach/zákazníka za rok sú monetary hranice 500+ € nerealistické -> príčina, že ~99,9 % zákazníkov je v najnižšom M koši (potvrdzuje zistenie v stratégii; oprava = prekalibrovať hranice, napr. podľa percentilov).
