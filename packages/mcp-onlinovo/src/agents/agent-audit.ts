import { beginAudit } from "../audit.js";
import type { GuardDecision } from "./guard.js";

/**
 * Thin wrapper over the existing `beginAudit`. It adds the agent, the action and the verdict to the
 * audit trail. It never logs customer references, e-mails or any payload, only counts and codes.
 */
export function beginAgentAudit(tool: string, agentId: string, action: string, decision: GuardDecision) {
  const audit = beginAudit(tool);
  audit.log.info("agent_action", {
    agent_id: agentId,
    action,
    verdict: decision.verdict,
    rule: decision.rule,
    tier: decision.tier,
    code: decision.code,
  });
  return {
    request_id: audit.request_id,
    log: audit.log,
    finish(extra?: Record<string, unknown>) {
      audit.finish({ agent_id: agentId, action, verdict: decision.verdict, ...extra });
    },
  };
}
