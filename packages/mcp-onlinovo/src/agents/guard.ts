import { denyWrite } from "../policy.js";
import { CONFIDENCE_SCORE, type AgentId, type Confidence } from "./types.js";

/**
 * Local mirror of the ONLINOVO block of the Control Contract action registry
 * (packages/control-contract/src/actions.ts). The registry is the truth; `guard-differential.test.ts`
 * fails when this table and `resolveAuthority` disagree. There is no approval parameter here on
 * purpose: a path that cannot be called cannot be abused.
 */
export type Tier = 0 | 1 | 3;
export type Capability = "OBSERVE" | "ANALYZE" | "RECOMMEND" | "EXECUTE";
export type ActionStatus = "ALLOWED" | "BLOCKED" | "DENIED";
export type Verdict = "AUTONOMOUS" | "APPROVAL_REQUIRED" | "FORBIDDEN";

export type GuardCode =
  | "KILL_SWITCH"
  | "AGENT_UNKNOWN"
  | "CAPABILITY_UNSUPPORTED"
  | "ACTION_NOT_ALLOWED_FOR_AGENT"
  | "ACTION_BLOCKED_NO_VERIFIED_CONTRACT"
  | "ACTION_DENIED_OWNER_DECISION"
  | "WRITE_DISABLED_IN_MVP"
  | "APPROVAL_REQUIRED";

export interface OnlAction {
  action: string;
  capability: Capability;
  tier: Tier;
  status: ActionStatus;
  /** Why it is blocked or denied. null for allowed actions. */
  reason: string | null;
}

export const MIN_CONFIDENCE = 0.6;

export const ONL_ACTIONS: readonly OnlAction[] = [
  { action: "onlinovo.data.observe", capability: "OBSERVE", tier: 0, status: "ALLOWED", reason: null },
  { action: "onlinovo.opportunity.analyze", capability: "ANALYZE", tier: 0, status: "ALLOWED", reason: null },
  { action: "onlinovo.experiment.evaluate", capability: "ANALYZE", tier: 0, status: "ALLOWED", reason: null },
  { action: "onlinovo.opportunity.recommend", capability: "RECOMMEND", tier: 1, status: "ALLOWED", reason: null },
  { action: "onlinovo.nextaction.recommend", capability: "RECOMMEND", tier: 1, status: "ALLOWED", reason: null },
  { action: "onlinovo.experiment.propose", capability: "RECOMMEND", tier: 1, status: "ALLOWED", reason: null },
  { action: "onlinovo.record.persist", capability: "EXECUTE", tier: 1, status: "BLOCKED", reason: "no verified write path" },
  { action: "onlinovo.campaign.send", capability: "EXECUTE", tier: 3, status: "BLOCKED", reason: "LeadHub contract unverified" },
  { action: "onlinovo.campaign.schedule", capability: "EXECUTE", tier: 3, status: "BLOCKED", reason: "LeadHub contract unverified" },
  { action: "onlinovo.campaign.update", capability: "EXECUTE", tier: 3, status: "BLOCKED", reason: "LeadHub contract unverified" },
  { action: "onlinovo.journey.write", capability: "EXECUTE", tier: 3, status: "BLOCKED", reason: "LeadHub contract unverified" },
  { action: "onlinovo.price.change", capability: "EXECUTE", tier: 3, status: "DENIED", reason: "owner decision" },
  { action: "onlinovo.customer.permission.change", capability: "EXECUTE", tier: 3, status: "DENIED", reason: "owner decision" },
];

export const AGENT_ALLOWED: Readonly<Record<AgentId, readonly string[]>> = {
  "ONL-REVENUE-OPPORTUNITY": [
    "onlinovo.data.observe",
    "onlinovo.opportunity.analyze",
    "onlinovo.opportunity.recommend",
  ],
  "ONL-CUSTOMER-NEXT-ACTION": ["onlinovo.data.observe", "onlinovo.nextaction.recommend"],
  "ONL-EXPERIMENT": ["onlinovo.experiment.propose", "onlinovo.experiment.evaluate"],
};

export interface GuardDecision {
  allowed: boolean;
  verdict: Verdict;
  code: GuardCode | null;
  rule: string;
  tier: Tier | null;
  message: string;
}

const BY_ACTION: ReadonlyMap<string, OnlAction> = new Map(ONL_ACTIONS.map((a) => [a.action, a]));

export function lookupOnlAction(action: string): OnlAction | null {
  return BY_ACTION.get(action) ?? null;
}

const KILL_SWITCH_OFF = new Set(["", "0", "false", "off", "no", "disabled"]);

/**
 * Fail-closed: the switch is ON for any value except an explicit "off" spelling. A typo such as "ture" or
 * a spelling like "yes" or "enabled" stops the agents; it can never leave them running by accident.
 */
export function killSwitchOn(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = (env.ONLINOVO_AGENTS_KILL_SWITCH ?? "").trim().toLowerCase();
  return !KILL_SWITCH_OFF.has(raw);
}

function forbid(code: GuardCode, rule: string, tier: Tier | null, message: string): GuardDecision {
  return { allowed: false, verdict: "FORBIDDEN", code, rule, tier, message };
}

/** Action-level verdict, independent of which agent asks. Mirrors `resolveAuthority`. */
export function actionVerdict(
  action: string,
  confidence: number,
  env: NodeJS.ProcessEnv = process.env,
): GuardDecision {
  if (killSwitchOn(env)) {
    return forbid("KILL_SWITCH", "kill_switch", null, "Kill switch is engaged.");
  }
  const meta = lookupOnlAction(action);
  if (!meta) {
    return forbid(
      "CAPABILITY_UNSUPPORTED",
      "unregistered_action",
      null,
      `Action "${action}" is not registered. An unregistered action cannot be authorized (fail-closed).`,
    );
  }
  if (meta.status === "DENIED") {
    return forbid("ACTION_DENIED_OWNER_DECISION", "deny_list", meta.tier, `${action}: ${meta.reason}.`);
  }
  if (meta.status === "BLOCKED") {
    if (action === "onlinovo.record.persist") {
      const denied = denyWrite(action);
      return forbid("WRITE_DISABLED_IN_MVP", "deny_list", meta.tier, denied.message);
    }
    return forbid(
      "ACTION_BLOCKED_NO_VERIFIED_CONTRACT",
      "deny_list",
      meta.tier,
      `${action} is BLOCKED: ${meta.reason}. UNKNOWN, not guessed.`,
    );
  }
  if (meta.capability === "OBSERVE" || meta.capability === "ANALYZE") {
    return {
      allowed: true,
      verdict: "AUTONOMOUS",
      code: null,
      rule: "passive_capability_autonomous",
      tier: meta.tier,
      message: `${meta.capability} does not change the world.`,
    };
  }
  // `!(x >= floor)` rather than `x < floor`, and a typeof check because "0.9" >= 0.6 is true in JavaScript:
  // NaN, undefined, null and strings are "not enough confidence", never a pass.
  if (typeof confidence !== "number" || !(confidence >= MIN_CONFIDENCE) || confidence > 1) {
    return {
      allowed: false,
      verdict: "APPROVAL_REQUIRED",
      code: "APPROVAL_REQUIRED",
      rule: "low_confidence_floor",
      tier: meta.tier,
      message: `Confidence ${confidence} is below ${MIN_CONFIDENCE}. A human must decide; no approval path exists in this build.`,
    };
  }
  return {
    allowed: true,
    verdict: "AUTONOMOUS",
    code: null,
    rule: "default_autonomous",
    tier: meta.tier,
    message: `${action} is internal and reversible.`,
  };
}

/** Agent-level gate: the agent must be known, and the action must be on that agent's allow list. */
export function authorizeAgentAction(
  input: { agentId: string; action: string; confidence?: number },
  env: NodeJS.ProcessEnv = process.env,
): GuardDecision {
  // Only an absent confidence means "full"; null, NaN and strings are kept and fail closed in `actionVerdict`.
  const confidence = input.confidence === undefined ? 1 : input.confidence;
  const allowed = (AGENT_ALLOWED as Record<string, readonly string[] | undefined>)[input.agentId];
  if (!allowed) {
    return forbid("AGENT_UNKNOWN", "unknown_agent", null, `Agent "${input.agentId}" is not registered.`);
  }
  const base = actionVerdict(input.action, confidence, env);
  if (base.verdict === "FORBIDDEN") return base;
  if (!allowed.includes(input.action)) {
    return forbid(
      "ACTION_NOT_ALLOWED_FOR_AGENT",
      "agent_allow_list",
      base.tier,
      `${input.agentId} may not perform ${input.action}.`,
    );
  }
  return base;
}

export class GuardError extends Error {
  readonly decision: GuardDecision;
  constructor(decision: GuardDecision) {
    super(`${decision.code ?? "DENIED"}: ${decision.message}`);
    this.name = "GuardError";
    this.decision = decision;
  }
}

export function assertAgentAction(
  input: { agentId: string; action: string; confidence?: number },
  env: NodeJS.ProcessEnv = process.env,
): GuardDecision {
  const decision = authorizeAgentAction(input, env);
  if (!decision.allowed) throw new GuardError(decision);
  return decision;
}

/** Per-item policy status for an output that carries its own confidence. */
export function policyStatusFor(confidence: Confidence): "AUTONOMOUS" | "APPROVAL_REQUIRED" {
  return CONFIDENCE_SCORE[confidence] >= MIN_CONFIDENCE ? "AUTONOMOUS" : "APPROVAL_REQUIRED";
}
