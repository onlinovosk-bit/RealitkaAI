# Wave 1B — Sandbox / ai_generations audit (READ-ONLY)

**Worktree:** C:\RealitkaAI\.worktrees\listing-gen-chain
**Branch tip:** chore/revolis-loops-rule @ f9bfc5650
**Date:** 2026-08-03

---

## Executive verdict

| Question | Answer |
|----------|--------|
| Can generate.ts / fixture demo paths write to ai_generations? | **NO** — pure in-memory, no Supabase |
| Can authenticated KF1 UI (/inzerat-generator) write under Smolko agency_id? | **YES** — by design via profile.agency_id |
| Does listing-gen have is_sandbox parity with valuation widget? | **NO** |
| GO for write phase (persistence / deploy)? | **NO-GO** until sandbox guard designed |
| GO for write phase (generate.ts capability only)? | **YES** |

---

## Two separate listing-generation stacks

| Stack | Path | Persists? |
|-------|------|-----------|
| Wave 1 capability (K2) | lib/capabilities/listing-generator/generate.ts | **No** |
| KF1 product (LLM UI) | lib/ai/listing-content.ts + POST /api/ai/listing-content | **Yes** → ai_generations |

---

## generate.ts — no write path

- agencyId used only for Guardian reviewGeneratedListing()
- No saveGeneration, no ai_generations
- Unit tests use Smolko UUID but in-memory only

---

## Fixture / demo call sites — all in-memory

1. **vertical-pack/[sourceId]/page.tsx** — buildVerticalPackDemo → generateListingDraft; default agencyId Smolko; fixture fallback via loadRealviaPropertyForDemo; **no DB write**
2. **property-microsite, presentation-builder** — generateListingDraft in-process only
3. **/inzerat-generator** — uses LLM API route (not generateListingDraft); **does persist** under profile.agency_id
4. **stream route** — explicitly does NOT save draft

---

## ai_generations writes

- saveGeneration() in lib/listings/generations-store.ts
- Called only from POST /api/ai/listing-content/route.ts
- Requires auth; agencyId from profiles; null agencyId → no insert
- Schema: no is_sandbox column (migration 20260803120000_ai_generations.sql)

---

## Valuation is_sandbox reference

- valuation_tenants.is_sandbox → sandbox_submissions vs leads
- valuation_estimates.is_sandbox on every persist
- Listing gen: none of the above

---

## Proposed changes (design only)

1. Add is_sandbox boolean DEFAULT false to ai_generations
2. saveGeneration accepts/persists isSandbox flag
3. Never persist from vertical-pack / generateListingDraft unless explicit opt-in
4. Analytics exclude is_sandbox rows
5. Verification test mirroring valuation-widget.verification.test.ts

---

## SELECT proof

```sql
SELECT count(*) FROM ai_generations
WHERE agency_id = '11111111-1111-1111-1111-111111111111';

SELECT kind, status, count(*), min(created_at), max(created_at)
FROM ai_generations
WHERE agency_id = '11111111-1111-1111-1111-111111111111'
GROUP BY kind, status;

-- After is_sandbox column:
SELECT count(*) FILTER (WHERE is_sandbox), count(*) FILTER (WHERE NOT is_sandbox)
FROM ai_generations
WHERE agency_id = '11111111-1111-1111-1111-111111111111';
```

---

## GO / NO-GO

- generate.ts / fixture / vertical-pack demo → **cannot** pollute ai_generations today
- KF1 POST route **can** write under Smolko when authenticated — legitimate but untagged
- **NO-GO** for persistence/deploy write phase without is_sandbox parity
- **GO** for capability-only generate.ts changes
