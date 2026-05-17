# Corrected Prompt for Space UI Dashboard (Current Repo Safe Version)

Use this version instead of the old one.  
It is adjusted to the current repository state (dirty worktree, existing dashboard at `src/app/(dashboard)/dashboard/page.tsx`, existing layout at `src/app/(dashboard)/layout.tsx`).

---

You are a staff-level full-stack engineer.
Project is deployed on Vercel. Live URL: https://app.revolis.ai/dashboard
Stack: Next.js App Router, React 18, Tailwind, TypeScript, Supabase.

MISSION: Transform `/dashboard` into a "Living Space UI" visual layer.
Do NOT break data fetching, auth, or Supabase queries.
Enhance visuals and interactions only.

## STEP 0 — SAFE START (NO STASH/NO RESET)

Because worktree is not clean, DO NOT run stash or reset.

1. `git checkout -b feature/space-ui-dashboard`
2. Confirm branch via `git branch --show-current`
3. Continue without altering unrelated pending changes.

## STEP 1 — DEPENDENCIES

Run in `C:\RealitkaAI\apps\crm`:

```powershell
npm install framer-motion three zustand @types/three
```

## STEP 2 — NEW FILES

Create:

- `src/components/space/SpaceBackground.tsx`
- `src/components/space/AIPulseSystem.tsx`
- `src/store/aiActivityStore.ts`
- `src/hooks/useMockAIActivity.ts`
- `src/hooks/useSpaceInteractions.ts`
- `src/components/layout/SpaceHeader.tsx`

Rules:

- all client components include `"use client";`
- reduced-motion support must disable animation loop
- cleanup all listeners/timers/raf/three resources on unmount

## STEP 3 — DASHBOARD INTEGRATION (REAL FILE PATHS)

Enhance:

- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/layout.tsx`
- (if needed) `src/components/layout/topbar.tsx`

Integrations:

- add `SpaceBackground` (dynamic import with `ssr: false` in layout)
- add `AIPulseSystem` to dashboard page
- add `useMockAIActivity()` in dashboard page (development only)
- glassmorphism classes on existing metric cards
- count-up animation for KPI numbers
- framer entrance motion wrapper for page

## STEP 4 — CSS TOKENS

Add to global CSS:

- `--space-bg`, `--space-surface`, `--space-border`, `--space-accent`, `--space-glow`
- keyframes: `nebulaPulse`, `scanline`, `statusPulse`, `logoPulse`

## STEP 5 — QUALITY GATE

Run:

```powershell
npm run build
```

If build fails, fix all TypeScript/build errors before next step.
No `@ts-ignore`.

## STEP 6 — COMMIT + PUSH (feature branch only)

```powershell
git add -A
git commit -m "feat(space): living space UI dashboard visuals and interactions"
git push -u origin feature/space-ui-dashboard
```

## STEP 7 — VERCEL DEPLOY FLOW

1. Validate Preview deployment from feature branch.
2. After QA pass, merge feature branch -> `main`.
3. Vercel auto-deploys production.

## CRITICAL RULES

- NEVER force push
- NEVER push directly to `main`
- NEVER remove existing Supabase queries/auth guards
- DO NOT revert unrelated local changes

Final response after deploy:

`space-ui-dashboard-v1 tagged`

