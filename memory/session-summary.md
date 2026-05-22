## Session 2026-05-22 — Realvia P0 Integration Watch

### Dokončené
- PR #58 merged — Realvia API response contract `{ result, message }`
- PR #59 merged — delete payload fix (`action: delete`, archiveType → Predaná/Prenajatá/Stiahnutá)
- PR #60 merged — unified auth error message `Invalid authentication`
- Production smoke — GET webhook 200 OK, POST auth fail contract verified
- Memory layer — `integrations.md`, `open-tasks.md`, session handoff updated

### Rozpracované / Pending
- Realvia re-test od Lýdie Bereczovej (delete sold/rent/cancel + create/update)
- Produkčný deploy PR #60 smoke (unified auth message after Vercel deploy)
- Demo funnel v5 HTML — necommitnuté, čaká schválenie
- `resolveAgency.ts` agency resolution fix

### Kľúčové súbory zmenené
- `apps/crm/src/lib/realvia/types.ts`: delete payload guard + RENTED status
- `apps/crm/src/lib/realvia/processQueue.ts`: archiveType mapping
- `apps/crm/src/lib/realvia/responses.ts`: REALVIA_AUTH_ERROR_MESSAGE
- `apps/crm/src/lib/realvia/validate.ts`: unified auth failures
- `memory/integrations.md`: NEW — integration live status
- `memory/open-tasks.md`: NEW — prioritized task queue

### Ďalší krok
Pošli Bereczovej delete re-test brief. Over production auth message po deployi main (`Invalid authentication` pre missing aj wrong token).
