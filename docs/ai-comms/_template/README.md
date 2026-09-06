# Sol↔Opus manual protocol templates

Use these templates for high-risk work only:

- architecture decisions;
- risky implementation plans;
- PR reviews before merge;
- security/auth/billing/RLS/migration decisions;
- data/legal source gates.

Do not use this protocol for routine status, copy edits, or simple implementation.

## How to start a run

1. Copy this directory to a dated topic path:

   ```text
   docs/ai-comms/YYYY-MM-DD-topic/
   ```

2. Fill `00-brief.md` first and lock scope.
3. Fill turns in order:

   ```text
   01-sol-draft.md
   02-opus-review.md
   03-sol-revision.md
   04-verdict.md
   ```

4. Stop after the verdict unless founder gives a new GO.

## Hard gates

The templates never grant permission for:

- PROD writes;
- merge to `main`;
- secrets changes;
- external send;
- runtime/provider-to-provider automation.

Those actions remain **GO REQUIRED**.
