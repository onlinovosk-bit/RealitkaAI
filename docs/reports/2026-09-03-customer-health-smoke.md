# GO SMOKE — GET /api/cron/customer-health

**When:** 2026-09-03T09:53:15Z  
**URL:** `https://app.revolis.ai/api/cron/customer-health`  
**Secret:** Vercel Production `CRON_SECRET` (pulled via CLI, not committed)

## Auth

| Call | HTTP | Body |
|---|---|---|
| no `Authorization` | 401 | `error: unauthorized` |
| `Bearer definitely-wrong` | 401 | unauthorized |
| `Bearer $CRON_SECRET` | 200 | `ok: true` |

## Acceptance (Smolko)

Agency `11111111-1111-1111-1111-111111111111` **Reality Smolko s.r.o.**

| Field | Value |
|---|---|
| severity | **red** |
| isPaying | true |
| signals | `LEAD_SILENCE` — Žiadny lead 37 dní; `NEVER_LOGGED_IN_SHARE` — 92 % účtov sa nikdy neprihlásilo |
| morningLine | 🔴 Reality Smolko s.r.o. (platiaci): … |

## Persist

Response `persist.written = 4`. Prod SELECT after:

- `customer_health_daily` rows: 4 (all red)
- Smolko row: `checked_on=2026-09-03`, `severity=red`, `is_paying=true`, `signals` array length 2, `checked_at=2026-09-03 09:53:15.225+00`

Other 3 alerts exist; names not listed here.

## Verdikt

**PASS** — fail-closed auth, Smolko red + paying, row written.

Cron v `vercel.json` (`0 7 * * *`) ešte nemusel stihnúť prvý scheduled beh; tento smoke bol manuálny GET.
