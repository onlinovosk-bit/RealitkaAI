import assert from "node:assert/strict";
import { test } from "node:test";
import { WRITE_DISABLED_CODE } from "./policy.js";
import { AGENT_ALLOWED } from "./agents/guard.js";
import { tools } from "./server.js";
import { runAgentTool } from "./tools/agent-support.js";
import { handleCustomerNextAction } from "./tools/customer-next-action.js";
import { handleExperimentPlan } from "./tools/experiment-plan.js";
import { handleRevenueOpportunities } from "./tools/revenue-opportunities.js";
import { handleWriteProduct } from "./tools/write-stub.js";

const NOW = new Date("2026-10-02T08:00:00.000Z");
const deps = (env: NodeJS.ProcessEnv = {}) => ({ env, now: () => NOW });

type Body = {
  success: boolean;
  request_id: string;
  data?: Record<string, any>;
  error?: { code: string; message: string };
};
const parse = (result: { content: Array<{ text: string }> }): Body => JSON.parse(result.content[0].text) as Body;

/** Captures the audit lines the shared logger writes to stderr while `fn` runs. */
async function withAudit<T>(fn: () => Promise<T>): Promise<{ value: T; lines: Array<Record<string, any>> }> {
  const lines: Array<Record<string, any>> = [];
  const original = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: string | Uint8Array) => {
    for (const line of String(chunk).split("\n")) {
      if (line.trim().startsWith("{")) lines.push(JSON.parse(line));
    }
    return true;
  }) as typeof process.stderr.write;
  try {
    return { value: await fn(), lines };
  } finally {
    process.stderr.write = original;
  }
}

const planArgs = (over: Record<string, unknown> = {}) => ({
  hypothesis: "A reorder reminder at day 45 raises the 90 day second purchase rate",
  control: "no reminder",
  treatment: "reminder at day 45",
  audience: { description: "single-order customers, 91-180 days", size: 2000 },
  primary_metric: "second_purchase_rate_90d",
  success_threshold: { metric: "second_purchase_rate_90d", min_difference: 0.03 },
  stop_conditions: [{ metric: "second_purchase_rate_90d", direction: "below", value: -0.05, description: "treatment is worse by 5 points" }],
  allocation: { control: 0.5, treatment: 0.5 },
  duration_days: 30,
  min_sample_per_arm: 600,
  ...over,
});

// ── registration ──────────────────────────────────────────────────────────────────────────────

test("the agent tools cannot be handed an approval, a clock or an environment through their schema", () => {
  const forbiddenProps = /approv|now|env|force|override|send|schedule|persist|write/i;
  for (const name of ["onlinovo_revenue_opportunities", "onlinovo_customer_next_action", "onlinovo_experiment_plan"]) {
    const tool = tools.find((t) => t.name === name);
    assert.ok(tool, name);
    const props = Object.keys((tool.inputSchema as { properties: object }).properties);
    for (const prop of props) assert.equal(forbiddenProps.test(prop), false, `${name}.${prop}`);
    assert.equal((tool.inputSchema as { additionalProperties?: boolean }).additionalProperties, false, name);
  }
});

// ── revenue opportunities ─────────────────────────────────────────────────────────────────────

test("opportunities on the fixture are labelled fixture, blocked from execution and carry no e-mail", async () => {
  const result = await handleRevenueOpportunities({}, deps());
  assert.equal(result.isError, undefined);
  assert.equal(result.content[0].text.includes("@"), false);
  const body = parse(result);
  assert.equal(body.success, true);
  assert.equal(body.data?.source, "fixture");
  assert.equal(body.data?.status, "OK");
  assert.equal(body.data?.data_quality.live, false);
  const types = (body.data?.opportunities as Array<{ type: string }>).map((o) => o.type);
  assert.deepEqual([...new Set(types)].sort(), ["REACTIVATION_POOL", "REORDER_WINDOW", "STOCKOUT_LEAK", "UNPAID_RECOVERY"]);
  for (const opp of body.data?.opportunities as Array<Record<string, any>>) {
    const next = opp.recommended_next_action;
    if (next.customer_facing) {
      assert.equal(next.requires_approval, true, opp.type);
      assert.equal(next.execution, "BLOCKED", opp.type);
      assert.equal(next.blocked_by, "onlinovo.campaign.send", opp.type);
    } else {
      assert.equal(next.execution, "HUMAN_ONLY", opp.type);
    }
    assert.equal(opp.estimated_value, null, "no assumptions were supplied, so there is no estimate");
  }
});

test("opportunities with explicit assumptions return a labelled estimate, invalid assumptions are refused", async () => {
  const ok = parse(
    await handleRevenueOpportunities(
      { assumptions: { vat_rate: 0.21, revenue_per_recipient_gross: { low: 5, high: 12 }, incremental_share: { low: 0.02, high: 0.06 } } },
      deps(),
    ),
  );
  assert.equal(ok.success, true);
  const withValue = (ok.data?.opportunities as Array<Record<string, any>>).filter((o) => o.estimated_value !== null);
  assert.ok(withValue.length >= 1);
  for (const opp of withValue) assert.equal(opp.estimated_value.kind, "ESTIMATE");

  for (const bad of [{ vat_rate: 2 }, { vat_rate: 0.21, incremental_share: { low: 0.5, high: 0.1 } }, "x"]) {
    const result = await handleRevenueOpportunities({ assumptions: bad }, deps());
    assert.equal(result.isError, true);
    assert.equal(parse(result).error?.code, "INVALID_INPUT");
  }
});

test("opportunities on an unconnected source are an honest empty run, an unsupported source is refused as unconnected", async () => {
  const unconnected = parse(await handleRevenueOpportunities({}, deps({ ONLINOVO_INTELLIGENCE_SOURCE: "unconnected" })));
  assert.equal(unconnected.data?.source, "unconnected");
  assert.equal(unconnected.data?.status, "UNCONNECTED");
  assert.deepEqual(unconnected.data?.opportunities, []);

  const live = parse(await handleRevenueOpportunities({}, deps({ ONLINOVO_INTELLIGENCE_SOURCE: "leadhub" })));
  assert.equal(live.data?.source, "unconnected");
  assert.equal(live.data?.intelligence_source_error, "INTELLIGENCE_SOURCE_UNSUPPORTED");
  assert.deepEqual(live.data?.opportunities, []);
});

// ── customer next action ──────────────────────────────────────────────────────────────────────

test("next action returns one recommendation, nothing is sent and the audit never carries the reference", async () => {
  const { value, lines } = await withAudit(() => handleCustomerNextAction({ customer_ref: "FIX-CUS-001" }, deps()));
  const body = parse(value);
  assert.equal(body.success, true);
  assert.equal(body.data?.source, "fixture");
  assert.equal(body.data?.decision.action, "REPLENISHMENT");
  assert.equal(body.data?.decision.next_step.requires_approval, true);
  assert.equal(body.data?.decision.next_step.execution, "BLOCKED");
  assert.equal(value.content[0].text.includes("@"), false);
  const audit = lines.map((l) => JSON.stringify(l)).join("\n");
  assert.equal(audit.includes("FIX-CUS-001"), false, "the audit trail must not contain the customer reference");
  const done = lines.find((l) => l.msg === "tool_done");
  assert.ok(done, "the run is audited");
  assert.equal(done.agent_id, "ONL-CUSTOMER-NEXT-ACTION");
  assert.equal(done.action, "onlinovo.data.observe,onlinovo.nextaction.recommend", "the audited action is the registry action, not the agent's answer");
  assert.equal(done.recommended, "REPLENISHMENT");
});

test("next action refuses an e-mail, a phone number, a non-string and a missing reference before reading any data", async () => {
  for (const ref of ["jan.novak@example.com", "+421900123456", "421 900 123 456", 12345, undefined]) {
    const result = await handleCustomerNextAction({ customer_ref: ref }, deps());
    assert.equal(result.isError, true, String(ref));
    const body = parse(result);
    assert.equal(body.success, false);
    assert.ok(["PII_IN_REF", "INVALID_INPUT"].includes(body.error?.code ?? ""), `${String(ref)} -> ${body.error?.code}`);
    assert.equal(result.content[0].text.includes("jan.novak"), false, "the refused value must not be echoed back");
  }
});

test("next action for an unknown customer is NO_ACTION, not an invented recommendation", async () => {
  const body = parse(await handleCustomerNextAction({ customer_ref: "FIX-CUS-999" }, deps()));
  assert.equal(body.success, true);
  assert.equal(body.data?.decision.action, "NO_ACTION");
  assert.equal(body.data?.decision.next_step, null);
});

test("next action on an unconnected source is NO_ACTION with the source named", async () => {
  const body = parse(await handleCustomerNextAction({ customer_ref: "FIX-CUS-001" }, deps({ ONLINOVO_INTELLIGENCE_SOURCE: "unconnected" })));
  assert.equal(body.data?.source, "unconnected");
  assert.equal(body.data?.decision.action, "NO_ACTION");
  assert.equal(body.data?.decision.policy_status, "BLOCKED_SOURCE_UNCONNECTED");
});

// ── experiment plan ───────────────────────────────────────────────────────────────────────────

test("an experiment plan is PROPOSED, not persisted and not started", async () => {
  const body = parse(await handleExperimentPlan(planArgs(), deps()));
  assert.equal(body.success, true);
  assert.equal(body.data?.persisted, false);
  assert.equal(body.data?.experiment.state, "PROPOSED");
  assert.equal(body.data?.experiment.approval, null);
  assert.equal(body.data?.experiment.lock_hash, null);
  assert.equal(body.data?.experiment.planned_power, "ADEQUATE_POSSIBLE");
});

test("a plan the audience cannot power is marked indicative before it starts", async () => {
  const body = parse(await handleExperimentPlan(planArgs({ audience: { description: "small", size: 200 } }), deps()));
  assert.equal(body.data?.experiment.planned_power, "INDICATIVE_ONLY");
});

test("an experiment plan without a threshold, a stop condition, a sample plan or a registered KPI is refused", async () => {
  const cases: Array<[Record<string, unknown>, string]> = [
    [{ success_threshold: undefined }, "THRESHOLD_REQUIRED"],
    [{ stop_conditions: [] }, "STOP_CONDITION_REQUIRED"],
    [{ min_sample_per_arm: undefined }, "SAMPLE_PLAN_REQUIRED"],
    [{ primary_metric: "open_rate", success_threshold: { metric: "open_rate", min_difference: 0.05 } }, "UNKNOWN_KPI"],
    [{ hypothesis: "  " }, "INVALID_INPUT"],
  ];
  for (const [over, code] of cases) {
    const result = await handleExperimentPlan(planArgs(over), deps());
    assert.equal(result.isError, true, code);
    assert.equal(parse(result).error?.code, code);
  }
});

test("an experiment plan with a malformed shape is INVALID_INPUT, not an internal error", async () => {
  for (const args of ["x", null, planArgs({ audience: "everyone" }), planArgs({ stop_conditions: "stop" }), planArgs({ allocation: 5 })]) {
    const result = await handleExperimentPlan(args, deps());
    assert.equal(result.isError, true);
    assert.equal(parse(result).error?.code, "INVALID_INPUT");
  }
});

// ── guard in front of every tool ──────────────────────────────────────────────────────────────

const callers: Array<[string, (a: unknown, d?: ReturnType<typeof deps>) => Promise<{ content: Array<{ text: string }>; isError?: true }>, unknown]> = [
  ["opportunities", handleRevenueOpportunities, {}],
  ["next action", handleCustomerNextAction, { customer_ref: "FIX-CUS-001" }],
  ["experiment plan", handleExperimentPlan, planArgs()],
];

test("a requested customer-facing action is refused by every tool: blocked, no approval can unlock it", async () => {
  for (const [name, call, args] of callers) {
    for (const action of ["campaign.send", "campaign.schedule", "campaign.update", "journey.write", "onlinovo.campaign.send"]) {
      const { value, lines } = await withAudit(() => call({ ...(args as object), requested_action: action }, deps()));
      assert.equal(value.isError, true, `${name} ${action}`);
      assert.equal(parse(value).error?.code, "ACTION_BLOCKED_NO_VERIFIED_CONTRACT", `${name} ${action}`);
      assert.ok(lines.some((l) => l.msg === "tool_done" && l.denied === true), "a refusal is audited");
    }
  }
});

test("a requested owner-decision, persistence or unregistered action is refused with its own code", async () => {
  for (const [name, call, args] of callers) {
    const cases: Array<[string, string]> = [
      ["price.change", "ACTION_DENIED_OWNER_DECISION"],
      ["customer.permission.change", "ACTION_DENIED_OWNER_DECISION"],
      ["record.persist", "WRITE_DISABLED_IN_MVP"],
      ["leadhub.contact.upsert", "CAPABILITY_UNSUPPORTED"],
      ["", ""],
    ];
    for (const [action, code] of cases) {
      const result = await call({ ...(args as object), requested_action: action }, deps());
      if (action === "") {
        assert.equal(result.isError, undefined, `${name}: an empty requested_action means none was requested`);
        continue;
      }
      assert.equal(result.isError, true, `${name} ${action}`);
      assert.equal(parse(result).error?.code, code, `${name} ${action}`);
    }
  }
});

test("an action that is allowed for another agent is not allowed for this one", async () => {
  const wrong: Array<[typeof callers[number], string]> = [
    [callers[0], "nextaction.recommend"],
    [callers[1], "opportunity.recommend"],
    [callers[2], "opportunity.analyze"],
  ];
  for (const [[name, call, args], action] of wrong) {
    const result = await call({ ...(args as object), requested_action: action }, deps());
    assert.equal(result.isError, true, name);
    assert.equal(parse(result).error?.code, "ACTION_NOT_ALLOWED_FOR_AGENT", name);
  }
});

test("a non-string or oversized requested_action is refused, never coerced into an allowed one", async () => {
  for (const [name, call, args] of callers) {
    for (const action of [42, { a: 1 }, "x".repeat(101)]) {
      const result = await call({ ...(args as object), requested_action: action }, deps());
      assert.equal(result.isError, true, `${name} ${typeof action}`);
    }
  }
});

test("the kill switch stops every agent tool before any data is read", async () => {
  for (const [name, call, args] of callers) {
    const result = await call(args, deps({ ONLINOVO_AGENTS_KILL_SWITCH: "1" }));
    assert.equal(result.isError, true, name);
    assert.equal(parse(result).error?.code, "KILL_SWITCH", name);
  }
});

test("a tool answer that contains an e-mail or phone number is withheld, never returned", async () => {
  for (const leaked of ["jan.novak@example.com", "+421 900 123 456"]) {
    const result = await runAgentTool({
      tool: "onlinovo_revenue_opportunities",
      agentId: "ONL-REVENUE-OPPORTUNITY",
      actions: ["onlinovo.data.observe"],
      args: {},
      deps: deps(),
      run: async () => ({ note: `contact ${leaked}` }),
    });
    assert.equal(result.isError, true, leaked);
    const body = parse(result);
    assert.equal(body.success, false);
    assert.equal(body.error?.code, "PII_IN_PAYLOAD");
    assert.equal(result.content[0].text.includes(leaked), false, "the leaked value must not be echoed");
  }
});

test("an unexpected failure inside an agent is INTERNAL_ERROR without its message", async () => {
  const result = await runAgentTool({
    tool: "onlinovo_revenue_opportunities",
    agentId: "ONL-REVENUE-OPPORTUNITY",
    actions: ["onlinovo.data.observe"],
    args: {},
    deps: deps(),
    run: async () => {
      throw new Error("secret connection string postgres://user:pw@host");
    },
  });
  assert.equal(result.isError, true);
  const body = parse(result);
  assert.equal(body.error?.code, "INTERNAL_ERROR");
  assert.equal(result.content[0].text.includes("postgres"), false);
});

test("every tool audits the exact registry actions of its agent, and a summary cannot overwrite who acted", async () => {
  const runs: Array<[string, () => Promise<unknown>, string]> = [
    ["onlinovo_revenue_opportunities", () => handleRevenueOpportunities({}, deps()), AGENT_ALLOWED["ONL-REVENUE-OPPORTUNITY"].join(",")],
    ["onlinovo_customer_next_action", () => handleCustomerNextAction({ customer_ref: "FIX-CUS-001" }, deps()), AGENT_ALLOWED["ONL-CUSTOMER-NEXT-ACTION"].join(",")],
    ["onlinovo_experiment_plan", () => handleExperimentPlan(planArgs(), deps()), "onlinovo.experiment.propose"],
  ];
  for (const [tool, run, actions] of runs) {
    const { lines } = await withAudit(run);
    const done = lines.find((l) => l.msg === "tool_done");
    assert.ok(done, tool);
    assert.equal(done.tool, tool);
    assert.equal(done.action, actions, tool);
    assert.equal(done.verdict, "AUTONOMOUS", tool);
  }

  const { lines } = await withAudit(() =>
    runAgentTool({
      tool: "onlinovo_revenue_opportunities",
      agentId: "ONL-REVENUE-OPPORTUNITY",
      actions: ["onlinovo.data.observe"],
      args: {},
      deps: deps(),
      run: async () => ({ ok: true }),
      summarize: () => ({ action: "onlinovo.campaign.send", agent_id: "SOMEONE-ELSE", verdict: "APPROVED" }),
    }),
  );
  const done = lines.find((l) => l.msg === "tool_done");
  assert.equal(done?.action, "onlinovo.data.observe");
  assert.equal(done?.agent_id, "ONL-REVENUE-OPPORTUNITY");
  assert.equal(done?.verdict, "AUTONOMOUS");
});

// ── the existing write stub is untouched ──────────────────────────────────────────────────────

test("the write stub is still denied after the agent tools were added", async () => {
  const result = await handleWriteProduct({ sku: "FIX-SKU-001" });
  assert.equal(result.isError, true);
  assert.equal(parse(result).error?.code, WRITE_DISABLED_CODE);
});
