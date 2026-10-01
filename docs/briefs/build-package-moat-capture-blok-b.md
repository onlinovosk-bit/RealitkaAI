# Build Package — Moat Capture Blok B

**Cieľová cesta:** `docs/briefs/build-package-moat-capture-blok-b.md`  
**Brief:** `docs/briefs/overnight/overnight-brief-moat-capture.md`  
**Premortem:** `docs/premortems/2026-07-26-moat-capture.md`

## 1. VISION & BUSINESS

Revolis musí trvalo zbierať dáta o uzavretých obchodoch a reakciách maklérov na AI odporúčania — bez učenia/modelov (North Star moat, Capture-now/Learn-later). Pre maklérske agentúry na Revolis CRM: každý deň bez logu = stratená história. User story: keď maklér uzavrie lead alebo systém ukáže AI triage/NBA/email, dáta sa ticho zapíšu pre budúcu learn vrstvu (brána 3 zákazníci).

## 2. SPEC

1. Pri prechode leadu na `Uzavretý`/`Stratený` sa zapíše riadok do `deal_outcomes` s `outcome` won/lost.
2. `reason_code` z číselníka v1; do PR-B2 modalu fallback `unspecified` + TODO.
3. `logAiRecommendation()` — fire-and-forget, `CAPTURE_ENABLED` gate, nikdy nevyhodí výnimku volajúcemu.
4. Triage (acquire), NBA (workdesk first-audit), AI email (outreach), CRM rec accept/reject → capture/update.
5. `dedupe_key` prefix `agency_id:` v helperi; unique index — 2× render = 1 riadok.
6. RLS per-tenant na nových tabuľkách; cross-tenant deny v RLS suite.
7. Nefunkčné: helper nesmie spomaliť hlavný flow; migrácia aditívna; founder GO pred PROD apply.

## 3. ARCHITECTURE

| Integrácia | Cesta |
|------------|--------|
| Lead won/lost | `apps/crm/src/app/api/leads/[id]/route.ts` (PATCH, terminal status) |
| Triage on-insert | `apps/crm/src/lib/acquire/inbound-lead-triage.ts` ← `api/acquire/email/route.ts` |
| NBA render | `apps/crm/src/app/api/workdesk/first-audit/route.ts` → `log-nba-batch.ts` |
| NBA accept/reject (CRM rec) | `apps/crm/src/app/api/recommendations/[id]/route.ts` |
| AI email generate | `apps/crm/src/lib/outreach-store.ts` (`sendAiOutreachEmail`) |

Modul: `apps/crm/src/lib/moat-capture/*`. Žiadny scheduler — sync hooky pri existujúcich eventoch.

## 4. DATA

Plné SQL: `apps/crm/supabase/migrations/20260726120000_moat_capture_blok_b.sql`  
Founder copy: `apps/crm/supabase/MIGRATION_moat_capture_blok_b.sql`

Tabuľky: `deal_outcomes`, `moat_ai_recommendations` (viz ODCHÝLKY). RLS: `profile_agencies_for_auth()` + `service_role` policies. Retencia: neobmedzená (moat dáta).

## 5. API/UI

Bez nových verejných endpointov. UI modal won/lost **out of scope** (PR-B2). Existujúce PATCH lead/recommendations správanie nezmenené pre používateľa.

## 6. TESTING & ACCEPTANCE

- Unit: `apps/crm/src/lib/moat-capture/__tests__/moat-capture.test.ts` (never-throws, dedupe 23505, reason unspecified, dedupe prefix).
- RLS: registry + fixtures `deal_outcomes`, `moat_ai_recommendations`.
- DoD: CI lint/test/build; brain:check; allowlist; **bez PROD migrácie** a **bez merge** (founder gate).

## 7. PREMORTEM

Kópia: `docs/premortems/2026-07-26-moat-capture.md`.

## 8. ROLLBACK

1. `CAPTURE_ENABLED=false` — zastaví zápis bez revertu.  
2. Revert PR — volania sú fire-and-forget, bezpečné.  
3. DB tabuľky **nedropovať** (aditívna migrácia). Poradie: kód pred DB.

## 9. MONITORING

`platform-heartbeat.ts` — počty insertov za 24h: triage/nba/ai_email + `deal_outcomes`. 0 pri živej prevádzke = advisory (manual review).

## 10. MEMORY UPDATE (po merge)

brain/decisions: Capture-now/Learn-later (+90d review); reason_code v1 (+30d audit). Registry: aktualizovať `build-package.moat-capture` + tabuľky.

## 11. RELEASE CHECKLIST

☐ Founder GO migrácia → ☐ PROD SQL → ☐ overenie schémy → ☐ deploy → ☐ smoke widget 200 + 1 triage log → ☐ CI + brain:check → ☐ decisions → ☐ Smolko: povinné dôvody (po PR-B2 modal).

## ODCHÝLKY

1. **Tabuľka `moat_ai_recommendations`** namiesto brief `ai_recommendations` — existujúca CRM tabuľka má nekompatibilný `status` (active/inactive) a iný model stĺpcov; aditívne slučenie by porušilo „žiadne ALTER existujúcich stĺpcov“ aj sémantiku.
2. **Won/lost modal v PR-B2** — `reason_code=unspecified` + TODO v `log-deal-outcome.ts`.
3. **NBA accept/reject** mapované na CRM `recommendations/[id]` active/inactive, nie workdesk klik — executive NBA nemá server-side accept endpoint; reakcia cez `crm_rec:{leadId}:{hash}` dedupe.
4. **NBA render** primárne cez `GET /api/workdesk/first-audit`, nie každý client refresh NextBestActionPanel (dedupe chráni opakované volania audit API).
5. **CRM won/lost** = statusy `Uzavretý`/`Stratený`, nie anglické won/lost na entite Lead (Canon E-1).
