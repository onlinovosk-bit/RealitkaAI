# Memory Engine V1 runbook

## Safety contract

Memory Engine runs locally or in pull-request CI. It reads tracked repository files
only. It does not connect to Gmail, trackers, n8n Cloud, Supabase, Vercel, customer
systems, or production. It has no scheduler and no outbound communication.

`memory/decisions.md` remains canonical. Files under `brain/registry`,
`brain/decisions`, `brain/audits`, and `brain/learning` are generated views.

## Normal operation

Run from the repository root with Node 20 or newer:

```powershell
npm ci
npm run brain:typecheck
npm run brain:test
npm run brain:ingest
npm run brain:check
npm run brain:audit
npm run brain:audit
npm run brain:weekly
```

The second identical audit demonstrates delta stability: no added or resolved
finding and every current finding listed as unchanged.

Default outputs:

- `brain/registry/index.json`
- `brain/decisions/index.json`
- `brain/audits/YYYY-MM-DD.json`
- `brain/audits/YYYY-MM-DD.md`
- `brain/learning/YYYY-Www.md`

Use temporary output in CI or experiments:

```powershell
npm run brain:ingest -- --brain-root C:\tmp\revolis-brain
npm run brain:audit -- --brain-root C:\tmp\revolis-brain --output-dir C:\tmp\revolis-audit
npm run brain:weekly -- --audit-dir C:\tmp\revolis-audit --output-dir C:\tmp\revolis-learning
```

## Review protocol

1. Review validation errors first. They indicate malformed or conflicting Brain
   records and should block the Memory Engine change.
2. Review warnings next. Confirm missing sources and due outcomes with the owner.
3. Treat advisory findings as investigation prompts, never deletion instructions.
4. Follow each evidence path before changing code or canonical documentation.
5. Update the canonical source, then regenerate derived views.
6. Merge and production actions remain founder gates even when all checks pass.

## Failure recovery

| Symptom | Cause | Recovery |
|---|---|---|
| `brain:check` reports changed files | Generated indexes are stale | Run `brain:ingest`, review the diff, rerun tests |
| Validation error | Invalid field, duplicate ID, missing relation, or sensitive pattern | Fix the catalog or source mapping; do not edit generated JSON by hand |
| Source is `uncommitted` | The source is not versioned | Ask its owner whether it should be approved and committed; do not auto-stage it |
| Many missing routes | Historical docs or route heuristic mismatch | Verify manually; lower confidence or update the canonical doc |
| Audit has no predecessor | First run | Run it again to create an unchanged delta baseline |
| Weekly generation fails | No audit JSON exists | Run `brain:audit` first |
| `tsx` cannot spawn locally | Restricted process sandbox | Run the approved npm command in the normal developer shell |

Generated indexes and reports can be reconstructed with the commands above. Never
delete or rewrite `brain/ENGINE.md`, `memory/decisions.md`, architecture documents,
or migrations as a recovery shortcut.

## Privacy and incident handling

The loader rejects high-confidence secret and personal-email patterns in generated
JSON. The ingest uses Git's tracked-file list and stores only paths, counts, hashes,
and curated summaries. If sensitive content appears, stop, remove it from the
working tree and staging area, rotate any exposed secret, and follow the incident
process. Do not preserve the value in an audit report.

## CI

Pull-request CI runs typecheck, tests, temporary ingest, and an advisory audit. The
audit step cannot fail the product build and uploads its report as an artifact. No
CI job schedules recurring work or receives production secrets.
