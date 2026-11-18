# Control Tower ledger repair — PROD

**GO:** Founder 16. 11. 2026, 11:41 UTC — `GO: oprav Control Tower ledger`.
**Projekt:** Supabase `ypgajkhqtbriqqmyawyv`.
**Rozsah:** dva INSERT-y do `supabase_migrations.schema_migrations`. Žiadne DDL, žiadne snapshoty, žiadne percentá.

DDL (`20261116120000`, `20261116140000`) founder aplikoval cez SQL editor. Ledger ich nemal.

## Preflight (read-only, tento turn)

| Meranie | Hodnota |
|---|---|
| agencies / leads / properties | 7 / 526 / 177 |
| ledger_count / ledger_max | 136 / `20261022100000` |
| `20261116120000` + `20261116140000` v ledgeri | 0 |
| `ai_quota_pools` / `snapshots` / `usage_entries` / `alert_firings` | existujú |
| `ai_quota_snapshots` RLS | true |
| `ai_quota_pools_identity` | UNIQUE (provider, account_ref, quota_window) |
| subscription stĺpce na snapshots | 6 (`account_ref`, `quota_window`, `used_percent`, `remaining_percent`, `captured_at`, `reset_timezone`) |
| duplicitné pool identity | 0 |
| pools / snapshots riadky | 0 / 0 |

`list_migrations` končil na `20261022100000` / `email_suppressions`. PK ledgera: `PRIMARY KEY (version)`.

## Izolovaný test (docker `revolis-subcap-pg`, DB `ledger_repair_test`, nie PROD)

- Prvý INSERT: `INSERT 0 2`, count 3.
- Druhý INSERT (`WHERE NOT EXISTS`): `INSERT 0 0`, count ostal 3.
- Priamy duplicitný INSERT: `unique_violation PASS`.
- `ON_ERROR_STOP=1` exit 0.

## ROLLBACK dôkaz na PROD

`DO $$ … RAISE EXCEPTION 'rollback_proof_ok ledger=% target=%', n, t; $$`

MCP: `ERROR P0001: rollback_proof_ok ledger=138 target=2`.

Po abort: ledger 136, target 0, 7/526/177.

## Zápis (COMMIT)

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
SELECT v.version, v.name, ARRAY[]::text[], NULL
FROM (VALUES
  ('20261116120000', 'ai_control_tower'),
  ('20261116140000', 'ai_quota_subscription_capacity')
) AS v(version, name)
WHERE NOT EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations m WHERE m.version = v.version
);
```

## Dôkaz po zápise

| Meranie | Pred | Po |
|---|---|---|
| ledger_count | 136 | **138** |
| ledger_max | `20261022100000` | **`20261116140000`** |
| target rows | 0 | **2** (`ai_control_tower`, `ai_quota_subscription_capacity`) |
| agencies / leads / properties | 7 / 526 / 177 | 7 / 526 / 177 |
| pools / snapshots | 0 / 0 | 0 / 0 |
| snapshots RLS | true | true |

Druhý INSERT: `still_two = 2` (0 nových riadkov). `list_migrations` obsahuje obe verzie.

## Mimo rozsahu

Merge tohto PR, production deploy, ďalšie DDL, zápis snapshotov, Stripe krok C.

## Rollback

```sql
DELETE FROM supabase_migrations.schema_migrations
WHERE version IN ('20261116120000', '20261116140000');
```

Tabuľky Control Tower **nemaže**. Ledger po DELETE by znova tvrdil, že migrácie nie sú.
