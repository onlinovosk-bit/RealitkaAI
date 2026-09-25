/**
 * The one place an AI → client send asks the Control Contract for permission.
 *
 * Every registered send action is irreversible + externally visible, so it
 * floors at APPROVAL_REQUIRED (OD-9). A caller that has a human approval passes
 * it; a caller without one (cron, script) is refused by construction. The kill
 * switch (AGENT_KILL_SWITCH) makes the action FORBIDDEN, which no approval can
 * lift (I-007).
 */
import {
  applyApproval,
  buildAuthorityContext,
  mayAct,
  resolveAuthority,
  type AuthorityVerdict,
  type SystemState,
} from "@revolis/control-contract";

import { readSystemState } from "./system-state";

export type SendApproval = {
  /** Stable id of what was approved (activity id, audit row, …). */
  approvalId: string;
  approvedBy: string;
  approvedAt: string;
};

export type AuthorizeSendResult =
  | { ok: true; verdict: AuthorityVerdict }
  | { ok: false; status: 403 | 500 | 503; reason: string; verdict: AuthorityVerdict | null };

export function authorizeSend(input: {
  action: string;
  agentId: string;
  tenantId: string;
  approval: SendApproval | null;
  systemState?: SystemState;
  now?: () => Date;
}): AuthorizeSendResult {
  const ctx = buildAuthorityContext(input.action, {
    agentId: input.agentId,
    tenantId: input.tenantId,
    actorRole: input.approval ? "broker" : "system",
    confidence: 1,
    systemState: input.systemState ?? readSystemState(),
  });
  if (!ctx) {
    return { ok: false, status: 500, reason: `Akcia ${input.action} nie je v registri — odoslanie zablokované.`, verdict: null };
  }

  const resolved = resolveAuthority(ctx, input.now ? { now: input.now } : {});
  const verdict = input.approval ? applyApproval(resolved, input.approval) : resolved;
  if (mayAct(verdict)) return { ok: true, verdict };

  return verdict.authority === "FORBIDDEN"
    ? { ok: false, status: 503, reason: "Odosielanie je dočasne zastavené (kill switch).", verdict }
    : { ok: false, status: 403, reason: "Odoslanie vyžaduje schválenie človekom.", verdict };
}

/** Audit-friendly projection of a verdict. */
export function authorityMeta(verdict: AuthorityVerdict | null) {
  return verdict
    ? { authority: verdict.authority, authority_policy: verdict.policyRef, authority_rules: verdict.appliedRules }
    : { authority: "UNREGISTERED" };
}
