# AMD-H1 — Phone value-release must be DB-enforced (supersedes D8 / BO-P2)

**Finding:** F-H1 (Lane H, CRITICAL)
**RUN_ID:** `20260905T2304-ruflo-overnight`
**BASE_SHA:** `cf3604613cdbb6a7a279e175f2c792fb25591461`
**Action:** AMEND_SPEC (one cycle) — does **not** ship code
**Supersedes:** `lanes/D/report.md` D8 phone_value_releases design; `lanes/G/report.md` BO-P2 acceptance insofar as API-only omit-phones

## Fix (binding for any future implementation)

D8 / BO-P2 as written are **insufficient**. Any security-complete claim must require **all** of:

1. **Strip** `owner_phone` / `broker_phone` from all list/summary/store selects (including `PROPERTIES_SELECT_CORE` / `FULL` and inventory API selects).
2. **DB-enforced reveal-only:** `REVOKE` column SELECT from `authenticated` **or** expose phones only via `SECURITY DEFINER` function that inserts `phone_value_releases` in the **same transaction** then returns the value.
3. Deny CSV/export of phone values without per-value audit rows.
4. Fail-closed: audit insert failure => no plaintext.
5. Explicitly forbid treating `ai_action_audit` / LEAD_UNLOCK as phone-release audit.

## Evidence (reconfirmed at workspace tree; H cited BASE_SHA)

| Claim | Path |
|---|---|
| CORE select includes `broker_phone`; FULL adds `owner_phone` | `apps/crm/src/lib/properties-store.ts` |
| Inventory API selects phones without audit | `apps/crm/src/app/api/leads/inventory/route.ts` |
| H STOP + concrete fix | `lanes/H/report.md` F-H1; `lanes/H/result.json` |

## Residual / honesty

- Spec gap closed by this amendment.
- **Code unrepaired** in this research run => O6 final verdict **must** be `NO_GO_IMPLEMENTATION` (and must not claim multi-tenant / PII pilot GO).
- Re-open for implementation only after harness: authenticated JWT `select('owner_phone')` denied; reveal route with forced audit failure returns no plaintext; `rg` shows no list-path phone columns outside reveal module; H (or follow-up) re-review CRITICAL PASS.
