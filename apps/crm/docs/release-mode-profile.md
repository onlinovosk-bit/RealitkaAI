# Release Mode Profile (Strict vs Pragmatic)

## Strict mode (recommended for stable enterprise cadence)

Release gates:
- `npx supabase db push --yes` must pass
- `npm run lint` must pass (0 errors)
- `npm run build` must pass
- smoke suite must pass
- UAT + legal + Go/No-Go sign-off must pass

Use when:
- schema and lint debt are clean
- team has runway for pre-release fixes

## Pragmatic mode (recommended for current state)

Release gates:
- `npx supabase db push --yes` must pass
- `npm run build` must pass
- smoke suite must pass
- critical security checks must pass
- known lint debt is tracked in dedicated sprint backlog

Explicit exception:
- full lint gate is temporarily waived due existing project-wide legacy lint debt
- do not waive build/smoke/security gates

Use when:
- release contains high-value fixes and lint debt is not release-specific
- immediate production readiness is required

## Active mode for this release

- Selected: **Pragmatic**
- Reason: build + smoke + security pass, while lint errors are mostly historical debt.
