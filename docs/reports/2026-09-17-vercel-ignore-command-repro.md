# 2026-09-17 — Vercel ignoreCommand correct (replaces #155)

## Verdict
Fix inverted `ignoreCommand` on **both** Vercel projects (`apps/crm`, `apps/marketing`).
Command watches `.` because Ignored Build Step runs in project Root Directory.

## Reproduction (before)
PR #155 style: `grep -qvE '^apps/crm/'` → mixed docs+crm → **SKIP (exit 0)** — wrong.

```
node scripts/vercel-ignore-command.test.mjs --mutate-bad-grep
FAIL  mixed-docs-and-crm  expect=1 got=0  cmd=BAD
MUTATION OK: mixed-docs-and-crm failed under grep -qv
```

## Fix
```json
"git": {
  "ignoreCommand": "git diff --quiet HEAD^ HEAD -- . && exit 0 || exit 1"
}
```

## Validation (measured 2026-09-17)

| ID | Command / check | Result |
|----|-----------------|--------|
| V1 | `node scripts/vercel-ignore-command.test.mjs` | **4/4 passed**, exit 0 |
| V2 | `--mutate-bad-grep` | mixed **FAIL** got=0 expect=1; harness exit 0 |
| V3 | `python -m json.tool` both vercel.json | exit 0 |
| V4 | crm `crons` vs `origin/main` | identical; only `"git"` added |
| V5 | `npm run lint` (apps/crm) | exit 0 |
| V5b | `npm run typecheck` | **48** errors (≤48 ceiling), exit 0 |
| V6 | ESCALATE below | answered from Vercel docs |

## ESCALATE (docs, not guess)

1. **cwd:** Ignored Build Step „is executed within the Root Directory“
   ([Vercel project settings](https://vercel.com/docs/project-configuration/project-settings);
   [KB](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel)).
   With Root Directory `apps/crm` / `apps/marketing`, path must be `.` not `apps/crm/`.

2. **HEAD^ / shallow:** Vercel clones with `git clone --depth=10`
   ([configure a build](https://vercel.com/docs/builds/configure-a-build)).
   HEAD^ usually exists within depth 10. If parent missing, `git diff` fails non-zero →
   our `|| exit 1` → **BUILD** (fail-safe). Note: some third-party reports claim raw exit 128
   can error the deployment; our command always normalizes to exit 1.

3. **Root package-lock.json:** CRM has own lockfile; CI uses
   `cache-dependency-path: apps/crm/package-lock.json`; crm has no workspace/file deps.
   Filter `.` is safe for source. Whether a **root** lockfile-only change can affect Vercel
   install for crm: **unknown** (depends on whether install ever resolves from monorepo root).

## Why not merge #155 as-is
`grep -qv` succeeds when **any** path is outside `apps/crm/`, so mixed commits **skip**
the build and CRM changes never deploy. Also only touches crm, not marketing (2nd quota).
