# Plan — properties PUT/DELETE session agency scope

## Rozsah
- Scope `PUT` / `DELETE` on `apps/crm/src/app/api/properties/route.ts` to session `agency_id`.
- Add unit test proving sibling-tenant id cannot mutate.
- Record finding in `docs/reports/`.

## Znovupoužitie
- Mirror fail-closed pattern from `apps/crm/src/app/api/properties/[id]/route.ts` (`sameAgency` + store).
- Reuse `updateProperty` / `deleteProperty` (already `.eq("agency_id", sessionAgency)`).

## Akceptačné kritériá
- PUT/DELETE refuse missing caller `agency_id` with 403.
- PUT/DELETE of a property whose `agency_id` ≠ session agency return 403 and do not write.
- `npx vitest run src/app/api/properties/__tests__/route.agency-scope.test.ts` exits 0.

## Riziká
- Legacy clients calling collection PUT/DELETE still work for same-tenant ids.
- Multi-agency RLS (`profile_agencies_for_auth`) remains; app layer must keep session filter.

## Brány
- PR only. Merge / LIVE / PROD require explicit **FOUNDER GO** (not requested in this hunt).

## Kroky
1. Rewrite PUT/DELETE to resolve session agency and call store helpers.
2. Add vitest for cross-tenant refuse.
3. Write report + commit + PR.

## Mimo rozsahu
- Matching wipe (#948), CSV import (#961), buyer_intents (#963), licensing (#942).
- Changing RLS policies.
