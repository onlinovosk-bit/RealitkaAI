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
| Follow-up návrhy so schválením | ✅ | ✅ | ❌ | **Zmerané 2026-10-15** (`scripts/sql/followup-drafts-30d.sql`): za 30 dní **3 návrhy, 0 schválených, 0 odoslaných**. Všetky 3 sú z `REVOLIS-INBOUND-AUTOREPLY` a všetky z 1. 10.; nočný `follow-up-sweep` nevytvoril ani jeden návrh za celý čas. Zákazníkovi teda nedošlo nič. |
| **Demand extraction (D1)** | ✅ | ✅ | ⏳ | #749: CI 1965 testov + RLS sonda; PROD vypnuté, čaká na backfill gate a privacy gate |
| Ochrana PII pri volaniach LLM | ✅ | ✅ | ✅ | #750: 3 živé úniky opravené. **Bod 9 (2026-10-15):** všetkých **12 živých miest MINIMIZE** opravených spoločným helperom `lib/privacy/minimize.ts` — krstné meno tam, kde text oslovuje človeka, mesto namiesto adresy, zástupný znak pri liste majiteľovi. `rescue-message` prešiel z priameho klienta na `callClaude`, takže už prechádza sanitizérom. 7 mŕtvych miest stráži pin na funkcie `generateAiReply` / `buildDossier`. Dôkaz: 15 jednotkových + 18 verifikačných testov, mutácia zabitá. |
| Scoring (heuristika v2) | ✅ | čiastočne | ❌ | len na tlačidlo; `lead_scores` = 0 |
| BRI | ✅ | ❌ | ❌ | cron neplánovaný, `events` = 0 |
| Buyer prediction | ✅ | čiastočne | ❌ | beží len vo verejnom onboardingu; `buyer_intents` = 3 |
| Matching | ✅ | čiastočne | ❌ | `lead_property_matches` = 0; chýba dopyt (94 % leadov) |
| **Matching na overenom dopyte (D4)** | ✅ | ✅ | ⏳ | #D4 PR: 51 testov + RLS, 5/5 mutantov zabitých; PROD čaká na D1 (flag `DEMAND_MATCHING_ENABLED`) |
| Next best action | čiastočne | ❌ | ❌ | počíta sa v prehliadači; `/api/daily-actions` bez UI |
| Ranný brief | ✅ | ❌ | ❌ | cron beží, posiela 0 (nastavenia nie sú v UI) |
| Reaktivácia | čiastočne | ❌ | ❌ | `seller-rescue` tvorí úlohy; outbound ZAKÁZANÝ bez GDPR brány |
| Forecast / pipeline € | ✅ | ❌ | ❌ | dosádza 180 000 € pri chýbajúcom rozpočte → nesmie sa zobrazovať ako fakt |
| **Skúšobná doba 14 dní bez karty** | ✅ | ✅ | ⏳ | **Bod 10 (2026-10-15).** Schéma na PROD overená dotazom: `agencies.trial_ends_at`, `agencies.created_via`, `account_signups`, `bootstrap_self_serve_agency` aj guard trigger existujú (5/5). `APP_TRIAL_DAYS` nie je nastavené v žiadnom Vercel prostredí → platí default 14. Registrácia nezakladá v Stripe nič (funkcia nepíše `stripe_customer_id`/`stripe_subscription_id`/`subscription_status`, plán necháva `Free`) — preto po vypršaní niet čo zaúčtovať; pinuje `trial-no-card.test.ts` (19 testov). PROD ešte neprešiel ani jeden skutočný signup: **0 zo 7 agentúr** má `trial_ends_at` a 0 má `created_via='self_serve'`. Hodnota `SELF_SERVE_SIGNUP_ENABLED` je vo Verceli *sensitive*, teda **nemeraná**. |
| **Vypnutie po vypršaní (read-only)** | ✅ | ✅ | ⚠️ | **Bod 10 (2026-10-15).** Po trialu → `limited` → `read_only`; dáta zostávajú čitateľné. Opravené dve diery, ktoré to robili na PROD nesprávne: (1) fakturovaný klient nemá v Stripe predplatné, takže padal do tej istej vetvy ako vypršaný trial — **7 zo 7 agentúr na PROD nemá `stripe_subscription_id`**, čiže sa to týkalo všetkých; teraz `paysOutsideStripe` (podľa `isPayingAgency`) drží taký účet `active`. (2) Stav `unknown` (výpadok Stripe nevypne platiaceho klienta) bol **nedosiahnuteľný**: `getCurrentBillingStatus()` chybu prehltne a vráti prázdny stav, takže `catch` v `getSafeBillingStatus()` nikdy nenastal; nevedomosť sa teraz nesie príznakom `lookupFailed`. |
| **Cenník v2 v Stripe live** | ✅ | ✅ | ❌ | **Bod 10 (2026-10-15).** Sumy v kóde sedia so zadaním (2500 / 6000 / 14900 / 34900 centov bez DPH). Skript `scripts/ops/stripe-v2/stripe_live_catalog.py` vie katalóg založiť v live (len `sk_live_`, kontrola `livemode` + `charges_enabled`, idempotentne podľa `lookup_key`, nič nemaže); **spúšťa ho founder**, PROD stav Stripe live je nemeraný. Postup: `docs/runbooks/2026-10-15-trial-a-ceny-live.md`. |
| Gmail pull | ✅ | ✅ | ❓ | chýba plánovač v repozitári; externý cron neoverený |
| Gmail pull | ✅ | ✅ | ⏳ | **Bod 3 (2026-10-15):** plánovač je v repozitári — `/api/inbound/gmail-pull` beží denne (`20 8 * * *` vo `vercel.json`; hodinový rozvrh Vercel na Hobby pláne odmieta a zhodí celý deployment), route zapisuje do `cron_runs` a po novom aj preskočený beh s dôvodom (najviac raz za 12 h). Stiahne však zatiaľ nula: zmerané vo Verceli, **ani jedna** zo šiestich premenných (`GMAIL_INBOUND_PULL_ENABLED`, `GOOGLE_GMAIL_INBOUND_CLIENT_ID`/`_SECRET`/`_REFRESH_TOKEN`/`_LABEL_ID`/`_AGENCY_ID`) v projekte neexistuje. Postup: `docs/runbooks/2026-10-15-gmail-pull-zapnutie.md`. PROD proven až keď `cron_runs` ukáže `written > 0`. |
| Realvia fronta (worker) | ✅ | ✅ | ❓ | chýba plánovač v repozitári; externý cron neoverený |
| MCP server | kód (mock) | ❌ | ❌ | falošné dáta v pamäti |
| Observability (healthz, alerty) | čiastočne | ❌ | ❌ | `healthz` vždy „ok“, bez Sentry |

## Ako sa matica udržiava

- Každý PR, ktorý mení stav schopnosti, upraví jej riadok a uvedie dôkaz.
- „PRODUCTION PROVEN“ vyžaduje konkrétny SQL dotaz alebo log, ktorý číslo dá.
  Odhad nestačí.
- Pri zmene na horší stav (napr. cron prestane bežať) sa riadok vráti späť.
  Matica nie je zoznam úspechov.
