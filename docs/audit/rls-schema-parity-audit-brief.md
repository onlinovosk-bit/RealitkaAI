# BRIEF — RLS + Schema-Parity Audit (read-only)
Repo: `C:\RealitkaAI` · cieľový path: `docs/prompts/rls-schema-parity-audit-brief.md`
Účel: uzavrieť jedným ťahom dieru, na ktorú narazili CEO Command aj W-LEADS — RLS politiky + parita repo↔prod schémy. Žiadny feature. Výstup = matica + pomenovaný PR backlog, nie migrácie.

```yaml
task: rls-schema-parity-audit
reads:  [pg_catalog, pg_policies, rls_audit_snapshot, migrations/, public-schema-allowlist.json, api_routes_grep]
writes: [apps/crm/docs/audit/rls-schema-parity-matrix.{json,md}, gap PR backlog v tom istom MD]
migrations: false
requires: [service_role READ-ONLY]
risk: low (read-only audit)
exit: zero P0 gaps OR explicit signed exception riadok per tabuľka
```

## HARD pravidlá
- **READ-ONLY.** Žiadny INSERT/UPDATE/DELETE/migrácia/policy zmena. service_role len na čítanie katalógov a politík.
- **Žiadne čítanie zákazníckych riadkov.** Audit pozerá schému, RLS a politiky — nie dáta leadov/klientov. Žiadne PII do reportu.
- Reuse existujúcej infra: `rls_audit_snapshot()` RPC, `scripts/schema-governance-guard.mjs`, `tests/rls/`, `RLS-ISOLATION-REPORT.md`, AP-019 v `memory/decisions.md`.

## MATICA — riadok per tabuľka v `public`
| Stĺpec | Zdroj |
|---|---|
| rls_enabled | rls_audit_snapshot() |
| policies (S/I/U/D) | pg_policies — ktoré príkazy majú policy |
| tenant_policy_ok | policy reálne scopuje cez `profile_agencies_for_auth()` (nie len existuje) |
| in_repo_migrations | grep `apps/crm/supabase/migrations/` |
| on_prod | rls_audit_snapshot() vs repo → drift áno/nie |
| in_allowlist | `public-schema-allowlist.json` (AP-019) |
| app_write_paths | grep API routes → scoped server client / browser singleton / service_role |
| severity | rubrika nižšie |

## DVA FAILURE MODY — flagni OBA (nie len jeden)
1. **RLS on + chýba policy** → deny-all, čítanie/zápis padá (trieda CEO/W-LEADS). Funkčný bug.
2. **RLS off na tenant tabuľke** → leak medzi agentúrami. Dnes latentné (1 zákazník + demo), ale **P0 v momente zákazníka #2.** Forward-looking severita.

## POLICY CORRECTNESS (nie len existencia)
`tenant_policy_ok = false`, ak policy existuje, ale je permisívna (`using(true)`/bez agency scope) na tenant tabuľke — to je falošný pocit bezpečia, **P0.**

## APP WRITE PATHS (zovšeobecnenie W-LEADS bugu)
Každá authenticated write route, čo ide cez **browser singleton / unscoped client** namiesto scoped server client → latentný W-LEADS-class bug. Flagni ako P0, ak route je live.

## SEVERITY RUBRIKA
- **P0:** live route + (RLS-on bez/zlej policy) ALEBO repo↔prod drift ALEBO write cez unscoped client ALEBO tenant tabuľka s `using(true)`.
- **P1:** RLS-on bez policy / allowlist gap / drift na tabuľke, ktorú zatiaľ žiadna live route nepoužíva (latentné).
- **P2:** non-tenant / dokumentačné / RLS-off tabuľky bez PII.

## EXIT
Matica nesmie mať P0 riadok. Buď je P0 vyriešené (cez backlog PR nižšie), alebo má tabuľka **podpísaný exception riadok** (tabuľka + dôvod + kto + dátum) v MD. Žiadne tiché P0.

## VÝSTUP (konkrétny, nie esej)
1. `apps/crm/docs/audit/rls-schema-parity-matrix.json` + `.md`.
2. Pomenovaný PR backlog v MD, zoradený podľa severity, napr.:
   - `fix/rls-enrichment-log` (ak chýba policy)
   - `fix/leads-insert-policy` (ak Krok 0 W-LEADS ukázal chýbajúcu)
   - `fix/allowlist-gap-*` (drift tabuľky mimo allowlistu)
   - `fix/resolveTenantSupabase-audit` (unscoped write paths)
   - `fix/ci-ap019-guard` — rozšíriť `schema-governance-guard.mjs`: CREATE TABLE v migrácii bez allowlist+policy+verification testu v tom istom PR → **fail CI**. (kódový PR, nie súčasť tohto read-only auditu)

## SEKVENCIA PO AUDITE
Audit je read-only → môže bežať paralelne s W-LEADS hotfixom. Remediačné PR z backlogu sú write/migrácie → sekvenčne, každý vlastný PR + tvoj GO. Feature vetvy (enrichment, portály, lead capture) stoja, kým P0 matica nie je prázdna.
