# Phase 1 data audit — Revolis CRM

**Dátum:** 2026-10-20  
**Režim:** STRICT READ-ONLY (žiadny zápis do DB, žiadna migrácia, žiadny env, žiadny merge/deploy)  
**Repo HEAD (`origin/main`):** `5ab3da4d1d3a622d747f07124720d333d23e7c2d`  
**Rozsah:** `apps/crm`, `apps/crm/supabase/migrations/` (139 SQL súborov v repe)  
**PROD v tomto turne:** **NEOVERENÉ.** Supabase MCP je `needsAuth`. Žiadny SELECT proti produkcii sa nespustil.  
**RAU:** router vrátil `GO_REQUIRED` na zakazujúce slová (merge/deploy/migrations/env). Zadanie ich zakazuje, nie žiada — pokračované ako docs-only audit.

Pravidlo dôkazu: historický snapshot **nie je** aktuálny stav produkcie. Kde chýba meranie z tohto turnu, verdikt je UNKNOWN a SQL je pre foundera v SQL editore (iba SELECT).

---

## Verdikt (5 riadkov)

| # | Oblasť | Verdikt | Prečo (1 veta) |
|---|---|---|---|
| 1 | Lead contact events migrácia v PROD | **UNKNOWN** | Súbor je na `main` (`20260924060000`); aktuálny `schema_migrations` + stĺpce v PROD sa v tomto turne nečítali. |
| 2 | Zápisy kontaktov a timestampy | **FAIL** | Tri nesúvisiace stopy (`lead_events.occurred_at`, `leads.last_contact_at`, `leads.last_contact` text); Action Queue nepíše C1 event; žiadna idempotencia. |
| 3 | Deal outcomes + reakcie makléra (accepted/rejected next_action) | **FAIL** | Zapisovače existujú, ale `accepted`/`rejected` mapujú CRM `active`/`inactive`, nie next_action; deal close je fire-and-forget bez unique; PROD naplnenie neoverené. |
| 4 | Tenant isolation (RLS, `agency_id`, service-role) | **FAIL** | Register 58 tabuliek je neúplný; `credit_redemption_codes` bez RLS; `decisions`/`exclusivity_outcomes` len `service_role`; desiatky routes idú cez service-role. PROD RLS = UNKNOWN. |
| 5 | North Star 2027–2030 vs reálne tabuľky | **FAIL** | Loop 1 C1 nemá jeden zdroj pravdy; Loop 3 a 4 nemajú tabuľky; `north-star-day.sql` meria inú množinu a bez tenant filtra. |

---

## 1) Lead contact events — je migrácia v produkcii?

### Čo je v repe (FAKT)

Migrácia **existuje** v kanonickej ceste:

- súbor: `apps/crm/supabase/migrations/20260924060000_lead_contact_event_substrate.sql`
- commit: `fe1a6a50d46d0cca9a2f68f1c9d169103c9440e8` (2026-09-24, `#680`)
- **nie je** nová tabuľka `lead_contact_events` — pridáva stĺpce na existujúcu `public.lead_events`:
  `occurred_at timestamptz`, `actor_profile_id`, `channel`, `outcome`, `source`, `note`
  + CHECK vocabularies + partial index `idx_lead_events_contact_attempt` (`type = 'contact_attempted'`)
- hlavička migrácie (riadky 13–17): **PREP ONLY**. Founder ju má aplikovať v Dashboard SQL Editor. History INSERT je zámerne s `ARRAY[]::text[]` (prázdne `statements`).

Kód, ktorý na to spolieha:

- `apps/crm/src/lib/lead-contact-events/store.ts` (`recordContactAttempt` → `.from("lead_events").insert`)
- `apps/crm/src/app/api/leads/[id]/contact-attempt/route.ts` (HEAD cesta; EVENTS-WIRE commit `cfa9fa1bcc163875f98523f77816d17a267231bc`)

Koreňová `supabase/` v repe **nie je** migration tree CRM (iba staré `01_*.sql` skripty). Jediný zdroj migrácií pre tento audit: `apps/crm/supabase/migrations/`.

### Čo toto NIE JE (PREDPOKLAD zakázaný)

Byť na `main` ≠ byť aplikované v PROD. Komentár PREP ONLY + prázdny INSERT do `schema_migrations` znamená, že **riadok v histórii môže existovať bez ALTER TABLE**.

### Historický snapshot (NIE aktuálny PROD)

- `scripts/db/fixtures/prod-ledger-2026-09-24.json` obsahuje `version: "20260924060000"` / `name: "lead_contact_event_substrate"`.
- `docs/reports/2026-09-24-ghost-migrations-reconcile.md` §8: tá istá verzia je medzi 5 záznamami so `stmts = 0` (registrované **bez textu**). To sedí s `ARRAY[]::text[]` a **nedokazuje** existenciu stĺpcov.
- `docs/reports/2026-10-20-preflight-audit-dodavky.md`: v ten deň 139? vs **78** riadkov v `supabase_migrations.schema_migrations`, aplikované výberovo. **Neopakované v tomto turne.**

### SQL pre foundera (SELECT only) — PASS keď

```sql
-- 1A. Je verzia v histórii migrácií?
SELECT version, name, statements, created_at
FROM supabase_migrations.schema_migrations
WHERE version = '20260924060000';
-- PASS: 1 riadok, name = 'lead_contact_event_substrate'
-- SAMOTNÉ to NESTAČÍ (môže byť stmts=0 / prázdne statements).

-- 1B. Existujú stĺpce substrátu? (toto je skutočný dôkaz aplikovania)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lead_events'
  AND column_name IN (
    'occurred_at', 'actor_profile_id', 'channel', 'outcome', 'source', 'note'
  )
ORDER BY column_name;
-- PASS: 6 riadkov; occurred_at = timestamp with time zone, nullable YES.

-- 1C. Partial index
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'lead_events'
  AND indexname = 'idx_lead_events_contact_attempt';
-- PASS: 1 riadok, indexdef obsahuje WHERE type = 'contact_attempted'.

-- 1D. CHECK vocabularies
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.lead_events'::regclass
  AND conname IN (
    'lead_events_channel_check',
    'lead_events_outcome_check',
    'lead_events_source_check'
  );
-- PASS: 3 constraints; channel IN (call,email,sms,whatsapp,other).
```

**PASS oblasti 1** iba ak 1B + 1C prejdú. 1A bez 1B = FAIL (history ghost).

---

## 2) Správnosť zápisov kontaktov a timestampov

### Kto píše (FAKT, kód na `main`)

| Stopa | Zapisovateľ | Čo uloží | Idempotencia |
|---|---|---|---|
| `lead_events` type=`contact_attempted` | `POST /api/leads/[id]/contact-attempt` → `recordContactAttempt` | `occurred_at = new Date().toISOString()` (server clock, UTC) | **žiadna** — čistý INSERT, index nie je UNIQUE |
| `leads.last_contact_at` | `markLeadContacted` (`a525faa2`, `#800`) volané z `approve-draft.ts` po úspešnom sende | ISO string, monotonický guard `IS NULL OR lt` | čiastočná (neposúva dozadu) |
| `leads.last_contact_at` | `inbound-lead-auto-response.ts` v tom istom UPDATE ako `auto_response_sent_at` | ISO z odoslania | na dedup update, nie na event |
| `leads.last_contact` (**text**) | `leads-store.ts` `updateLead` mapuje `lastContact` → `last_contact` | ľubovoľný string vrátane ISO | žiadna |
| `leads.last_contact` | Action Queue `DashboardPageClient.markLeadContacted` PATCH `{ status: "Teplý", lastContact: nowIso }` + activity „Kontakt“ | ISO do **textového** stĺpca | žiadna; **nevolá** `/contact-attempt` |
| `public.events` | contact-attempt fail-soft cez `createAdminClient()` (service-role) | `call_initiated` / `message_initiated` | žiadna |

UI, ktorá C1 naozaj píše: `apps/crm/src/app/(dashboard)/leads/[id]/page.tsx` `logContactAttempt` (tel:/mailto: + `keepalive`). Action Queue na dashboarde **nie**.

### Timezone (FAKT)

- `occurred_at` je `timestamptz`; zápis cez `Date#toISOString()` = UTC (`…Z`).
- Server clock, nie client (`contact-attempt/route.ts` riadky 46–49, 79).
- Tolerancia budúcnosti v store: 5 minút (`FUTURE_TOLERANCE_MS`).
- North-star denný SQL používa `Europe/Bratislava` bounds (`scripts/sql/north-star-day.sql`) — **iná zóna ako ISO-Z zápis**, pri dennom reze OK (timestamptz), pri `::date` bez AT TIME ZONE by to klamalo.

### Idempotencia / duplicity (FAKT → FAIL)

- `recordContactAttempt` nemá unique `(agency_id, lead_id, occurred_at, channel)` ani dedupe_key.
- Dvojklik na Volat/Email na detail leade = dva `contact_attempted` riadky. C1 `resolveFirstContactAttempt` berie earliest, takže **počty pokusov** sa nafúknu, **first-contact čas** nie.
- Action Queue a detail leade môžu o tom istom hovore zapísať rôzne stopy (text vs event vs nič).
- `contact-attempt` **nevolá** `markLeadContacted` — C1 event a `last_contact_at` sa rozchádzajú zámerne v kóde (komentár v route o `events` pre BRI, nie o `last_contact_at`).

### SQL — PASS keď

Nahraď `:agency_id` UUID tenanta.

```sql
-- 2A. Schéma: dva timestampy vs text
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'leads'
  AND column_name IN ('last_contact', 'last_contact_at');
-- PASS schémy: last_contact_at = timestamptz; last_contact = text.
-- FAIL produktu: dva stĺpce s rôznym významom ostávajú.

-- 2B. Koľko C1 eventov vs koľko last_contact_at (tenant)
SELECT
  (SELECT count(*) FROM public.lead_events e
    WHERE e.agency_id = :agency_id
      AND e.type = 'contact_attempted') AS contact_attempted_rows,
  (SELECT count(*) FROM public.lead_events e
    WHERE e.agency_id = :agency_id
      AND e.type = 'contact_attempted'
      AND e.occurred_at IS NOT NULL) AS with_occurred_at,
  (SELECT count(*) FROM public.leads l
    WHERE l.agency_id = :agency_id
      AND l.last_contact_at IS NOT NULL) AS leads_with_last_contact_at,
  (SELECT count(*) FROM public.leads l
    WHERE l.agency_id = :agency_id) AS leads_total;
-- Interpretácia: nie PASS/FAIL číslo — PASS je „čísla sedia so známymi zapisovateľmi“.
-- Ak contact_attempted_rows = 0 a last_contact_at > 0 → C1 funnel je slepý.
-- Ak occurred_at IS NULL na všetkých pokusoch → substrát neaplikovaný alebo staré riadky.

-- 2C. Duplicity pokusov na tom istom leade
SELECT lead_id, count(*) AS n
FROM public.lead_events
WHERE agency_id = :agency_id AND type = 'contact_attempted'
GROUP BY lead_id
HAVING count(*) > 1
ORDER BY n DESC
LIMIT 20;
-- PASS idempotencie: 0 riadkov. Očakávané na dnešnom kóde: môžu byť duplicity.

-- 2D. Rozpor ISO vs slovo v last_contact
SELECT
  count(*) FILTER (WHERE last_contact ~ '^[0-9]{4}-') AS looks_iso,
  count(*) FILTER (WHERE last_contact IN ('Práve vytvorený','Bez kontaktu','Práve importovaný')
                   OR last_contact ILIKE 'Práve%') AS looks_label,
  count(*) FILTER (WHERE last_contact IS NULL OR btrim(last_contact) = '') AS empty_or_null
FROM public.leads
WHERE agency_id = :agency_id;
```

**FAIL oblasti 2** stojí na kóde, nie na PROD počtoch: C1 sa nedá spočítať z jedného stĺpca bez lži.

---

## 3) Deal outcomes a reakcie makléra na odporúčania

### Deal outcomes (FAKT)

- Tabuľka: `apps/crm/supabase/migrations/20260726120000_moat_capture_blok_b.sql` (commit `4057d02d`, `#328`)
  - `outcome IN ('won','lost')`, `reason_code NOT NULL`, `closed_at timestamptz`, RLS tenant + service_role
- Zápis: `logDealOutcome` → `persistDealOutcome` z `PATCH /api/leads/[id]` pri terminálnom statuse `Uzavretý`/`Stratený` (`mapLeadStatusToDealOutcome`)
- Fire-and-forget, swallow error; gate `CAPTURE_ENABLED` default **ON** (`capture-config.ts`)
- Unique na `(agency_id, lead_id, outcome)` **nie je** — dvojité uzavretie = dva riadky
- Loop 2 Genome: `resolveOpenDecisionsForLead` píše `exclusivity_outcomes` + `decisions.status='resolved'` cez **service-role** (`outcomeWriter.ts`)

Čítanie: `operator/gather.ts`, `platform-heartbeat.ts` (count 24h). Žiadny iný writer v `apps/crm/src` okrem moat helpera + lead PATCH.

### Realtor reaction accepted/rejected next_action (FAKT → FAIL sémantiky)

Hľadané `next_action` v CRM: **nie je** stĺpec accepted/rejected next_action.

Čo existuje namiesto toho:

| Mechanizmus | Statusy | Čo to naozaj je |
|---|---|---|
| `moat_ai_recommendations.status` | `shown` / `accepted` / `rejected` / `expired` | capture log; `acted_at` pri update |
| `PATCH /api/recommendations/[id]` | volá `captureAiRecommendationReaction` | mapovanie **`active` → accepted, `inactive` → rejected** (riadky 88–97). To nie je „prijal som next action“. |
| `ai_recommendations` (CRM NBA UI) | `active` / `inactive` | iná tabuľka než moat capture |
| `lead_property_matches.status` | vrátane `rejected` | matching, nie deal/next_action |
| `call-analysis.nextAction` | voľný text | žiadny accept/reject persist |
| `public.events` typy | `ai_suggestion_shown/accepted/dismissed` | enum v `types/events.ts`; nie je dôkaz, že contact/recommendation route ich zapisuje ako realtor next_action |

`insertMoatAiRecommendationRow` má dedupe unique na `dedupe_key` (scoped `agencyId:key`). Reakcia matchuje ten istý kľúč. Ak sa `shown` riadok nevytvoril (iný hash title), `accepted` update ticho zasiahne 0 riadkov.

### SQL — PASS keď

```sql
-- 3A. Tabuľky
SELECT to_regclass('public.deal_outcomes') AS deal_outcomes,
       to_regclass('public.moat_ai_recommendations') AS moat_ai_recommendations,
       to_regclass('public.exclusivity_outcomes') AS exclusivity_outcomes,
       to_regclass('public.decisions') AS decisions;
-- PASS: štyri non-null.

-- 3B. Naplnenie (tenant)
SELECT
  (SELECT count(*) FROM public.deal_outcomes WHERE agency_id = :agency_id) AS deal_outcomes,
  (SELECT count(*) FROM public.deal_outcomes WHERE agency_id = :agency_id AND closed_at > now() - interval '30 days') AS deal_outcomes_30d,
  (SELECT count(*) FROM public.moat_ai_recommendations WHERE agency_id = :agency_id) AS moat_shown_all,
  (SELECT count(*) FROM public.moat_ai_recommendations WHERE agency_id = :agency_id AND status = 'accepted') AS moat_accepted,
  (SELECT count(*) FROM public.moat_ai_recommendations WHERE agency_id = :agency_id AND status = 'rejected') AS moat_rejected,
  (SELECT count(*) FROM public.exclusivity_outcomes WHERE agency_id = :agency_id) AS genome_outcomes,
  (SELECT count(*) FROM public.decisions WHERE agency_id = :agency_id AND status = 'open') AS decisions_open;
-- PASS slučky: deal_outcomes_30d a (moat_accepted+moat_rejected) > 0 pri reálnej práci kancelárie.
-- 0/0/0 = kód bez stopy — NIE dôkaz, že maklér nič neuzavrel (mohol ísť len cez last_contact/status bez reason).

-- 3C. Duplicitné uzavretia
SELECT lead_id, outcome, count(*) AS n
FROM public.deal_outcomes
WHERE agency_id = :agency_id
GROUP BY lead_id, outcome
HAVING count(*) > 1;
-- PASS: 0 riadkov.
```

**FAIL oblasti 3:** closed-loop „maklér prijal/odmietol next_action“ v schéme ako taký **nie je**. Moat tabuľka to imituje iným významom.

---

## 4) Tenant isolation

### RLS v repe (FAKT)

- Testovacia sada: `apps/crm/tests/rls/rls-tenant-isolation.test.ts` nad `TENANT_TABLES` — **58** tabuliek, z toho 4 `serviceRoleOnly`.
- Historický report `apps/crm/docs/audit/RLS-ISOLATION-REPORT.md` je z **2026-06-16** (62 tabuliek vtedajšieho registra). **Nie je** aktuálny PROD stav.
- `ENABLE ROW LEVEL SECURITY` je v migráciách na väčšine CREATE TABLE.
- Null-escape na `lead_events` (a 9 ďalších) zatvára `20260928070000_rls_null_escapes.sql` — **ak je aplikovaná**. Pôvodná politika `20260418`/`20260419` mala `agency_id IS NULL OR …` (globálne čitateľný NULL riadok).
- `20261001160500_tenant_isolation_wall.sql` — hlavička tvrdí aplikovanie v PROD 2026-10-01; **neoverené v tomto turne**.

### Medzery v repe (FAKT → FAIL)

1. **Register nie je úplný.** Chýbajú (majú `agency_id` / tenant význam, nie sú v `TENANT_TABLES`): `lead_demands`, `demand_property_matches`, `lead_signals`, `inbound_mail_outcomes`, `inbound_mailboxes`, `lead_assignment_rules`, `buyer_intents`, `account_signups`, `pipeline_moves`, `agency_gmail_inbound_seen`, acquisition_* , `ai_generations`, `lead_consents`, …
2. **`credit_redemption_codes`** (`20260615000000`): `redeemed_by_agency` FK, **žiadny** `ENABLE ROW LEVEL SECURITY` v jej migrácii.
3. **`decisions` / `exclusivity_outcomes`**: RLS ON, politiky iba `FOR ALL TO service_role USING (true)`. Authenticated tenant policy **nie je** v `20260817120000_rename_genome_layer2.sql`.
4. **`lead_events.agency_id`** ostáva nullable (`ON DELETE SET NULL` v `20260418`).
5. **Service-role v routes:** desiatky `createAdminClient()` / `createServiceRoleClient()` (crony, inbound, contact-attempt event copy, listing, billing, playbook, …). RLS sa na service-role nevzťahuje — izolácia = filter v aplikácii. Contact-attempt to priznáva explicitne.

CI RLS v tomto VM sa nespúšťalo (žiadny TEST Supabase v audite).

### SQL — PASS keď

```sql
-- 4A. Tenant tabuľky bez RLS
SELECT c.relname AS table_name, c.relrowsecurity AS rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND (
    EXISTS (
      SELECT 1 FROM information_schema.columns col
      WHERE col.table_schema = 'public' AND col.table_name = c.relname
        AND col.column_name IN ('agency_id')
    )
  )
  AND c.relrowsecurity = false
ORDER BY 1;
-- PASS: 0 riadkov (okrem vedome platform tabuliek, ktoré agency_id nemajú ako tenant kľúč).
-- Ak padne credit_redemption_codes: FAIL (v repe RLS na nej nie je).

-- 4B. RLS ON, nula politík (fail-closed info vs diera)
SELECT c.relname,
       c.relrowsecurity,
       count(p.policyname) AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = c.relname
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
GROUP BY 1, 2
HAVING count(p.policyname) = 0
ORDER BY 1;
-- Interpretácia: 0 politík + RLS ON = deny-all pre anon/authenticated (OK ak service_role only).
-- Nie je to automaticky diera.

-- 4C. Politiky s NULL vetvou (únik)
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    coalesce(qual, '') ILIKE '%agency_id IS NULL%'
    OR coalesce(with_check, '') ILIKE '%agency_id IS NULL%'
  )
ORDER BY 1, 2;
-- PASS po 20260928070000 + wall: 0 riadkov na tenant tabuľkách.
-- Ak ostane lead_events_tenant s IS NULL: FAIL (20260419 ešte žije, null-escape neaplikovaný).

-- 4D. Cross-tenant smoke (dva tenanty, číta authenticated user A — spusti ako ten user, NIE service_role)
-- Tento blok je návod, nie príkaz pod service_role.
-- SELECT count(*) FROM leads WHERE agency_id = :agency_B;
-- PASS: 0.
```

**FAIL oblasti 4** z kódu/migrácií. PROD applied set = **UNKNOWN** (sql 4A–4C).

---

## 5) North Star 2027–2030 vs reálne tabuľky

Zdroj: `docs/architecture/north-star-2027-2030.md` (r4). Dokument má **4 loopy**, nie katalóg SQL metrík. Operačný merací balík je **iný súbor**: `scripts/sql/north-star-day.sql`.

| Loop / metrika v dokumente | Tabuľky v repe | Spočítateľné bez lži? |
|---|---|---|
| 1 Revenue: % leadov kontaktovaných do 24h (C1) | `lead_events.occurred_at` (ak substrát žije) **alebo** `leads.last_contact_at` **alebo** text `last_contact` | **NIE** — tri stopy, C1 adapter číta len `contact_attempted`+`occurred_at`; `last_contact` je text default „Práve vytvorený“ |
| 1 Revenue: konverzia pipeline | `leads.status` (`Uzavretý` / `Stratený` / …) | **ČIASTOČNE** — status žije; `north-star-day.sql` closed_won filtruje `('Uzavretý','closed_won')` (druhý label sa v enum UI nepoužíva) |
| 1 Revenue: Follow-up Agent draft-only | `activities`, `outbound_messages`, follow-up draft routes | **ČIASTOČNE** (návrhy áno, odoslanie historicky 0 — snapshot, nie toto meranie) |
| 2 Learning: Prediction Registry | `decisions` | **ÁNO** (tabuľka v `20260817120000`) |
| 2 Learning: Genome outcomes | `exclusivity_outcomes` | **ÁNO** schéma; closed-loop závisí od writerov v §3 |
| 2 closed-loop KPI | join decisions ↔ exclusivity_outcomes | **ÁNO** schéma, **UNKNOWN** naplnenie |
| 3 Network / Knowledge Monopoly | — | **NIE** — dokument sám: nemožné pred zákazníkom #2 |
| 4 Evolution / Genome Factory auto-deploy | — | **NIE** — smer, nie tabuľka |

`north-star-day.sql` počíta iné veličiny (`realvia_webhook_logs`, `leads` portal:*, `buyer_intents`, `lead_property_matches`, `activities` viewings-by-ILIKE, `routine_notifications`) **bez `agency_id` filtra** — platformový súčet, nie tenant North Star.

### SQL — čo z Loop 1/2 vôbec ide spočítať

```sql
-- 5A. C1 za 24h (tenant) — len ak 1B prešlo
WITH bounds AS (
  SELECT now() - interval '24 hours' AS t0, now() AS t1
)
SELECT
  count(*) FILTER (WHERE l.created_at >= (SELECT t0 FROM bounds)) AS leads_created_24h,
  count(*) FILTER (
    WHERE l.created_at >= (SELECT t0 FROM bounds)
      AND EXISTS (
        SELECT 1 FROM public.lead_events e
        WHERE e.agency_id = l.agency_id
          AND e.lead_id = l.id
          AND e.type = 'contact_attempted'
          AND e.occurred_at IS NOT NULL
          AND e.occurred_at <= l.created_at + interval '24 hours'
      )
  ) AS contacted_within_24h
FROM public.leads l
WHERE l.agency_id = :agency_id;
-- PASS výpočtu: query behží (stĺpec occurred_at existuje).
-- Číslo je C1 LEN pre lead_events cestu. Nemiešať s last_contact_at.

-- 5B. Loop 2 kalibrácia
SELECT
  count(*) FILTER (WHERE status = 'open') AS open_decisions,
  count(*) FILTER (WHERE status = 'resolved') AS resolved_decisions
FROM public.decisions
WHERE agency_id = :agency_id;
-- PASS schémy: query behží. PASS slučky: resolved > 0 a existuje matching exclusivity_outcomes.
```

**FAIL oblasti 5:** North Star z `north-star-2027-2030.md` sa **nedá** spočítať ako jedna pravda z existujúcich tabuliek. Časť Loop 1/2 je schema-ready, Loop 3/4 nie, C1 je rozbitý dual-write.

---

## SQL zoznam (všetky SELECT, s tenant filtrom kde treba)

| ID | Účel | PASS očakávanie |
|---|---|---|
| 1A | `schema_migrations` verzia `20260924060000` | 1 riadok |
| 1B | stĺpce `lead_events` substrátu | 6 riadkov, `occurred_at` timestamptz |
| 1C | index `idx_lead_events_contact_attempt` | 1 riadok |
| 1D | CHECK channel/outcome/source | 3 constraints |
| 2A | `leads.last_contact` vs `last_contact_at` typy | text + timestamptz |
| 2B | počty C1 vs `last_contact_at` | interpretačné, nie binárne |
| 2C | duplicitné `contact_attempted` | 0 pre idempotentný PASS |
| 2D | ISO vs label v `last_contact` | diagnostika |
| 3A | `to_regclass` 4 tabuliek | 4 non-null |
| 3B | counts deal/moat/genome | >0 pri živej slučke |
| 3C | duplicitné deal_outcomes | 0 |
| 4A | tenant tabuľky bez RLS | 0 |
| 4B | RLS ON, 0 politík | inventúra fail-closed |
| 4C | `agency_id IS NULL` v politikách | 0 na tenant tabuľkách |
| 4D | cross-tenant SELECT ako user A | 0 riadkov B |
| 5A | C1 24h z `occurred_at` | query nepadne; nemiešať zdroje |
| 5B | Loop 2 open/resolved | query nepadne |

Parameter `:agency_id` = UUID agentúry. Bez neho sú 2B/2C/2D/3B/3C/5A/5B platformové súčty.

---

## Kontrolór (na tento audit)

| Tvrdenie | Nálepka | Verdikt |
|---|---|---|
| Migrácia `20260924060000` je v PROD | NEZNÁME | UNKNOWN — chýba 1B z tohto turnu |
| C1 sa dá dnes spočítať | FAKT (kód) | FAIL — tri stopy |
| Maklér accept/reject next_action sa nahráva | FAKT (kód) | FAIL — iný význam |
| Každá tenant tabuľka má RLS v PROD | NEZNÁME | overlay UNKNOWN; repo FAIL |
| 78/139 migrácií v PROD | historický FAKT 2026-10-20 preflight | **nepoužiť ako aktuálne** |
| Loop 3/4 sú merateľné | FAKT (dokument) | FAIL |

---

## Čo tento audit nerieši

- Aplikovanie akejkoľvek migrácie.
- Zmenu zapisovateľov.
- Auth voči Supabase MCP.
- PR #892 (samostatný súbor `docs/audit/2026-10-20-pr892-review.md`).
