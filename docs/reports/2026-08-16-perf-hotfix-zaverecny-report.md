# Perf hotfix + schema drift — záverečný report (16.8.2026)

**Cieľová cesta v repe:** `docs/reports/2026-08-16-perf-hotfix-zaverecny-report.md`

## Výsledok

| Stránka | T1 pred | T1 po | T2 po |
|---|---|---|---|
| /dashboard | ~4 min | **9 s** | 6 s |
| /leads | 4 s | 6 s | 4 s |
| /acquisition | ~5 min (aj T2) | **4 s** | — (doplniť) |

Dáta v CRM viditeľné (Revolis Demo tenant overený: 32 príležitostí, 6 horúcich).

## Koreňové príčiny (potvrdené)

1. **Stripe reťaz** v `/api/billing/plan`: až 9 sekvenčných callov, SDK default
   80 s timeout × retry = až 240 s → 4-min dashboard T1. Fix: timeout 5 s +
   1 retry + per-user memo (TTL 5 s) + odvodenie tier/enterprise z 1 planKey.
2. **Žiadny timeout na Supabase fetchoch** (undici default 300 s) → 5-min
   visenia na mŕtvych keep-alive socketoch. Fix: `createTimeoutFetch` 8 s
   (`SUPABASE_FETCH_TIMEOUT_MS`) vo všetkých server klientoch + 5 s v proxy
   (fail-open len timeout+stránky; API vždy fail-closed).
3. **Dashboard klient**: 6 sekvenčných fetchov za jedným spinnerom → render po
   leads, panely cez Promise.allSettled, 10 s AbortSignal na každý fetch.
4. **Acquisition**: duplicitné auth round-tripy + sekvenčné selecty → Promise.all.
5. **profiles UPDATE na každý request** → throttle 1 h + skip service-role passu.

## Schema drift — ručne aplikované na prod (founder, 16.8. cez Dashboard)

Prod mal aplikovaných ~46/95 migrácií; explicitné select listy (po #425/#432)
odhalili chýbajúce stĺpce (42703):

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier_updated_at timestamptz;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS sofia_insight          text,
  ADD COLUMN IF NOT EXISTS ai_insight             text,
  ADD COLUMN IF NOT EXISTS ai_engine              jsonb,
  ADD COLUMN IF NOT EXISTS ai_priority            text,
  ADD COLUMN IF NOT EXISTS ai_reason              text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ai_triage_at           timestamptz,
  ADD COLUMN IF NOT EXISTS ai_priority_manual_at  timestamptz,
  ADD COLUMN IF NOT EXISTS last_ai_followup_at    timestamptz,
  ADD COLUMN IF NOT EXISTS ai_followup_count      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_segment         text,
  ADD COLUMN IF NOT EXISTS buyer_readiness_score  integer,
  ADD COLUMN IF NOT EXISTS assigned_profile_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active              boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_contact           text NOT NULL DEFAULT 'Práve vytvorený',
  ADD COLUMN IF NOT EXISTS note                   text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS financing              text NOT NULL DEFAULT 'Hypotéka',
  ADD COLUMN IF NOT EXISTS timeline               text NOT NULL DEFAULT 'Do 3 mesiacov',
  ADD COLUMN IF NOT EXISTS property_type          text NOT NULL DEFAULT 'Byt',
  ADD COLUMN IF NOT EXISTS rooms                  text NOT NULL DEFAULT '2 izby';
```

TODO (Cursor lane): migračný súbor s týmito ALTERmi + INSERT do
`supabase_migrations.schema_migrations` (vzor 20260811220000).

## Nasadené PR

#428 (L30 supabase timeout) · #429 (L31 proxy) · #430 (L32 acquisition) ·
#431 (L33 dashboard klient) · #432 (L34 profiles) · #434 (complement: Stripe
timeout+memo, `agency_id` v summary selecte — regresia #425, scoped
forecasting klient). Merge: výhradne founder.

## Otvorené follow-upy (poradie podľa priority)

1. **Schema-drift audit (Cursor)** — porovnať všetky stĺpce čítané/zapisované
   kódom proti reálnej prod schéme (Supabase MCP read-only introspekcia);
   guardian unique z L35 nálezu; vypísať rozdiely po tabuľkách. Kým beží drift,
   každý nový explicitný select je riziko.
2. Migračný súbor pre dnešné ručné ALTERy (viď TODO vyššie).
3. Sledovať `SUPABASE_FETCH_TIMEOUT_MS` — ak bulk import/cron padne na 8 s,
   zdvihnúť (napr. 30000) vo Verceli.
4. Doplniť T2 meranie /acquisition.
5. Backlog (nie hotfix): service worker precache SSR stránok bez timeoutu;
   memo cachuje rejected promises v profile chain; summary číta 500 riadkov
   (id,status,agency_id — zbytočné, stačí count); mŕtvy `apps/crm/middleware.ts`
   (4 verification testy naň odkazujú — cleanup v samostatnom PR).
6. Supabase Advisor: 4× CRITICAL „Security Definer View" — samostatná
   bezpečnostná vlna (nie perf).

## Poučenie

Drift 46/95 neaplikovaných migrácií = časovaná bomba: `select=*` chýbajúce
stĺpce ticho toleroval, explicitné select listy ju odpálili. Po drift-audite
zaviesť pravidlo: každý PR s novým stĺpcom v selecte musí mať overenú
aplikáciu migrácie na prod (checklist v PR template).
