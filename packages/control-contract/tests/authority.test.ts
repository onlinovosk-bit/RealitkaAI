import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyApproval,
  buildAuthorityContext,
  DEFAULT_AUTHORITY_POLICY,
  lookupAction,
  mayAct,
  matchesDenyList,
  resolveAuthority,
  type AuthorityContext,
  type AuthorityPolicy,
} from "../src/index.ts";

const NOW = () => new Date("2026-09-19T10:00:00.000Z");

function ctxFor(
  action: string,
  overrides: Partial<{
    confidence: number;
    degraded: boolean;
    killSwitch: boolean;
    actorRole: string;
  }> = {},
): AuthorityContext {
  const built = buildAuthorityContext(action, {
    agentId: "followup_agent",
    tenantId: "tenant-1",
    actorRole: overrides.actorRole ?? "agent",
    confidence: overrides.confidence ?? 0.9,
    systemState: {
      degraded: overrides.degraded ?? false,
      killSwitch: overrides.killSwitch ?? false,
    },
  });
  assert.ok(built, `action ${action} must be in the registry`);
  return built;
}

describe("resolveAuthority — CP-SPEC §3.4 decision table", () => {
  it("kill switch forbids everything, even a passive observation", () => {
    const verdict = resolveAuthority(ctxFor("lead.observe", { killSwitch: true }), { now: NOW });
    assert.equal(verdict.authority, "FORBIDDEN");
    assert.deepEqual(verdict.appliedRules, ["kill_switch"]);
  });

  it("OBSERVE and ANALYZE are autonomous", () => {
    for (const action of ["lead.observe", "lead.score.recompute"]) {
      const verdict = resolveAuthority(ctxFor(action), { now: NOW });
      assert.equal(verdict.authority, "AUTONOMOUS", action);
    }
  });

  it("a passive capability is exempt from the confidence floor", () => {
    const verdict = resolveAuthority(ctxFor("lead.score.recompute", { confidence: 0.01 }), {
      now: NOW,
    });
    assert.equal(verdict.authority, "AUTONOMOUS");
  });

  it("RECOMMEND that is not externally visible stays autonomous", () => {
    const verdict = resolveAuthority(ctxFor("followup.draft"), { now: NOW });
    assert.equal(verdict.authority, "AUTONOMOUS");
    assert.ok(mayAct(verdict));
  });

  it("low confidence floors a RECOMMEND to APPROVAL_REQUIRED", () => {
    const verdict = resolveAuthority(ctxFor("followup.draft", { confidence: 0.2 }), { now: NOW });
    assert.equal(verdict.authority, "APPROVAL_REQUIRED");
    assert.ok(verdict.appliedRules.includes("low_confidence_floor"));
  });

  it("a degraded system floors EXECUTE to APPROVAL_REQUIRED", () => {
    const verdict = resolveAuthority(ctxFor("followup.email.send", { degraded: true }), {
      now: NOW,
    });
    assert.equal(verdict.authority, "APPROVAL_REQUIRED");
    assert.ok(verdict.appliedRules.includes("degraded_system_floor"));
  });

  it("every DENY_LIST action is FORBIDDEN", () => {
    for (const action of ["billing.charge", "prod.delete", "portal.scrape", "auto_deploy"]) {
      const verdict = resolveAuthority(ctxFor(action), { now: NOW });
      assert.equal(verdict.authority, "FORBIDDEN", action);
      assert.deepEqual(verdict.appliedRules, ["deny_list"]);
    }
  });

  it("an unregistered action is FORBIDDEN, not autonomous (fail-closed)", () => {
    const rogue: AuthorityContext = {
      agentId: "rogue",
      action: "invent.something",
      capability: "EXECUTE",
      tenantId: "tenant-1",
      actorRole: "agent",
      risk: "low",
      confidence: 1,
      reversible: true,
      externallyVisible: false,
      systemState: { degraded: false, killSwitch: false },
    };
    const verdict = resolveAuthority(rogue, { now: NOW });
    assert.equal(verdict.authority, "FORBIDDEN");
    assert.deepEqual(verdict.appliedRules, ["unregistered_action"]);
  });
});

describe("OD-9 — irreversibility is a floor, not a veto", () => {
  it("an irreversible externally visible send is APPROVAL_REQUIRED, never FORBIDDEN", () => {
    for (const action of ["followup.email.send", "followup.sms.send"]) {
      const verdict = resolveAuthority(ctxFor(action), { now: NOW });
      assert.equal(verdict.authority, "APPROVAL_REQUIRED", action);
      assert.notEqual(verdict.authority, "FORBIDDEN");
      assert.ok(verdict.appliedRules.includes("irreversible_floor"), action);
    }
  });

  it("a human approval unblocks an irreversible send — the v1.0 paradox is gone", () => {
    const verdict = resolveAuthority(ctxFor("followup.email.send"), { now: NOW });
    const approved = applyApproval(verdict, {
      approvalId: "appr-1",
      approvedBy: "founder",
      approvedAt: "2026-09-19T10:01:00.000Z",
    });
    assert.equal(approved.authority, "AUTONOMOUS");
    assert.equal(approved.approvalId, "appr-1");
    assert.ok(mayAct(approved));
  });

  it("policy cannot lower the floor below APPROVAL_REQUIRED", () => {
    const permissive: AuthorityPolicy = {
      ...DEFAULT_AUTHORITY_POLICY,
      minConfidence: 0,
      externallyVisibleOverride: { enabled: true, tenants: ["tenant-1"] },
    };
    const verdict = resolveAuthority(ctxFor("followup.email.send"), {
      policy: permissive,
      now: NOW,
    });
    assert.equal(verdict.authority, "APPROVAL_REQUIRED");
    assert.ok(verdict.appliedRules.includes("od10_override_requested_but_not_implemented"));
  });
});

describe("I-007 — FORBIDDEN is not overridable by an approval", () => {
  it("approving a DENY_LIST action leaves it FORBIDDEN", () => {
    const verdict = resolveAuthority(ctxFor("billing.charge"), { now: NOW });
    const approved = applyApproval(verdict, {
      approvalId: "appr-2",
      approvedBy: "founder",
      approvedAt: "2026-09-19T10:01:00.000Z",
    });
    assert.equal(approved.authority, "FORBIDDEN");
    assert.equal(approved.approvalId, null);
    assert.equal(mayAct(approved), false);
  });

  it("approving an already-autonomous verdict does not invent an approval", () => {
    const verdict = resolveAuthority(ctxFor("followup.draft"), { now: NOW });
    const approved = applyApproval(verdict, {
      approvalId: "appr-3",
      approvedBy: "founder",
      approvedAt: "2026-09-19T10:01:00.000Z",
    });
    assert.equal(approved.authority, "AUTONOMOUS");
    assert.equal(approved.approvalId, null);
  });
});

describe("U-L — the registry, not the caller, is the source of `reversible`", () => {
  it("a caller that declares an irreversible send reversible is FORBIDDEN", () => {
    const tampered: AuthorityContext = {
      ...ctxFor("followup.email.send"),
      reversible: true,
      risk: "low",
    };
    const verdict = resolveAuthority(tampered, { now: NOW });
    assert.equal(verdict.authority, "FORBIDDEN");
    assert.deepEqual(verdict.appliedRules, ["context_registry_mismatch"]);
  });

  it("a caller that downgrades EXECUTE to ANALYZE is FORBIDDEN", () => {
    const tampered: AuthorityContext = { ...ctxFor("followup.sms.send"), capability: "ANALYZE" };
    const verdict = resolveAuthority(tampered, { now: NOW });
    assert.equal(verdict.authority, "FORBIDDEN");
    assert.deepEqual(verdict.appliedRules, ["context_registry_mismatch"]);
  });
});

describe("resolveAuthority is a pure function", () => {
  it("returns an identical verdict for identical input", () => {
    const ctx = ctxFor("followup.email.send");
    const a = resolveAuthority(ctx, { now: NOW });
    const b = resolveAuthority(ctx, { now: NOW });
    assert.deepEqual(a, b);
  });

  it("does not mutate its input", () => {
    const ctx = ctxFor("followup.email.send");
    const snapshot = structuredClone(ctx);
    resolveAuthority(ctx, { now: NOW });
    assert.deepEqual(ctx, snapshot);
  });
});

describe("policy is data", () => {
  it("deny-list patterns match by prefix and exactly", () => {
    assert.equal(matchesDenyList("billing.charge", DEFAULT_AUTHORITY_POLICY.denyList), "billing.*");
    assert.equal(matchesDenyList("auto_deploy", DEFAULT_AUTHORITY_POLICY.denyList), "auto_deploy");
    assert.equal(matchesDenyList("followup.draft", DEFAULT_AUTHORITY_POLICY.denyList), null);
  });

  it("the OD-10 override ships disabled", () => {
    assert.equal(DEFAULT_AUTHORITY_POLICY.externallyVisibleOverride.enabled, false);
  });
});

describe("inbound.reply.email.send — live Tier-3 path (apps/crm approve-draft)", () => {
  const runtime = (killSwitch = false) => ({
    agentId: "REVOLIS-INBOUND-AUTOREPLY",
    tenantId: "agency-A",
    actorRole: "broker",
    confidence: 1,
    systemState: { degraded: false, killSwitch },
  });

  it("is registered as irreversible and externally visible", () => {
    const meta = lookupAction("inbound.reply.email.send");
    assert.ok(meta);
    assert.equal(meta.reversible, false);
    assert.equal(meta.externallyVisible, true);
    assert.equal(meta.capability, "EXECUTE");
  });

  it("requires approval without one, and becomes actionable only with one", () => {
    const ctx = buildAuthorityContext("inbound.reply.email.send", runtime());
    assert.ok(ctx);
    const verdict = resolveAuthority(ctx, { now: NOW });
    assert.equal(verdict.authority, "APPROVAL_REQUIRED");
    assert.equal(mayAct(verdict), false);
    const approved = applyApproval(verdict, {
      approvalId: "act-1",
      approvedBy: "makler@rk.sk",
      approvedAt: "2026-09-24T20:00:00.000Z",
    });
    assert.equal(mayAct(approved), true);
  });

  it("kill switch forbids it even with a human approval (I-007)", () => {
    const ctx = buildAuthorityContext("inbound.reply.email.send", runtime(true));
    assert.ok(ctx);
    const verdict = resolveAuthority(ctx, { now: NOW });
    assert.equal(verdict.authority, "FORBIDDEN");
    const approved = applyApproval(verdict, {
      approvalId: "act-1",
      approvedBy: "makler@rk.sk",
      approvedAt: "2026-09-24T20:00:00.000Z",
    });
    assert.equal(mayAct(approved), false);
  });
});

describe("dead-lead + outreach sends — every AI→client action floors at APPROVAL_REQUIRED", () => {
  for (const action of ["deadlead.email.send", "deadlead.sms.send", "outreach.email.send"]) {
    it(`${action} needs a human approval and is FORBIDDEN under the kill switch`, () => {
      const base = {
        agentId: "test-agent",
        tenantId: "agency-A",
        actorRole: "broker",
        confidence: 1,
      };
      const open = buildAuthorityContext(action, { ...base, systemState: { degraded: false, killSwitch: false } });
      assert.ok(open);
      assert.equal(resolveAuthority(open, { now: NOW }).authority, "APPROVAL_REQUIRED");

      const stopped = buildAuthorityContext(action, { ...base, systemState: { degraded: false, killSwitch: true } });
      assert.ok(stopped);
      assert.equal(resolveAuthority(stopped, { now: NOW }).authority, "FORBIDDEN");
    });
  }
});
