## Session 2026-06-23
### Dokončené
- PR #240 merged — Guardian CTA deep-link `source_id` + edit slide-over (code-truth OK)
- PR #242 merged — vyhodenie 4 L99 governance docs (AP-012 cleanup, `e7040db88` nosič)
- `.claude/anti-style.md` — AP-012 pravidlo: `chore`/`docs` ≠ skip review
- `memory/decisions.md` — AP-012, Smolko VALIDATE CLOSED, Vlna 1+2 PROD notes

### Rozpracované / Pending
- PR #241 open — fixture-only disabled edit CTA (CI green, nezmergované)
- Guardian PROD smoke **1/5** — bod 4 nepreklepnutý; 1/2/5 manuálne
- Lemon Squeezy Share — pending blocker
- Externý cron worker (5 min) — nepotvrdený
- Tomáš / dual export Realvia + Revolis

### Kľúčové súbory zmenené
- `apps/crm/src/lib/capabilities/quality-guardian/property-edit-href.ts`: deep-link identita
- `apps/crm/docs/*` (4 governance docs removed via #242)

### Ďalší krok
PROD re-smoke bod 4 na Smolko účte; merge #241 po GO
