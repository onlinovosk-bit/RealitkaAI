import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildAuthorityContext,
  DEFAULT_AUTHORITY_POLICY,
  lookupAction,
  registeredActions,
  resolveAuthority,
} from "../../../control-contract/src/index.ts";
import { actionVerdict, AGENT_ALLOWED, MIN_CONFIDENCE, ONL_ACTIONS } from "./guard.js";

/**
 * The runtime guard in this package is a local mirror of the Control Contract registry (mcp-onlinovo
 * cannot import the contract under NodeNext). A mirror can drift, so this test compares it with
 * `resolveAuthority` for every ONLINOVO action, every confidence that matters and both kill-switch states.
 * The registry is the truth; if the two disagree, the guard is wrong.
 */
const CONFIDENCES = [0, 0.3, 0.4, 0.59, 0.6, 0.61, 0.7, 0.9, 1];
const NO_ENV = {} as NodeJS.ProcessEnv;
const KILLED = { ONLINOVO_AGENTS_KILL_SWITCH: "1" } as NodeJS.ProcessEnv;

const authority = (action: string, confidence: number, killSwitch: boolean) => {
  const ctx = buildAuthorityContext(action, {
    agentId: "ONL-REVENUE-OPPORTUNITY",
    tenantId: "onlinovo",
    actorRole: "agent",
    confidence,
    systemState: { degraded: false, killSwitch },
  });
  assert.ok(ctx, `${action} must be registered`);
  return resolveAuthority(ctx, { now: () => new Date("2026-10-02T08:00:00.000Z") });
};

test("the guard and the registry know exactly the same ONLINOVO actions", () => {
  const registry = registeredActions().filter((a) => a.startsWith("onlinovo.")).sort();
  const local = ONL_ACTIONS.map((a) => a.action).sort();
  assert.deepEqual(local, registry);
});

test("the confidence floor is the same number in the guard and in the policy", () => {
  assert.equal(MIN_CONFIDENCE, DEFAULT_AUTHORITY_POLICY.minConfidence);
});

test("capability and blocked/denied state agree with the registry for every action", () => {
  for (const a of ONL_ACTIONS) {
    const meta = lookupAction(a.action);
    assert.ok(meta, a.action);
    assert.equal(a.capability, meta.capability, a.action);
    assert.equal(a.status !== "ALLOWED", meta.denied, a.action);
    if (a.status === "ALLOWED") {
      assert.equal(meta.reversible, true, a.action);
      assert.equal(meta.externallyVisible, false, a.action);
    }
    if (a.tier === 3) assert.equal(a.status !== "ALLOWED", true, `${a.action}: a tier 3 action can never be allowed in this build`);
  }
});

test("the guard verdict equals resolveAuthority for every action x confidence x kill switch", () => {
  let compared = 0;
  for (const a of ONL_ACTIONS) {
    for (const confidence of CONFIDENCES) {
      for (const killSwitch of [false, true]) {
        const local = actionVerdict(a.action, confidence, killSwitch ? KILLED : NO_ENV);
        const truth = authority(a.action, confidence, killSwitch);
        const label = `${a.action} @${confidence} kill=${killSwitch}`;
        assert.equal(local.verdict, truth.authority, label);
        assert.equal(local.allowed, truth.authority === "AUTONOMOUS", label);
        compared += 1;
      }
    }
  }
  assert.equal(compared, ONL_ACTIONS.length * CONFIDENCES.length * 2);
});

test("an unregistered action is FORBIDDEN in both, whatever the confidence", () => {
  for (const action of ["onlinovo.leadhub.contact.upsert", "onlinovo.campaign.delete", "campaign.send", ""]) {
    assert.equal(lookupAction(action), null, action);
    assert.equal(actionVerdict(action, 1, NO_ENV).verdict, "FORBIDDEN", action);
    const ctx = buildAuthorityContext("onlinovo.data.observe", {
      agentId: "ONL-REVENUE-OPPORTUNITY",
      tenantId: "onlinovo",
      actorRole: "agent",
      confidence: 1,
      systemState: { degraded: false, killSwitch: false },
    });
    assert.ok(ctx);
    assert.equal(resolveAuthority({ ...ctx, action }).authority, "FORBIDDEN", action);
  }
});

test("every action an agent may take is autonomous in the registry at the guard's own floor", () => {
  for (const [agentId, actions] of Object.entries(AGENT_ALLOWED)) {
    for (const action of actions) {
      assert.equal(authority(action, MIN_CONFIDENCE, false).authority, "AUTONOMOUS", `${agentId} ${action}`);
    }
  }
});

test("no agent may take a customer-facing action: the registry forbids every one of them", () => {
  for (const [agentId, actions] of Object.entries(AGENT_ALLOWED)) {
    for (const action of actions) {
      const meta = lookupAction(action);
      assert.ok(meta, `${agentId} ${action}`);
      assert.equal(meta.externallyVisible, false, `${agentId} ${action}`);
      assert.equal(meta.externalProvider, null, `${agentId} ${action}`);
    }
  }
});

test("N9: for a confidence that is not a plain number the local guard is never MORE permissive than the registry", () => {
  const rank = { AUTONOMOUS: 0, APPROVAL_REQUIRED: 1, FORBIDDEN: 2 } as const;
  for (const a of ONL_ACTIONS) {
    for (const odd of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1.5, -1]) {
      const local = actionVerdict(a.action, odd, NO_ENV).verdict;
      const truth = authority(a.action, odd, false).authority;
      assert.ok(rank[local] >= rank[truth], `${a.action} @${String(odd)}: local ${local} is more permissive than the registry ${truth}`);
    }
  }
  // Known, documented difference: the registry's own floor test `confidence < min` lets NaN through as AUTONOMOUS.
  assert.equal(authority("onlinovo.opportunity.recommend", Number.NaN, false).authority, "AUTONOMOUS", "registry gap, proposed for a separate change");
  assert.equal(actionVerdict("onlinovo.opportunity.recommend", Number.NaN, NO_ENV).allowed, false);
});
