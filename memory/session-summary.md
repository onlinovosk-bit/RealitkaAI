## Session 2026-09-25

### Dokončené
- **METRICS-ACCESS-01** (#699, `531b1cac`): brána `/internal/metrics` uznáva
  `is_platform_admin`; položka „Metriky zakladateľa" v menu (`platformAdminOnly`);
  `not-found.tsx` zbavený vnoreného `<html>/<body>` — **overené na živej produkcii**,
  404 už renderuje kartu, nie bielu plochu.
- **CI-UNBLOCK-01** (#700, `364b08cd`): `20260925110000_rls_anon_lockdown.sql` obalený
  do `to_regclass(...) IS NULL → RETURN`. `main` bol červený a blokoval každý PR.
  Overené na lokálnom PG16 (čistá DB + PROD-tvar) aj reálnym zeleným CI behom.
- **SCHEMA-DRIFT-INVENTORY**: `docs/reports/2026-09-25-schema-drift-inventory.md`,
  AP-023. Read-only, žiadne DDL na PROD.

### Rozpracované / Pending
- **Calendly webhook** — founder má overiť, či je `/api/webhooks/calendly` nastavený.
  Ak áno, `demo_bookings` neexistuje → 500 → strata atribúcie dema. Najvyššia priorita
  z celej inventúry.
- **5 tabuliek s osobnými údajmi** (časť C reportu) — pôvod a právny základ neustálené.
  Kandidát na `gdpr-advisor`. Nemazať, kým sa nevie, čo to je.
- **Baseline dump PROD schémy** do migrácie — rieši 30 chýbajúcich naraz. Vlastná brána.
- **CI gate proti regresii driftu** — test padne, keď kód volá tabuľku bez migrácie.
- **404-PATH-01** — `not-found.tsx:51` má natvrdo `app.revolis.ai/team/permissions`.
- **UGKK-QUERY** — nedokončené. CRZ ukazuje zmluvy ÚGKK s komerčnými subjektmi, čo
  je v rozpore s `master-data-sourcing-map.md` ZHLUK 3.
- Founder-only lokálne: `git push --force-with-lease origin 272810f8:fix-usage-telemetry`,
  `branch-cleanup.sh` (111 vetiev).

### Kľúčové súbory zmenené
- `apps/crm/supabase/migrations/20260925110000_rls_anon_lockdown.sql`: existenčné guardy
- `apps/crm/src/lib/metrics/access.ts`: `canViewFounderMetrics` rešpektuje platform admina
- `apps/crm/src/types/navigation.ts`: `NavItem.platformAdminOnly` + položka `internal-metrics`
- `apps/crm/src/app/not-found.tsx`: bez vnoreného `<html>/<body>`
- `apps/crm/src/app/(dashboard)/internal/metrics/page.tsx`: presunuté pod `(dashboard)`
- `docs/reports/2026-09-25-schema-drift-inventory.md`: nový

### Ďalší krok
Founder overí Calendly webhook. Ak je nastavený, `demo_bookings` je strata akvizičných
dát a má prednosť pred baseline dumpom aj pred CI gate.
