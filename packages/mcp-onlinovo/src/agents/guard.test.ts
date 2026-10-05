import assert from "node:assert/strict";
import { test } from "node:test";
import { WRITE_DISABLED_CODE } from "../policy.js";
import {
  actionVerdict,
  AGENT_ALLOWED,
  assertAgentAction,
  authorizeAgentAction,
  GuardError,
  killSwitchOn,
  lookupOnlAction,
  ONL_ACTIONS,
  policyStatusFor,
} from "./guard.js";

const NO_ENV = {} as NodeJS.ProcessEnv;
const OPP = "ONL-REVENUE-OPPORTUNITY";
const NEXT = "ONL-CUSTOMER-NEXT-ACTION";
const EXP = "ONL-EXPERIMENT";

test("a read is autonomous for the agent that owns it", () => {
  const d = authorizeAgentAction({ agentId: OPP, action: "onlinovo.data.observe" }, NO_ENV);
  assert.equal(d.allowed, true);
  assert.equal(d.verdict, "AUTONOMOUS");
  assert.equal(d.tier, 0);
});

test("a recommendation is autonomous with confidence and needs a human below the floor", () => {
  const ok = authorizeAgentAction({ agentId: OPP, action: "onlinovo.opportunity.recommend", confidence: 0.9 }, NO_ENV);
  assert.equal(ok.allowed, true);
  const low = authorizeAgentAction({ agentId: OPP, action: "onlinovo.opportunity.recommend", confidence: 0.4 }, NO_ENV);
  assert.equal(low.allowed, false);
  assert.equal(low.verdict, "APPROVAL_REQUIRED");
  assert.equal(low.code, "APPROVAL_REQUIRED");
});

test("customer-facing LeadHub actions are FORBIDDEN for every agent (no verified contract)", () => {
  for (const agentId of [OPP, NEXT, EXP]) {
    for (const action of [
      "onlinovo.campaign.send",
      "onlinovo.campaign.schedule",
      "onlinovo.campaign.update",
      "onlinovo.journey.write",
    ]) {
      const d = authorizeAgentAction({ agentId, action }, NO_ENV);
      assert.equal(d.allowed, false, `${agentId} ${action}`);
      assert.equal(d.verdict, "FORBIDDEN");
      assert.equal(d.code, "ACTION_BLOCKED_NO_VERIFIED_CONTRACT");
      assert.equal(d.tier, 3);
    }
  }
});

test("persisting a record is refused with the existing write-disabled code", () => {
  const d = authorizeAgentAction({ agentId: OPP, action: "onlinovo.record.persist" }, NO_ENV);
  assert.equal(d.allowed, false);
  assert.equal(d.code, WRITE_DISABLED_CODE);
});

test("price and consent changes are denied as owner decisions", () => {
  for (const action of ["onlinovo.price.change", "onlinovo.customer.permission.change"]) {
    const d = authorizeAgentAction({ agentId: OPP, action }, NO_ENV);
    assert.equal(d.allowed, false);
    assert.equal(d.code, "ACTION_DENIED_OWNER_DECISION");
  }
});

test("an agent cannot use another agent's action (missing permission)", () => {
  const d = authorizeAgentAction({ agentId: NEXT, action: "onlinovo.experiment.propose" }, NO_ENV);
  assert.equal(d.allowed, false);
  assert.equal(d.code, "ACTION_NOT_ALLOWED_FOR_AGENT");
  const d2 = authorizeAgentAction({ agentId: EXP, action: "onlinovo.opportunity.recommend" }, NO_ENV);
  assert.equal(d2.code, "ACTION_NOT_ALLOWED_FOR_AGENT");
});

test("an unknown agent and an unregistered capability are refused (fail-closed)", () => {
  assert.equal(authorizeAgentAction({ agentId: "ONL-ROGUE", action: "onlinovo.data.observe" }, NO_ENV).code, "AGENT_UNKNOWN");
  const d = authorizeAgentAction({ agentId: OPP, action: "onlinovo.leadhub.contact.upsert" }, NO_ENV);
  assert.equal(d.allowed, false);
  assert.equal(d.code, "CAPABILITY_UNSUPPORTED");
});

test("the kill switch stops every agent and every action, including reads", () => {
  for (const flag of ["1", "true", "TRUE", "on"]) {
    const env = { ONLINOVO_AGENTS_KILL_SWITCH: flag } as NodeJS.ProcessEnv;
    assert.equal(killSwitchOn(env), true, flag);
    for (const agentId of [OPP, NEXT, EXP]) {
      for (const action of AGENT_ALLOWED[agentId as keyof typeof AGENT_ALLOWED]) {
        const d = authorizeAgentAction({ agentId, action }, env);
        assert.equal(d.allowed, false, `${agentId} ${action}`);
        assert.equal(d.code, "KILL_SWITCH");
      }
    }
  }
  assert.equal(killSwitchOn({ ONLINOVO_AGENTS_KILL_SWITCH: "0" } as NodeJS.ProcessEnv), false);
  assert.equal(killSwitchOn(NO_ENV), false);
});

test("there is no approval path: a forged approval flag changes nothing", () => {
  const forged = { agentId: OPP, action: "onlinovo.campaign.send", approved: true, approvalId: "x" } as never;
  const d = authorizeAgentAction(forged, NO_ENV);
  assert.equal(d.allowed, false);
  assert.equal(d.verdict, "FORBIDDEN");
});

test("assertAgentAction throws GuardError carrying the decision", () => {
  assert.throws(
    () => assertAgentAction({ agentId: OPP, action: "onlinovo.campaign.send" }, NO_ENV),
    (err: unknown) => err instanceof GuardError && err.decision.code === "ACTION_BLOCKED_NO_VERIFIED_CONTRACT",
  );
  assert.doesNotThrow(() => assertAgentAction({ agentId: OPP, action: "onlinovo.data.observe" }, NO_ENV));
});

test("per-item policy status follows the confidence floor", () => {
  assert.equal(policyStatusFor("high"), "AUTONOMOUS");
  assert.equal(policyStatusFor("medium"), "AUTONOMOUS");
  assert.equal(policyStatusFor("low"), "APPROVAL_REQUIRED");
});

test("agent allow lists contain only ALLOWED actions that exist in the table", () => {
  for (const [agent, actions] of Object.entries(AGENT_ALLOWED)) {
    for (const action of actions) {
      const meta = lookupOnlAction(action);
      assert.ok(meta, `${agent} ${action}`);
      assert.equal(meta.status, "ALLOWED", `${agent} ${action}`);
    }
  }
  assert.equal(new Set(ONL_ACTIONS.map((a) => a.action)).size, ONL_ACTIONS.length);
});

test("the action-level verdict honours the kill switch on its own, not only through the agent gate", () => {
  const env = { ONLINOVO_AGENTS_KILL_SWITCH: "1" } as NodeJS.ProcessEnv;
  const d = actionVerdict("onlinovo.data.observe", 1, env);
  assert.equal(d.allowed, false);
  assert.equal(d.code, "KILL_SWITCH");
});

// ── P11 findings ──────────────────────────────────────────────────────────────────────────────

test("F11: the kill switch is fail-closed: only an explicit off spelling leaves the agents running", () => {
  const sw = (value: string | undefined) => killSwitchOn(value === undefined ? ({} as NodeJS.ProcessEnv) : ({ ONLINOVO_AGENTS_KILL_SWITCH: value } as NodeJS.ProcessEnv));
  for (const on of ["1", "true", "TRUE", "on", " On ", "yes", "enabled", "ture", "2", "stop"]) assert.equal(sw(on), true, on);
  for (const off of [undefined, "", "  ", "0", "false", "FALSE", "off", " Off ", "no", "disabled"]) assert.equal(sw(off), false, String(off));
});

test("F12: a confidence that is not a number never passes a recommendation, a passive read is unaffected", () => {
  for (const bad of [Number.NaN, undefined as unknown as number, "0.9" as unknown as number, null as unknown as number]) {
    const d = actionVerdict("onlinovo.opportunity.recommend", bad, NO_ENV);
    assert.equal(d.allowed, false, String(bad));
    assert.equal(d.verdict, "APPROVAL_REQUIRED", String(bad));
  }
  assert.equal(actionVerdict("onlinovo.data.observe", Number.NaN, NO_ENV).allowed, true);
  assert.equal(actionVerdict("onlinovo.opportunity.recommend", 0.6, NO_ENV).allowed, true);
});

test("N7: null, Infinity and a confidence above 1 never pass; only an absent confidence means full confidence", () => {
  for (const bad of [null, Number.POSITIVE_INFINITY, 1.0001, 7, Number.NEGATIVE_INFINITY, "0.9", Number.NaN]) {
    const d = authorizeAgentAction({ agentId: OPP, action: "onlinovo.opportunity.recommend", confidence: bad as never }, NO_ENV);
    assert.equal(d.allowed, false, String(bad));
    assert.equal(d.verdict, "APPROVAL_REQUIRED", String(bad));
  }
  assert.equal(authorizeAgentAction({ agentId: OPP, action: "onlinovo.opportunity.recommend" }, NO_ENV).allowed, true);
  assert.equal(authorizeAgentAction({ agentId: OPP, action: "onlinovo.opportunity.recommend", confidence: 1 }, NO_ENV).allowed, true);
  assert.equal(authorizeAgentAction({ agentId: OPP, action: "onlinovo.opportunity.recommend", confidence: 0.6 }, NO_ENV).allowed, true);
});

test("a Symbol or an object as confidence is refused cleanly, never a raw TypeError", () => {
  for (const odd of [Symbol("x"), {}, [0.9], () => 1]) {
    let d;
    assert.doesNotThrow(() => { d = actionVerdict("onlinovo.opportunity.recommend", odd as never, NO_ENV); }, String(typeof odd));
    assert.equal((d as unknown as { allowed: boolean }).allowed, false);
  }
});

test("a confidence whose own toString throws, a null-prototype object and a throwing Proxy are refused cleanly", () => {
  const throwing = { toString() { throw new Error("boom"); } };
  const nullProto = Object.create(null);
  const proxy = new Proxy({}, { get() { throw new Error("proxy"); } });
  for (const odd of [throwing, nullProto, proxy]) {
    let d;
    assert.doesNotThrow(() => { d = actionVerdict("onlinovo.opportunity.recommend", odd as never, NO_ENV); });
    assert.equal((d as unknown as { allowed: boolean }).allowed, false);
  }
});
