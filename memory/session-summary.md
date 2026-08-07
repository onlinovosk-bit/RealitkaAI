## Session 2026-08-07 (Listing generator PR-A)

### Dokončené
- PR-A: FINAL system prompt wired into `SYSTEM_PROMPT` (`listing-content-system-prompt.ts`)
- C4 optionals on `ListingContent` + fixtures/vitest 6/6 + PR-A prompt-wire verification
- Docs: `docs/sales/listing-generator-*` → `docs/prompts/` (smolko golden zostáva v `docs/sales/`)
- Branch/PR: `feat/listing-generator-pr-a-prompt-wire` (merge = founder)

### Rozpracované / Pending
- Founder merge PR-A pri klávesnici + Preview smoke
- PR-B: UI pole `charakterLokality` (samostatný PR)

### Kľúčové súbory zmenené
- `apps/crm/src/lib/ai/listing-content-system-prompt.ts`: FINAL prompt const
- `apps/crm/src/lib/ai/listing-content.ts`: import SYSTEM_PROMPT, optionals, user prompt align
- `apps/crm/tests/verification/listing-content-*.verification.test.ts` + fixtures
- `docs/prompts/listing-generator-*`: prompt task docs

### Ďalší krok
Founder: review + merge PR-A; potom GO na PR-B (`charakterLokality` UI).
