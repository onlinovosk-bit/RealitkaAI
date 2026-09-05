# Launch record — Ruflo overnight 2026-09-05

**Status: `NOT_LAUNCHED`**

Fill every field below before W0. Empty values are not authorization.
Do not invent start times, deadlines, or spend caps. Copy to a run-local `launch-record.md` when filled; keep this template clean.

| Field | Value | Notes |
|---|---|---|
| `package_path` | `docs/overnight/2026-09-05-ruflo-swarm/` | Fixed for this prep |
| `status` | `NOT_LAUNCHED` | Change to `LAUNCH_AUTHORIZED` only after founder confirms all fields |
| `scope` | _empty_ | Default if research-only: `research_and_specs`. Implementation requires explicit founder scope + updated write-sets |
| `start_at` | _empty_ | Local datetime **with UTC offset** required |
| `deadline_at` | _empty_ | Local datetime **with UTC offset** required |
| `timezone` | `Europe/Bratislava` | Default zone; still require explicit UTC offsets on timestamps |
| `provider_policy` | _empty_ | e.g. subscription-only / allow paid API / named providers |
| `spend_cap` | _empty_ | Numeric + currency or subscription ceiling; required before dispatch |
| `runner` | _empty_ | Exact runner name/version/environment |
| `models` | _empty_ | Allowed model IDs / tiers; no silent tier upgrades |
| `base_sha` | _empty_ | Chosen at W0 after fetch proof; not auto `feat/bridge-harness` HEAD |
| `run_id` | _empty_ | Created only at W0 start under `output/overnight/<RUN_ID>/` |
| `authorized_by` | _empty_ | Founder confirmation reference |
| `authorized_at` | _empty_ | With timezone / UTC offset |

## Gates

1. If any required field above is empty → remain **`NOT_LAUNCHED`**; return prepared package; do not spend API budget.
2. Missing runner tools or spend permission → **`NOT_LAUNCHED`**.
3. W0 live run starts only after `status=LAUNCH_AUTHORIZED` and immutable inputs are ready.

## Explicit non-starts

- Automation was **not** started by the package materialization step.
- `ruflo-model-bridge` V0 is **not** the research runner.
- Dirty `feat/bridge-harness` must not be stash/reset/cleaned to make room.
