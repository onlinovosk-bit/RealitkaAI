# Config changelog (non-git production changes)

One row per production config / env change that can affect measured north-star
metrics. **Not** sourced from git merges — humans (or Vercel API) append here.

North-star day rows load `config_changes_that_day` from this file by calendar
date (`at` in Europe/Bratislava). Without a dated key here, attribution is guesswork.

| date (Europe/Bratislava) | at (ISO, approx OK) | kind | key | effect / note | recorded_by |
|---|---|---|---|---|---|
| 2026-09-10 | 2026-09-10T20:00:00+02:00 | vercel_env | FOUNDER_EMAILS | Fixed notification-digest recipients. `unread_at_eod` fell 165 → 1 on first digest run ~2026-09-11 07:15. First measurable prod effect in the 31-day north-star window attributable to a concrete intervention — invisible to `merged_prs_that_day`. | founder |

## How to append

1. Add one table row (do not edit history except to correct factual error).
2. Prefer exact `at` from Vercel dashboard; if unknown, use evening/morning approx and say so in `effect / note`.
3. After append, next north-star day measurement (or re-batch) picks it up into `config_changes_that_day`.
