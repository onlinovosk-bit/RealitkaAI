/**
 * CP-SPEC §3.4 — the authority engine.
 *
 * Authority is not a property of an agent. It is a PURE FUNCTION over context:
 *   resolveAuthority(AuthorityContext, AuthorityPolicy) -> AuthorityVerdict
 *
 * OD-9 (founder ACCEPT): irreversibility is a FLOOR, not a ceiling. An irreversible
 * action floors at APPROVAL_REQUIRED; policy may raise it, never lower it. FORBIDDEN
 * is reserved for the explicit DENY_LIST. The v1.0 rule `irreversible -> FORBIDDEN`
 * was wrong: FORBIDDEN means "not even with human approval", so it would have made
 * every agent e-mail impossible.
 *
 * I-007: FORBIDDEN is not overridable by an approval.
 */
import { lookupAction, type ActionMetadata, type ActionRisk } from "./actions.ts";
import {
  DEFAULT_AUTHORITY_POLICY,
  matchesDenyList,
  type AuthorityPolicy,
} from "./policy.ts";

export type Capability = "OBSERVE" | "ANALYZE" | "RECOMMEND" | "EXECUTE";
export type Authority = "AUTONOMOUS" | "APPROVAL_REQUIRED" | "FORBIDDEN";

/** Strictness lattice. A floor may only move a verdict up this scale. */
const RANK: Record<Authority, number> = {
  AUTONOMOUS: 0,
  APPROVAL_REQUIRED: 1,
  FORBIDDEN: 2,
};

export type SystemState = { degraded: boolean; killSwitch: boolean };

/**
 * Runtime facts the caller genuinely owns. The action-intrinsic facts
 * (capability / reversible / externallyVisible / risk) come from the registry,
 * and are carried here only so a mismatch can be DETECTED — see `resolveAuthority`.
 */
export type AuthorityContext = {
  agentId: string;
  action: string;
  capability: Capability;
  tenantId: string;
  actorRole: string;
  risk: ActionRisk;
  confidence: number;
  reversible: boolean;
  externallyVisible: boolean;
  systemState: SystemState;
};

export type AuthorityVerdict = {
  authority: Authority;
  policyRef: string;
  /** Why, in plain language, for the audit trail. */
  rationale: string;
  approvalId: string | null;
  evaluatedAt: string;
  /** Every rule that fired, in order. Makes the verdict reviewable, not just assertable. */
  appliedRules: readonly string[];
};

/**
 * Builds a context whose intrinsic fields come from the registry, so a caller
 * cannot accidentally describe an irreversible action as reversible.
 * An unregistered action returns null — it cannot be authorized at all.
 */
export function buildAuthorityContext(
  action: string,
  runtime: {
    agentId: string;
    tenantId: string;
    actorRole: string;
    confidence: number;
    systemState: SystemState;
  },
): AuthorityContext | null {
  const metadata = lookupAction(action);
  if (!metadata) return null;
  return {
    agentId: runtime.agentId,
    action,
    capability: metadata.capability,
    tenantId: runtime.tenantId,
    actorRole: runtime.actorRole,
    risk: metadata.risk,
    confidence: runtime.confidence,
    reversible: metadata.reversible,
    externallyVisible: metadata.externallyVisible,
    systemState: runtime.systemState,
  };
}

function intrinsicsMatch(ctx: AuthorityContext, metadata: ActionMetadata): boolean {
  return (
    ctx.capability === metadata.capability &&
    ctx.reversible === metadata.reversible &&
    ctx.externallyVisible === metadata.externallyVisible &&
    ctx.risk === metadata.risk
  );
}

function forbidden(
  policy: AuthorityPolicy,
  rationale: string,
  rule: string,
  evaluatedAt: string,
): AuthorityVerdict {
  return {
    authority: "FORBIDDEN",
    policyRef: `${policy.policyId}@${policy.version}`,
    rationale,
    approvalId: null,
    evaluatedAt,
    appliedRules: [rule],
  };
}

export type ResolveAuthorityOptions = {
  policy?: AuthorityPolicy;
  now?: () => Date;
};

export function resolveAuthority(
  ctx: AuthorityContext,
  options: ResolveAuthorityOptions = {},
): AuthorityVerdict {
  const policy = options.policy ?? DEFAULT_AUTHORITY_POLICY;
  const evaluatedAt = (options.now?.() ?? new Date()).toISOString();
  const policyRef = `${policy.policyId}@${policy.version}`;

  // ── Absolute rules. None of these is reachable by an approval (I-007). ──

  if (ctx.systemState.killSwitch) {
    return forbidden(policy, "Kill switch is engaged.", "kill_switch", evaluatedAt);
  }

  const metadata = lookupAction(ctx.action);
  if (!metadata) {
    return forbidden(
      policy,
      `Action "${ctx.action}" has no entry in the action registry. An action without ` +
        `metadata cannot be authorized (fail-closed).`,
      "unregistered_action",
      evaluatedAt,
    );
  }

  if (!intrinsicsMatch(ctx, metadata)) {
    // The caller described the action differently from the registry. Treat it as
    // tampering rather than as a hint: otherwise an agent could declare an
    // irreversible send "reversible" and walk under the OD-9 floor.
    return forbidden(
      policy,
      `Authority context for "${ctx.action}" contradicts the action registry ` +
        `(capability/reversible/externallyVisible/risk). Registry is the truth.`,
      "context_registry_mismatch",
      evaluatedAt,
    );
  }

  const denyPattern = matchesDenyList(ctx.action, policy.denyList);
  if (metadata.denied || denyPattern) {
    return forbidden(
      policy,
      metadata.deniedReason ?? `Action matches DENY_LIST pattern "${denyPattern}".`,
      "deny_list",
      evaluatedAt,
    );
  }

  // ── Floors. Each may only raise the verdict. ──

  let authority: Authority = "AUTONOMOUS";
  const appliedRules: string[] = [];

  const raiseTo = (next: Authority, rule: string): void => {
    appliedRules.push(rule);
    if (RANK[next] > RANK[authority]) authority = next;
  };

  // OBSERVE and ANALYZE do not act on the world. They are exempt from the
  // confidence and degraded-system floors, never from the absolute rules above.
  const isPassive = ctx.capability === "OBSERVE" || ctx.capability === "ANALYZE";
  if (isPassive) {
    appliedRules.push("passive_capability_autonomous");
    return {
      authority,
      policyRef,
      rationale: `${ctx.capability} does not change the world — autonomous.`,
      approvalId: null,
      evaluatedAt,
      appliedRules,
    };
  }

  if (!ctx.reversible || ctx.risk === "irreversible") {
    // OD-9: floor, not veto.
    raiseTo("APPROVAL_REQUIRED", "irreversible_floor");
  }

  if (ctx.externallyVisible) {
    raiseTo("APPROVAL_REQUIRED", "externally_visible_floor");
    if (policy.externallyVisibleOverride.enabled) {
      // Deliberately does NOT lower the verdict. OD-10 stays CONDITIONAL while
      // Twilio Messages idempotency is undocumented (U-J).
      appliedRules.push("od10_override_requested_but_not_implemented");
    }
  }

  if (ctx.confidence < policy.minConfidence) {
    raiseTo("APPROVAL_REQUIRED", "low_confidence_floor");
  }

  if (ctx.systemState.degraded && ctx.capability === "EXECUTE") {
    raiseTo("APPROVAL_REQUIRED", "degraded_system_floor");
  }

  if (appliedRules.length === 0) appliedRules.push("default_autonomous");

  return {
    authority,
    policyRef,
    rationale:
      authority === "AUTONOMOUS"
        ? `No floor applied to "${ctx.action}" — autonomous.`
        : `Floors applied to "${ctx.action}": ${appliedRules.join(", ")}.`,
    approvalId: null,
    evaluatedAt,
    appliedRules,
  };
}

/**
 * I-007 made executable: an approval upgrades APPROVAL_REQUIRED, and nothing else.
 * Applying an approval to a FORBIDDEN verdict returns the FORBIDDEN verdict unchanged.
 */
export function applyApproval(
  verdict: AuthorityVerdict,
  approval: { approvalId: string; approvedBy: string; approvedAt: string },
): AuthorityVerdict {
  if (verdict.authority !== "APPROVAL_REQUIRED") {
    return {
      ...verdict,
      appliedRules: [...verdict.appliedRules, "approval_ignored_not_applicable"],
    };
  }
  return {
    ...verdict,
    authority: "AUTONOMOUS",
    approvalId: approval.approvalId,
    rationale: `${verdict.rationale} Approved by ${approval.approvedBy} at ${approval.approvedAt}.`,
    appliedRules: [...verdict.appliedRules, "approval_granted"],
  };
}

export function mayAct(verdict: AuthorityVerdict): boolean {
  return verdict.authority === "AUTONOMOUS";
}
