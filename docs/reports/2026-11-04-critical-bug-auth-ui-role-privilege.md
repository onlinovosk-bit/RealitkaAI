# Critical bug hunt — auth ui_role privilege (2026-11-04)

Head scanned: `origin/main` @ `2743bcde`.

## NEW CRITICAL (fixed)

### Billing `ui_role` treated as identity admin → same-agency account takeover

- **Where:** `apps/crm/src/app/api/settings/auth-email-tests/route.ts` (`canManageUsers`); sibling `isCeoCommandOwner` in `apps/crm/src/lib/ceo-command/access.ts`.
- **Trigger:**
  1. Authenticated agent completes pricing-v2 plan checkout (or webhook `syncAccountTier` / `fulfillPricingV2PlanCheckout` updates their `auth_user_id` profile).
  2. Checkout writes `account_tier: enterprise` + `ui_role: owner_vision` while `profiles.role` stays `agent` (`credits-billing-v2.ts` profile update).
  3. `resolveProfileForAuthUser` → `normalizeProfileEntitlements` also promotes agent + enterprise → `owner_vision`.
  4. Agent `POST /api/settings/auth-email-tests` `{ action: "recovery-link", email: "<owner@agency>" }`.
  5. Old gate: `ui_role === "owner_vision"` → `canManageUsers`; same-agency check passes → returns live Supabase `action_link`.
- **Impact:** In-tenant account takeover (password reset for owner/coworker). Also CEO Command / guardian owner filters treated billing UX as identity.
- **Fix:** Identity gates require `profiles.role === "owner"|"founder"` only. `ui_role` remains paid-tier UX, not admin.

## Cleared / not re-opened

- Profiles founder mint (#939 merged).
- Team users/teams owner gate (#935).
- Tracked open remediations: #938 #937 #934 #933 #930 #924 #923 #911 #902 #843 #859 #881.

## Validation

- `npx vitest run` on auth-email-tests route + ceo-command access + verification specs (see PR CI / local run log).
