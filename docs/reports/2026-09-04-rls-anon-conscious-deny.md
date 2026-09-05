# RLS post-apply — vedomé stavy a drift nález

**PR:** #533 `security/rls-anon-audit`  
**Prod:** founder re-check = match (jediná otvorená anon: `onboarding_sessions`)

## Vedomý stav: `integration_settings`

| Fakt | Hodnota |
|---|---|
| RLS | enabled |
| Politik | 0 (plný deny) |
| Riadkov | 0 |
| Referencie v `apps/crm/src` | 0 |
| Záver | IMAP/nastavenie schránky nikdy nebolo wired; deny je zámerný end-state tejto vlny |

Keď sa IMAP oživí: tenant/profile-scoped RLS + server-side path v **novom** PR.

## Drift nález: `lead_assignment_rules.agency_id`

| Fakt | Hodnota |
|---|---|
| Kód | `apps/crm/src/app/api/automation/rules/[id]/route.ts:19` `.select("agency_id")` |
| Prod stĺpce | `id, name, rule_type, profile_ids, criteria, is_active, created_at` |
| Chyba | `42703` undefined_column |
| Vzťah k DROP | Funkcia rozbitá **pred** deny; 0 riadkov |
| Kam | Brief 17 vlna 1 (migračný drift); poznámka v `TASK-RLS-ONBOARDING-SESSION` |

## Ďalší krok

`TASK-RLS-ONBOARDING-SESSION` — scoped policy / API pre `session_id` (GO REQUIRED).
