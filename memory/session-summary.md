## Session 2026-05-24 — Realvia L99 doplnenie

### Dokončené
- **Inbound diagnostics** — `apps/crm/src/lib/realvia/inboundDiagnostics.ts`, Vitest `inboundDiagnostics.test.ts`, GET `?diag=config` (+ CRON Bearer) na `route.ts`; hint pre prod len `REALVIA_SHARED_SECRET` vs Realvia párované hlavičky.
- **Krizový brief** — `apps/crm/docs/REALVIA-REVOLIS-CRISIS-TEAM-BRIEF.md` (+ postup „neznáma chyba X“).
- Vitest `src/lib/realvia`: **19 passed** (4 súbory).

### Pending (operácia mimo kódu)
- Nasadiť migráciu `20260523183000_resolve_agency_id_for_realvia_rpc.sql` na Supabase (ak ešte nie).
- Push commity na `origin`; preview + smoke podľa L99.

### Kľúčové cesty
- `apps/crm/src/app/api/webhooks/realvia/route.ts`
- `apps/crm/src/lib/realvia/resolveAgency.ts` + migrácia RPC
- `apps/crm/docs/REALVIA-REVOLIS-CRISIS-TEAM-BRIEF.md`

### Ďalší krok
Dva oddelené PR: (1) inbound diag + dokument, (2) agency RPC migrácia + `resolveAgency`.

---

## Session 2026-05-23 — dokumentácia / agency

### Dokončené (história)
- L99 dokumenty (`L99-master-prompt.md`, routing skill, Ruflo orchestration …), Project Rules `.mdc`.

### Poznámka
Staršie línie „Session ended“ odstránené pri údržbe tohto súboru.
