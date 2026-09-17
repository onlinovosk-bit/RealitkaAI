# Launch record — `2026-09-17-north-star-measurement-loop`

**Status: `LAUNCH_AUTHORIZED`**

| Pole | Hodnota | Poznámka |
|---|---|---|
| `package_path` | `docs/overnight/2026-09-17-north-star-measurement-loop/` | |
| `status` | `LAUNCH_AUTHORIZED` | Founder GO 2026-09-15 (chat) |
| `scope` | `measurement` | **nie** `implementation` — beh nemení produkčný kód |
| `start_at` | `2026-09-15T19:55:00+02:00` | |
| `deadline_at` | `2026-09-16T08:00:00+02:00` | tvrdý; W2/PR po founder batch |
| `db_access_mode` | `founder_batch` | **B** — `SUPABASE_READONLY_URL` chýba; bezpečný default |
| `SUPABASE_READONLY_URL` | _(nepoužité)_ | režim B |
| `provider_policy` | `subscription-only` | |
| `daily_cap` | `USD 5/deň, tvrdý stop` | |
| `runner` | `cursor-agent / Composer` | worktree `C:\RealitkaAI-run\lane-A` |
| `models` | `claude-opus-5` | eskalácia vypnutá |
| `backfill_from` | `2026-08-17` | |
| `backfill_to` | `2026-09-16` | 31 iterácií |
| `max_prs_total` | **`1`** | docs-only, až vo W2 |
| `base_sha` | `1a064d0325ee571e6169e8bca7b9181a535ef094` | `origin/main` @ W0 |
| `run_id` | `2026-09-15T1955-CEST-north-star` | |
| `authorized_by` | Founder (GO chat) | |
| `authorized_at` | `2026-09-15T19:55:00+02:00` | |

## Režim prístupu

**B) `founder_batch`** — slučka vygenerovala `output/overnight/<RUN_ID>/control/queries-to-run.sql`.
Founder spustí raz (read-only / SQL editor) a uloží výsledok ako
`output/overnight/<RUN_ID>/control/results.json`. Potom GO na dokončenie LOOP+W2.

## Brány

1. `db_access_mode` = `founder_batch` ✓
2. Žiadny service-role kľúč ✓
3. Agent neautoruje SQL počas slučky — jediný súbor `scripts/sql/north-star-day.sql` ✓
4. `deadline_at` tvrdý ✓

## Podpis foundera

```
Autorizujem north-star measurement loop, rozsah measurement, režim prístupu B (founder_batch).
Beriem na vedomie, že beh číta produkciu iba cez SELECT a vyrobí najviac jeden docs-only PR.

meno / dátum / čas s offsetom: Founder GO · 2026-09-15T19:55:00+02:00
```
