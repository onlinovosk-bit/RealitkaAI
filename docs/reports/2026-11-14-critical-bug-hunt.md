# Critical bug hunt — 2026-11-14

**Head checked:** `origin/main` @ `c0ed01e9`  
**Branch:** `cursor/critical-bug-hunt-2026-11-14` (report only — no fix PR)  
**Verdict:** **No new critical bug** meeting the confidence bar.

## Scope reviewed

- Recent merges: model-gateway (#947), billing canceled leftover (#938), recommendations match-cap (#937), auth ui_role (#941), profiles role allowlist (#939), team owner gate (#935), legacy async fulfill (#925), starter-pack proxy (#929), deliverability (#910), public capture (#896), marketing SEO/deadline (#950)
- Wipe / delete-then-insert paths: `matching-store`, `recommendations-store`, `ai-scoring-store`
- Entitlement / billing: `credits-billing`, `credits-billing-v2`, `billing-store`, `saas-ops`, `grant-engine`, `_actions/licensing`
- Auth surfaces: `proxy.ts` public/cron bypasses, agents/`revolisGuard`, invite, starter-pack download, UC/Realvia import
- Tracked MEMORIES.md entries: all **17** PRs still **OPEN** (none merged/rejected)

## Skipped (already tracked — not re-reported)

| Item | PR |
|------|-----|
| recommendations clear-then-insert wipe | #952 |
| incomplete/past_due leftover lockout invoice tenants | #951 |
| multi-agency RLS matching/rec wipe | #948 |
| legacy seat checkout hardcodes `active` | #946 |
| `incomplete_expired` + `stripe_subscription_id` live lock | #945 |
| recommendations type-blind clear | #944 |
| licensing free entitlement server actions | #942 |
| agencies read failure → NO_AGENCY_FACTS lockout | #934 |
| subscription.updated unrecognized pack → pack_credits 0 | #933 |
| match-read soft-fail → rec wipe | #930 |
| matching LIST_MAX truncation wipe | #924 |
| outreach agency → SYSTEM_USAGE | #923 |
| gmail markError/markPulled races | #911, #902 |
| matching DELETE-then-INSERT timeout wipe | #843 |
| expire grant repair absolute credits overwrite | #859 |
| acquire_dedup_keys global PK | #881 |

## Candidates examined (not filed)

| Candidate | Why below bar / not new |
|-----------|-------------------------|
| model-gateway concurrent `summarize`/`complete` race | Real race for EUR cap overshoot, but package is script-only (not CRM prod path); not user-facing data loss |
| `/api/agents/cleaner` delete without agency filter | Discovery F-07 P2; HMAC-gated; session client → likely RLS-blocked dead path; not new confirmed PROD wipe |
| `incomplete` still in `RELEVANT_SUBSCRIPTION_STATUSES` | Same root class as open #951 |
| Gmail IMAP password in `profile_integrations.config` | Own-profile only; not proven cross-tenant read; severity/UX vs CRITICAL bar |
| Marketing friday-deadline / SEO (#950) | No data-loss / auth / billing impact |

## MEMORIES.md reconciliation

- All listed PRs re-checked via `gh pr view`: **state=OPEN**, none merged
- No rejected entries older than 30 days to delete
- No entry deletions this run

## Output

Slack: no-critical summary with pointer to open fix PRs still awaiting review.  
No fix PR opened (confidence bar / duplicate policy).
