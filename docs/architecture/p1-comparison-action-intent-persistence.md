---
title: P1-COMPARISON — `ai_action_audit` vs `ai_jobs` ako nosič ACTION INTENT
gate: GO P1-COMPARISON (spec / read-only only)
date: 2026-09-21
writes_to_prod: none
scope: výhradne P-1. P-2 (RLS model) a P-3 (`agency_id IS NULL`) sa tento dokument nedotýka.
output: fakty → výhody → nevýhody → migračný dopad → nevyriešené riziká, pre každú možnosť zvlášť; potom CONSTRAINTS a DECISION INPUT
note: Tento dokument NEVYBERÁ víťaza. Rozhodnutie P-1 je founderovo.
---

## 0. Metóda

Repo-wide grep (nielen `apps/crm/src`), čítanie migrácií, 4 read-only SELECTy na PROD
`ypgajkhqtbriqqmyawyv`. Nula zápisov. Kde tvrdenie nie je merateľné, je označené ako
**UNKNOWN**.

---

## 1. Porovnanie podľa zadaných kritérií

| Kritérium | A — `ai_action_audit` | B — `ai_jobs` |
|---|---|---|
| **Existujúce použitie** | 170 riadkov, **všetky** z `dashboard_insights` cronu cez `persistAiCostTelemetry`. Posledný zápis 2026-09-21 06:24. | **0 riadkov, 0 callerov** v celom repe (vrátane `scripts/`, `supabase/functions/`, `automation/`, `packages/`) |
| **Semantika** | `action_kind ∈ {ai_suggested, human_approved, sent, send_failed, frequency_blocked}` — enum **už dnes pokrýva intent aj execution**. Append-only event log. | `job_type/payload/status/retry_count/max_retries/run_after/last_error/started_at/completed_at` — **stavový stroj / outbox**, presne tvar intentu |
| **Schema delta** | +6: `state`, `decision_id`, `correlation_id`, `run_id`, `idempotency_key`, `provider_ref` + UNIQUE | +7: `agency_id`, `decision_id`, `correlation_id`, `run_id`, `action`, `idempotency_key`, `provider_ref` + UNIQUE (+ `status` premapovať na `state`) |
| **RLS dnes** | zapnuté, **2 policy** (`_select_tenant`, `_insert_tenant`), obe s vetvou `agency_id IS NULL OR …` | zapnuté, **0 policies** = deny-all |
| **FK dnes** | `agency_id→agencies`, `lead_id→leads`, `profile_id→profiles` (všetky `ON DELETE SET NULL`) | **žiadne FK** |
| **Idempotency** | žiadny UNIQUE okrem PK | žiadny UNIQUE okrem PK |
| **State machine** | ❌ append-only, žiadna UPDATE cesta v kóde | ✅ `status` + časové značky + `retry_count` |
| **Historické riadky** | 170 by zostalo s `state = NULL` | žiadne — tabuľka je prázdna |
| **Migračné riziko** | 4 migrácie v repe, **0 z nich zaznamenaných** v `schema_migrations`; 2 stĺpce a 2 views z nich na PROD **neexistujú** | **0 migrácií v repe.** Repo si to samo eviduje: `"in_repo_migrations": false` |
| **Runtime riziko** | **11 živých call sites `logAiAction` dnes ticho zlyháva** (viď §2) | žiadne — nič ju nevolá |
| **Kompatibilita** | konzument `lib/metrics/fetch.ts` číta view `ai_cost_daily`; UI už má vetvu „view nie je dostupná" | žiadny konzument |
| **Prevádzková cena** | 2 indexy, rastie ~10 riadkov/deň | 1 partial index `WHERE status='pending'`, nerastie |
| **Recovery / reconciler** | ❌ bez `state` sa „visiace" intenty nedajú nájsť | ✅ partial index na `pending` je presne dotaz reconcilera |
| **Auditovateľnosť** | v `tenant-table-registry.ts` ⇒ **pokrytá CI RLS izolačným testom** | **nie je v registri** ⇒ žiadne CI pokrytie |
| **Fit s P0-1A** | semanticky blízko, **mechanicky chýba stavovosť** | mechanicky presne, **chýba tenant a deklarácia** |

---

## 2. OPTION A — `ai_action_audit`

### Facts

- **170 riadkov, jediný zdroj.** `meta->>'feature'` má tri hodnoty: `dashboard_insights/fallback` 105 · `dashboard_insights/empty` 35 · `dashboard-insights/cron` 30. Všetky pochádzajú z `persistAiCostTelemetry`, ktorého jediný caller je `lib/ai/dashboard-insights-cron.ts`.
- **11 call sites `logAiAction` nevyprodukovalo ani jeden riadok.** `listing-content`, `property-launch-pack`, `call-coach/stream`, `ghostwriter/generate`, `outreach/approve`, `rescore-lead`, `outreach-store` (4×), `morning-brief/assemble`. Dôvod je merateľný: `logAiAction → logAiActionAudit` vkladá `cost_eur`, `credits_spent`, `model`, `latency_ms` (`ai-action-audit.ts:83`) **bez fallbacku** — pri chybe iba `console.warn`. Tie stĺpce na PROD **neexistujú**. Potvrdenie z dát: enum `AiAuditKind` má 5 hodnôt, na PROD sa vyskytuje **jediná** (`ai_suggested`), a `human_approved`/`sent`/`send_failed`/`frequency_blocked` majú **0 riadkov**.
- **`persistAiCostTelemetry` prežije, lebo má fallback.** `persist-cost-telemetry.ts:69-88` skúsi „full" insert a pri `isMissingCostColumnError` spadne na `base` bez cost stĺpcov. Preto cost končí v `meta` (140/170 riadkov nesie `costEur`, `model`, `latencyMs`, `creditsSpent`).
- **Štyri repo migrácie, žiadna zaznamenaná.** `20260610000001` (create + RLS), `20260611000002` (+`cost_eur`,`credits_spent`, view `ai_action_daily_agency`), `20260611000004` (+`model`,`latency_ms`, view `ai_cost_daily`), `20260616123000` (RLS hardening). Merané: **0 zo 4** je v `schema_migrations`; `cost_eur`/`credits_spent` = 0 stĺpcov na PROD; obe views = 0.
- **CI má bohatšiu schému než PROD.** `supabase db reset` staví ephemeral DB výhradne z repo migrácií, takže v CI tabuľka **má** cost stĺpce aj views. Na PROD nie. Kód je na tento rozdiel napísaný (fallback vyššie).
- **`20260616123000` už obsahuje opravu NULL vetvy** — dropne `_select_tenant`/`_insert_tenant` a nahradí ich jednou `ai_action_audit_tenant FOR ALL` s `agency_id in (select public.profile_agencies_for_auth())`, **bez** `agency_id IS NULL`. Na PROD nie je aplikovaná. *(Fakt, nie odporúčanie — P-3 je samostatné rozhodnutie.)*
- V `tenant-table-registry.ts` ako `scope: "agency_id", domain: "communications"` ⇒ pokrytá CI RLS izolačným testom, ktorý pipeline explicitne vyžaduje.

### Advantages

- **Jediné miesto, kde dnes reálne vzniká per-akciový záznam.** Zápis prebehol dnes ráno.
- **Enum `action_kind` už pokrýva životný cyklus**, nie len audit: `ai_suggested` (intent) → `human_approved` (authorize) → `sent` / `send_failed` (execution). *Korekcia môjho skoršieho tvrdenia v `cp-p0-1a-persistence-definition.md` §5: označil som Cestu A za AP-006 (prekrytie významov). Po prečítaní enumu je to presnejšie tak, že tabuľka **už bola navrhnutá ako lifecycle log** a nikdy sa tak nepoužila.*
- Má `agency_id` aj FK na `leads`, `profiles`, `agencies` — tenant a entita sú zadrôtované.
- Je v CI RLS registri ⇒ zmena policy sa otestuje bez pridávania testov.
- Oprava jej dnešného tichého zlyhania (11 call sites) je **vedľajší produkt** akejkoľvek migrácie, ktorá zosúladí PROD s repom.

### Disadvantages

- **Nie je to stavový stroj.** Žiadny `state`, žiadna UPDATE cesta v kóde, žiadne `started_at`/`completed_at`. Prechod `intended → executed` treba buď doplniť ako UPDATE (nový vzor pre túto tabuľku), alebo ako druhý riadok.
- **Tu vzniká tvrdý mechanický konflikt:** P0-1A žiada `UNIQUE (idempotency_key)`. Na append-only evente to **zablokuje druhý riadok toho istého kľúča** — teda nedá sa mať intent-riadok aj execution-riadok. Buď `UNIQUE (idempotency_key, state)` (a potom UNIQUE nechráni pred dvojitým vykonaním, len pred dvojitým riadkom rovnakého stavu), alebo UPDATE-in-place (a potom prestáva byť audit logom). **Toto treba rozhodnúť, nie obísť.**
- 170 historických riadkov zostane s `state = NULL`, `decision_id = NULL`, `correlation_id = NULL` — reconciler ich musí explicitne vylúčiť, inak ich uvidí ako „visiace intenty".
- Dva views (`ai_action_daily_agency`, `ai_cost_daily`) na nej visia; akákoľvek zmena typu/názvu stĺpca sa ich dotkne.

### Migration impact

- **Predpokladom je najprv dobehnúť 4 nezaznamenané migrácie.** Kým PROD nemá `cost_eur`/`credits_spent`/`model`/`latency_ms`, 5. migrácia stavia na schéme, ktorú repo opisuje inak než realita.
- `ADD COLUMN` bez `NOT NULL DEFAULT` je na PG 11+ metadata-only ⇒ pri 170 riadkoch bez prestoja.
- `UNIQUE (idempotency_key)` na existujúcich 170 riadkoch s `NULL` kľúčom prejde (NULL sa v UNIQUE neduplikuje).
- **Rollback:** `DROP COLUMN` je bezpečný, ale ak medzitým `logAiActionAudit` začne písať `state`, rollback vráti tabuľku do stavu, keď tie zápisy opäť ticho zlyhávajú — teda do dnešného stavu. Riziko je „tiché", nie „hlučné", čo je horšie.

### Unresolved risks

- **UNKNOWN:** prečo 4 migrácie nikdy nepristáli na PROD. Bez toho nevieme, či ich dobehnutie je bezpečné, alebo či boli zámerne vynechané.
- **UNKNOWN:** či `logAiActionAudit` zlyháva na PROD naozaj na chýbajúcich stĺpcoch, alebo aj z iného dôvodu. Dôkaz je nepriamy (0 riadkov s inými `action_kind`), nie z logu. **Priame potvrdenie by si vyžiadalo čítanie runtime logov, ktoré táto brána nerobí.**
- Dnešné tiché zlyhanie 11 call sites je **samostatný bug bez ohľadu na P-1** a nemal by byť zlúčený do CP-P0-1A.

---

## 3. OPTION B — `ai_jobs`

### Facts

- **0 riadkov. 0 callerov.** Grep na `ai_jobs` cez celé repo (ts, tsx, sql, js, mjs, json, md) vracia päť súborov: `config/public-schema-allowlist.json`, `docs/audit/rls-schema-parity-matrix.json`, dva docs a moju vlastnú persistence definíciu. **Ani jeden riadok kódu.**
- **Žiadna migrácia v repe.** `grep -rn "ai_jobs" --include=*.sql` = 0 zásahov. Repo si to samo eviduje v parity matrixe: `"in_repo_migrations": false`, `"on_prod": true`, `"has_agency_id": false`, `"rls_enabled": true`.
- **Nie je v `tenant-table-registry.ts`** (0 zásahov) ⇒ žiadny CI RLS test ju nepokrýva.
- RLS zapnuté, **0 policies** ⇒ deny-all pre `anon` aj `authenticated`; číta len `service_role`.
- Tvar: `id, job_type, payload jsonb, status, retry_count, max_retries, run_after, last_error, created_at, updated_at, started_at, completed_at` + `ai_jobs_runner_poll` partial index `(run_after, created_at) WHERE status='pending'`.

### Advantages

- **Tvarom presne to, čo P0-1A žiada.** `status` + `retry_count`/`max_retries` + `run_after` + `last_error` + `started_at`/`completed_at` je stavový stroj intentu, nie audit log. Nič sa neohýba.
- **Partial index `WHERE status='pending'` je hotový dotaz reconcilera** — presne to, čo §FAILURE v persistence definícii potrebuje na hľadanie visiacich intentov.
- **Prázdna.** Žiadne historické riadky s NULL stavom, žiadna spätná kompatibilita, žiadny konzument, ktorého by sa zmena dotkla.
- Rollback je triviálny: nikto ju nečíta ani nepíše.
- Neprekrýva význam inej tabuľky — `ai_action_audit` môže zostať tým, čím je.

### Disadvantages

- **Nemá `agency_id`.** P0-1A žiada tenant na každom tenant-scoped riadku (I-002). Bez neho tabuľka nespĺňa kontrakt.
- **Nemá žiadne FK** — `decision_id → decisions.id` treba doplniť od nuly.
- **Nie je v CI RLS registri** ⇒ izolácia sa neoveruje; test treba dopísať.
- `payload jsonb` zvádza k ukladaniu obsahu namiesto odkazov — priamy konflikt s I-011. Vyžaduje explicitné pravidlo, nie dôveru.
- „Oživiť existujúcu tabuľku" je **zavádzajúci popis**: z pohľadu repa a CI neexistuje.

### Migration impact

- **Tu je jadro.** CI staví ephemeral DB cez `supabase db reset`, teda **výhradne z repo migrácií**. `ai_jobs` v nich nie je ⇒ **v CI databáze tabuľka neexistuje**. Migrácia s `ALTER TABLE public.ai_jobs …` v CI **zlyhá**.
- Migrácia teda musí tabuľku **vytvoriť**. Lenže na PROD už existuje, s tvarom, ktorý repo nikdy nedeklarovalo. `CREATE TABLE IF NOT EXISTS` by na PROD ticho preskočil a nechal nedeklarovanú schému na mieste ⇒ **CI a PROD by sa rozišli hneď prvou migráciou**, a rozdiel by nebol detegovateľný.
- Jediná bezpečná cesta: migrácia, ktorá tabuľku **deklaruje presne v tvare, aký má PROD**, plus samostatné aditívne `ALTER`y — teda najprv spätne legalizovať nedeklarovaný objekt.
- Rollback: čistý (0 riadkov), ale `DROP TABLE` by zmazal objekt, ktorý na PROD existoval pred nami.

### Unresolved risks

- **UNKNOWN (U-P, prenesené):** či `ai_jobs` nemá writera mimo repa — Supabase Edge Functions ani n8n workflows neboli kontrolované. Ak writer existuje, „prázdna a nepoužívaná" prestáva platiť.
- **UNKNOWN:** kto a kedy `ai_jobs` na PROD vytvoril a prečo bez migrácie. Bez toho nevieme, či ju niekto plánoval použiť.
- Nedeklarovaný objekt v produkcii je sám osebe položka pre A8 (migration ownership), nezávisle od P-1.

---

## 4. CONSTRAINTS — čo P0-1A vyžaduje

Z `docs/architecture/cp-p0-1a-persistence-definition.md` (na `main`):

| # | Požiadavka |
|---|---|
| **R1** | Intent je durable **pred** externým volaním |
| **R2** | `UNIQUE` nad deterministickým `idempotency_key`; unique-violation pri retry = úspech |
| **R3** | `intent.decision_id → decisions.id`, **NOT NULL** |
| **R4** | Tenant na každom tenant-scoped riadku (I-002) |
| **R5** | Stavy `intended → executed \| failed`, rozlíšiteľné dotazom |
| **R6** | T1 (Decision + intent) atómicky v jednom plpgsql volaní cez `supabase.rpc()` |
| **R7** | Záznam je čitateľný tým, kto slučku audituje *(kto to je = **P-2**, mimo tejto brány)* |
| **R8** | Reconciler vie efektívne nájsť intenty v stave `intended` staršie než SLA |
| **R9** | Žiadne osobné údaje v zázname; odkazy, nie obsah (I-011) |
| **R10** | Dotaz P1 spojí štyri články cez FK a pomenuje chýbajúci |

---

## 5. DECISION INPUT

Legenda: ✅ spĺňa dnes · ➕ spĺňa po aditívnej zmene · ⚠️ vyžaduje rozhodnutie · ⛔ **CONSTRAINT VIOLATION**

| | A — `ai_action_audit` | B — `ai_jobs` |
|---|---|---|
| **R1** durable pred volaním | ➕ | ➕ |
| **R2** UNIQUE idempotency | ⚠️ **konflikt s append-only modelom** — viď §2 Disadvantages | ➕ |
| **R3** FK na decision NOT NULL | ➕ | ➕ |
| **R4** tenant | ✅ má `agency_id` + FK | ➕ treba pridať |
| **R5** stavy | ⚠️ treba zvoliť UPDATE-in-place **alebo** dva riadky | ✅ `status` existuje |
| **R6** T1 cez RPC | ➕ (nezávisí od výberu tabuľky) | ➕ |
| **R7** čitateľnosť | ✅ má tenantné policy *(ich tvar rieši P-2/P-3)* | ➕ 0 policies, treba napísať |
| **R8** reconciler | ➕ index treba doplniť | ✅ partial index hotový |
| **R9** bez PII | ✅ dnes `body_hash`, nie telo | ⚠️ `payload jsonb` treba obmedziť pravidlom |
| **R10** P1 join | ➕ | ➕ |
| **Migrácia aplikovateľná v CI** | ✅ tabuľka v CI existuje | ⛔ **v CI DB neexistuje** — `ALTER` zlyhá; migrácia ju musí najprv deklarovať a zosúladiť s nedeklarovaným PROD tvarom |
| **CI RLS pokrytie** | ✅ v `tenant-table-registry.ts` | ➕ treba doplniť |

### Jediné dve miesta, ktoré nie sú „nižšie skóre", ale tvrdé podmienky

1. **B ⛔ — `ai_jobs` nie je v repo migráciách, takže v CI databáze neexistuje.** Nie je to nevýhoda, je to blokujúca podmienka: prvá migrácia musí objekt spätne legalizovať v presnom PROD tvare, inak sa CI a PROD rozídu hneď a nedetegovateľne.
2. **A ⚠️ — `UNIQUE (idempotency_key)` a append-only event log sa vylučujú.** Nie je to blokujúca podmienka, ale ani vec, ktorú možno nechať na implementáciu: buď sa zmení model tabuľky na stavový (UPDATE), alebo sa zmení význam UNIQUE (a tým aj sila I-009).

### Čo je pre obe rovnaké

Obe tabuľky stoja na **nedeklarovanej produkčnej schéme**. A má 4 migrácie, z ktorých **nepristála ani jedna**; B nemá žiadnu. Rozdiel nie je „A je deklarovaná, B nie", ale **„A je deklarovaná nesprávne, B nie je deklarovaná vôbec"**. Obe cesty preto začínajú rovnakým krokom: zosúladiť repo s tým, čo na PROD reálne je.

---

## 6. Čo táto brána neurobila

Nevybrala víťaza. Nedotkla sa P-2 ani P-3 — `agency_id IS NULL` vetva je spomenutá výhradne ako nameraný fakt o migrácii `20260616123000`, bez odporúčania. Žiadna migrácia, kód, schema change, RLS change, dependency change, deployment ani merge. Štyri read-only SELECTy, nula zápisov.

## 7. UNKNOWN — REQUIRES VERIFICATION

- **U-P** (prenesené) — writer `ai_jobs` mimo repa (Edge Functions, n8n).
- **U-R** — prečo 4 migrácie `ai_action_audit` nikdy nepristáli na PROD.
- **U-S** — či `logAiActionAudit` zlyháva naozaj na chýbajúcich stĺpcoch; dôkaz je nepriamy (0 riadkov s iným `action_kind`), nie z runtime logu.
- **U-T** — kto a kedy vytvoril `ai_jobs` na PROD bez migrácie.
