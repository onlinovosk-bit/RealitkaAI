# Typecheck Baseline Triage (2026-05-28)

## Snapshot command

```bash
npx tsc --noEmit
```

## Initial classification

### A) Auto-fixed now (low risk)

- `src/lib/__tests__/market-vision-features.test.ts` and related tests imported `LicenseCapability` from `capability-registry`, but the type was not re-exported.
  - Fix: re-exported `LicenseCapability` from `src/lib/license/capability-registry.ts`.
- `src/types/intelligence-hub.ts` compared `tier` against `"command"` even though `AccountTier` does not include that value.
  - Fix: removed unreachable `"command"` comparison.
- `src/lib/properties-store.ts` had a strict cast warning when mapping rows.
  - Fix: changed cast through `unknown` to satisfy strict overlap rule.

### B) Existing debt to track (at start)

- `.next/types/app/(marketing)/demo/live/page.ts` (`searchParams` shape mismatch with Next type generation).
- `.next/types/app/api/integrations/calendar/route.ts` (invalid extra export `POST_sync` in route module).

These were pre-existing baseline issues at start and are now resolved in this change set.

## Current baseline status after fixes

```bash
npx tsc --noEmit
```

Result: ✅ pass (exit code 0).

## Temporary scoped CI gate

To keep new work guarded while full baseline is red:

```bash
npm run typecheck:scoped
```

Current scope file list is pinned in `tsconfig.scoped-ci.json` and covers:

- `src/lib/ai/lead-triage-batch.ts`
- `src/app/api/cron/lead-ai-triage/route.ts`
- `src/lib/__tests__/dashboard-data.test.ts`
