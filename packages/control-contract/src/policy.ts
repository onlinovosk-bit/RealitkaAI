/**
 * CP-SPEC §3.4 acceptance #3 — policy is DATA, not branching scattered through code.
 * Every knob `resolveAuthority` reads lives in this object and nowhere else.
 */

export type ExternallyVisibleOverride =
  | { enabled: false }
  /**
   * OD-10 is CONDITIONAL on U-J (Twilio Messages idempotency is UNDOCUMENTED).
   * The shape exists because §3.4.2 makes per-tenant policy a design requirement
   * for CP-P0-4; the path is not implemented. `resolveAuthority` keeps
   * APPROVAL_REQUIRED even when this is set, and says so in the rationale.
   */
  | { enabled: true; tenants: readonly string[] };

export type AuthorityPolicy = {
  policyId: string;
  version: string;
  /** Exact action names, or a `prefix.*` pattern. Owner decision, not a property of the action. */
  denyList: readonly string[];
  /** Below this, an EXECUTE/RECOMMEND action needs a human. */
  minConfidence: number;
  /** Reserved for the OD-10 override path. Unused while the override is disabled. */
  autonomousMinConfidence: number;
  /** §3.7 — an ACT with no OUTCOME within this window becomes outcome_unknown{too_early}. */
  outcomeSlaMinutes: number;
  externallyVisibleOverride: ExternallyVisibleOverride;
};

export const DEFAULT_AUTHORITY_POLICY: AuthorityPolicy = {
  policyId: "revolis.authority.default",
  version: "1.0.0",
  denyList: ["billing.*", "prod.delete", "portal.scrape", "auto_deploy"],
  minConfidence: 0.6,
  autonomousMinConfidence: 0.85,
  outcomeSlaMinutes: 60 * 24 * 7,
  externallyVisibleOverride: { enabled: false },
};

export function matchesDenyList(action: string, denyList: readonly string[]): string | null {
  for (const pattern of denyList) {
    if (pattern.endsWith(".*")) {
      if (action.startsWith(pattern.slice(0, -1))) return pattern;
    } else if (pattern === action) {
      return pattern;
    }
  }
  return null;
}

/**
 * §3.4.2 — policy stops being global and becomes per-tenant data. Today every
 * tenant resolves to the same object; the seam exists so CP-P0-2 can add a table
 * without changing `resolveAuthority`.
 */
export function resolvePolicyForTenant(_tenantId: string): AuthorityPolicy {
  return DEFAULT_AUTHORITY_POLICY;
}
