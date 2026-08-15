## Session 2026-08-15

### Dokoncene
- #415 merged (STOP evidencia, nie Stage 0 PASS).
- T2 meranie: pomale je cele CRM workdesk (prefetch `/dashboard`+`/leads`, N+1 profiles).
- Perf PR `fix/crm-layout-perf`: request-scoped profile memo + prefetch={false}.

### Rozpracovane / Pending
- Preview deploy + T1/T2 po fixu na `/acquisition`, `/dashboard`, `/leads`. Founder mergne.
- Stage 0 PASS az po zelenom T1/T2 + addendum. Stage 1 nie.

### Klucove subory zmenene
- `apps/crm/src/lib/profiles/auth-profile-request-memo.ts`
- `apps/crm/src/lib/profiles/resolve-profile-for-auth.ts`
- `apps/crm/src/components/layout/AppSidebar.tsx` (+ rail/mobile/topbar/sidebar prefetch)
- `docs/reports/2026-08-15-workdesk-layout-perf.md`
- `memory/decisions.md`: D-2026-08-15-02

### Dalsi krok
Founder: preview smoke + merge perf PR. Potom cerstve T1/T2. Stage 0 PASS az potom.