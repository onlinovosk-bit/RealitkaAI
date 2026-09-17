# 03 — Human Decision Gate

The Human Decision Gate is **explicit**. Silence is not approval. A green CI is not merge GO unless Founder said merge.

## Triggers (always STOP → ask)

- Merge to `main`
- Production DB / secrets / cron / external messages
- New feature or write-set outside the active task
- Resolving a write-territory collision between tracks/agents
- Closing or overriding a prior `DECISION`
- Anything Grok frames as “just decide and ship”

## Gate packet (what Founder receives)

Founder receives **only**:

1. `task_ref` + `artifact_refs` (paths — not re-pasted bodies)
2. Typed `FINDING` / `PROPOSAL` summary (≤10 lines)
3. Exact decision question with options
4. What happens on each option (incl. STOP default)

Founder must **never** be asked to re-copy context that already exists in those paths.

## Valid Founder responses

| Token | Effect |
|---|---|
| `GO` / `GO <scope>` | Authorizes the named `ACTION` only |
| `NO-GO` | Stop; record as `DECISION` |
| `CHOOSE A` / `CHOOSE B` | Selects among listed options |
| `HUMAN` hold | Wait; no agent improvisation |

Free-form chat without one of these tokens does **not** close the gate.

## After the gate

Record `DECISION` in `.ai/bus/decisions/` or the task front matter **only when Founder tokens are present**. Executor then may emit `ACTION` + `EVIDENCE`.
