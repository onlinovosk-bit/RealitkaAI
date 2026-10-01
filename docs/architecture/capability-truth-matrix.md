# Revolis Capability Truth Matrix

**Zavedené:** 2026-09-29 (rozhodnutie foundera po Demand OS audite).
**Pravidlo:** „máme to v kóde" ≠ „zákazník to má". Metrika „feature complete" sa
nepoužíva. Každá schopnosť má tri stavy, a každý posun o stav nahor potrebuje dôkaz.

| Stav | Znamená | Dôkaz, ktorý ho posúva |
|---|---|---|
| **CODE** | kód existuje | súbor a vstupný bod (route / cron / UI) |
| **VERIFIED** | správanie je overené testom alebo meraním | test v CI, meranie s číslom, RLS sonda |
| **PRODUCTION PROVEN** | na PROD to reálne produkuje výsledok pre zákazníka | PROD počet > 0 za posledných 30 dní (dotaz v stĺpci Dôkaz) |

`čiastočne` = časť cesty áno, časť nie (vysvetlené v poznámke). Bez dôkazu sa
stav neposúva, ani keď „by to malo fungovať".

## Stav k 2026-09-29

| Schopnosť | Code | Verified | Production proven | Dôkaz / čo chýba |
|---|:-:|:-:|:-:|---|
| Príjem leadov z e-mailu portálov | ✅ | ✅ | ✅ | 8 testov; PROD 9 nových leadov za 30 dní |
| AI triage (priorita) | ✅ | ✅ | ✅ | cron `lead-ai-triage`; PROD 511/513 leadov |
| Follow-up návrhy so schválením | ✅ | ✅ | čiastočne | cron beží; počet schválených a odoslaných návrhov za 30 dní nezmeraný |
| **Demand extraction (D1)** | ✅ | ✅ | ⏳ | #749: CI 1965 testov + RLS sonda; PROD vypnuté, čaká na backfill gate a privacy gate |
| Ochrana PII pri volaniach LLM | ✅ | ✅ | ⏳ | #750: 3 živé úniky opravené, 19 miest MINIMIZE otvorených |
| Scoring (heuristika v2) | ✅ | čiastočne | ❌ | len na tlačidlo; `lead_scores` = 0 |
| BRI | ✅ | ❌ | ❌ | cron neplánovaný, `events` = 0 |
| Buyer prediction | ✅ | čiastočne | ❌ | beží len vo verejnom onboardingu; `buyer_intents` = 3 |
| Matching | ✅ | čiastočne | ❌ | `lead_property_matches` = 0; chýba dopyt (94 % leadov) |
| **Matching na overenom dopyte (D4)** | ✅ | ✅ | ⏳ | #D4 PR: 51 testov + RLS, 5/5 mutantov zabitých; PROD čaká na D1 (flag `DEMAND_MATCHING_ENABLED`) |
| Next best action | čiastočne | ❌ | ❌ | počíta sa v prehliadači; `/api/daily-actions` bez UI |
| Ranný brief | ✅ | ❌ | ❌ | cron beží, posiela 0 (nastavenia nie sú v UI) |
| Reaktivácia | čiastočne | ❌ | ❌ | `seller-rescue` tvorí úlohy; outbound ZAKÁZANÝ bez GDPR brány |
| Forecast / pipeline € | ✅ | ❌ | ❌ | dosádza 180 000 € pri chýbajúcom rozpočte → nesmie sa zobrazovať ako fakt |
| Gmail pull | ✅ | ✅ | ❓ | chýba plánovač v repozitári; externý cron neoverený |
| Realvia fronta (worker) | ✅ | ✅ | ❓ | chýba plánovač v repozitári; externý cron neoverený |
| MCP server | kód (mock) | ❌ | ❌ | falošné dáta v pamäti |
| Observability (healthz, alerty) | čiastočne | ❌ | ❌ | `healthz` vždy „ok“, bez Sentry |

## Ako sa matica udržiava

- Každý PR, ktorý mení stav schopnosti, upraví jej riadok a uvedie dôkaz.
- „PRODUCTION PROVEN“ vyžaduje konkrétny SQL dotaz alebo log, ktorý číslo dá.
  Odhad nestačí.
- Pri zmene na horší stav (napr. cron prestane bežať) sa riadok vráti späť.
  Matica nie je zoznam úspechov.
