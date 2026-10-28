import test from "node:test";
import assert from "node:assert/strict";
import {
  CONFIGURED_SNAPSHOT_LABEL,
  COST_GOVERNOR_VERSION,
  CostGovernor,
  FileCostLedger,
  INTERNAL_GOVERNOR_LIMITS,
  UnavailableCostLedger,
  contractFromBusTask,
  defaultGovernorConfig,
  parseGovernorConfig,
  type CostLedger,
  type GovernorConfig,
  type LedgerIo,
  type TaskContractInput,
} from "../src/cost-governor.ts";
import type { BusEnvelope } from "../src/types.ts";

const NOW = new Date("2026-10-15T12:00:00.000Z");

function catalog(): GovernorConfig["catalog"] {
  return {
    version: COST_GOVERNOR_VERSION,
    as_of: "2026-10-15",
    source_label: CONFIGURED_SNAPSHOT_LABEL,
    entries: [
      { provider: "anthropic", model: "sonnet", max_estimate_usd: 5 },
      { provider: "anthropic", model: "haiku", max_estimate_usd: 0.2 },
      { provider: "anthropic", model: "opus", max_estimate_usd: 5 },
    ],
  };
}

function governor(over: Partial<GovernorConfig> = {}, ledger?: CostLedger): CostGovernor {
  let sequence = 0;
  return new CostGovernor(
    {
      version: COST_GOVERNOR_VERSION,
      limits: { ...INTERNAL_GOVERNOR_LIMITS },
      catalog: catalog(),
      ...over,
    },
    ledger,
    () => `res_${++sequence}`,
  );
}

function contract(over: Partial<TaskContractInput> = {}): TaskContractInput {
  return {
    task_id: "TASK-1",
    requester: "sol-gpt",
    purpose: "read one file",
    risk: "low",
    provider: "anthropic",
    model: "sonnet",
    estimated_cost_usd: 0.1,
    max_cost_usd: 0.1,
    daily_remaining_usd: INTERNAL_GOVERNOR_LIMITS.daily_usd,
    monthly_remaining_usd: INTERNAL_GOVERNOR_LIMITS.monthly_usd,
    acceptance_criteria: ["the reply matches the contract"],
    approval_gate: "AUTO-SAFE",
    timeout_ms: 30_000,
    retry_attempt: 0,
    side_effects: [],
    ...over,
  };
}

test("1 task under the limit is ALLOW and reserves a hold with actual still null", async () => {
  const gate = governor();
  const decision = await gate.authorize(contract(), NOW);
  assert.equal(decision.decision, "ALLOW");
  assert.equal(decision.actual_cost_usd, null);
  assert.equal(decision.estimated_cost_usd, 0.1);
  assert.equal(decision.hold_usd, 0.1);
  const [entry] = await gate.entries();
  assert.equal(entry?.actual_cost_usd, null);
  assert.equal(entry?.estimated_cost_usd, 0.1);
  assert.equal(entry?.cost_source, null);
});

test("2 remaining budget at the warn ratio is WARN and still reserves", async () => {
  const gate = governor({
    limits: { ...INTERNAL_GOVERNOR_LIMITS, per_task_usd: 5 },
  });
  const first = await gate.authorize(contract({ task_id: "TASK-A", estimated_cost_usd: 3.9, max_cost_usd: 3.9 }), NOW);
  assert.equal(first.decision, "ALLOW");
  const second = await gate.authorize(contract({ task_id: "TASK-B", estimated_cost_usd: 0.2, max_cost_usd: 0.2 }), NOW);
  assert.equal(second.decision, "WARN");
  assert.equal(second.actual_cost_usd, null);
  assert.equal(second.reservation_id, "res_2");
});

test("3 a model above the per-task ceiling downgrades without reserving or switching", async () => {
  const gate = governor({ downgrade_to: { provider: "anthropic", model: "haiku" } });
  const decision = await gate.authorize(
    contract({ model: "opus", estimated_cost_usd: 2, max_cost_usd: 2 }),
    NOW,
  );
  assert.equal(decision.decision, "DOWNGRADE");
  assert.deepEqual(decision.suggested_model, { provider: "anthropic", model: "haiku" });
  assert.equal(decision.reservation_id, null);
  assert.equal((await gate.entries()).length, 0);
});

test("4 missing budget and an unknown price fail closed", async () => {
  const gate = governor();
  const missing = await gate.authorize(contract({ daily_remaining_usd: undefined }), NOW);
  assert.equal(missing.decision, "BLOCK");
  assert.equal(missing.code, "invalid_contract");
  const unknown = await gate.authorize(contract({ provider: "openai", model: "gpt-4o" }), NOW);
  assert.equal(unknown.decision, "BLOCK");
  assert.equal(unknown.code, "unknown_price");
  assert.equal((await gate.entries()).length, 0);
});

test("5 task, day and month ceilings block", async () => {
  const perTask = await governor().authorize(contract({ estimated_cost_usd: 0.8, max_cost_usd: 0.8 }), NOW);
  assert.equal(perTask.code, "per_task_limit");

  const daily = governor({ limits: { ...INTERNAL_GOVERNOR_LIMITS, per_task_usd: 5 } });
  assert.equal((await daily.authorize(contract({ task_id: "D1", estimated_cost_usd: 3, max_cost_usd: 3 }), NOW)).decision, "ALLOW");
  const overDay = await daily.authorize(contract({ task_id: "D2", estimated_cost_usd: 2.1, max_cost_usd: 2.1 }), NOW);
  assert.equal(overDay.code, "daily_limit");

  const declared = await governor().authorize(
    contract({ task_id: "M0", estimated_cost_usd: 0.2, max_cost_usd: 0.2, monthly_remaining_usd: 0.1 }),
    NOW,
  );
  assert.equal(declared.code, "monthly_limit");
  const monthly = governor({ limits: { ...INTERNAL_GOVERNOR_LIMITS, per_task_usd: 5, daily_usd: 5, monthly_usd: 5 } });
  assert.equal(
    (await monthly.authorize(
      contract({ task_id: "M1", estimated_cost_usd: 3.5, max_cost_usd: 3.5 }),
      new Date("2026-10-14T12:00:00.000Z"),
    )).decision,
    "ALLOW",
  );
  const overMonth = await monthly.authorize(
    contract({ task_id: "M2", estimated_cost_usd: 1.6, max_cost_usd: 1.6 }),
    new Date("2026-10-15T12:00:00.000Z"),
  );
  assert.equal(overMonth.code, "monthly_limit");
});

test("6 a cheaper model still cannot spend past the snapshot or the remaining budget", async () => {
  const gate = governor({ downgrade_to: { provider: "anthropic", model: "haiku" } });
  const downgrade = await gate.authorize(contract({ model: "opus", estimated_cost_usd: 2, max_cost_usd: 2 }), NOW);
  assert.equal(downgrade.decision, "DOWNGRADE");
  const aboveSnapshot = await gate.authorize(
    contract({ task_id: "TASK-H", model: "haiku", estimated_cost_usd: 2, max_cost_usd: 2 }),
    NOW,
  );
  assert.equal(aboveSnapshot.code, "estimate_above_snapshot");
  const aboveBudget = await gate.authorize(
    contract({
      task_id: "TASK-H2",
      model: "haiku",
      estimated_cost_usd: 0.2,
      max_cost_usd: 0.2,
      daily_remaining_usd: 0.05,
    }),
    NOW,
  );
  assert.equal(aboveBudget.code, "daily_limit");
  assert.equal((await gate.entries()).length, 0);
});

test("7 parallel reservations cannot spend the same remainder twice", async () => {
  const gate = governor({ limits: { ...INTERNAL_GOVERNOR_LIMITS, per_task_usd: 1, daily_usd: 1 } });
  const [left, right] = await Promise.all([
    gate.authorize(contract({ task_id: "P1", estimated_cost_usd: 0.6, max_cost_usd: 0.6 }), NOW),
    gate.authorize(contract({ task_id: "P2", estimated_cost_usd: 0.6, max_cost_usd: 0.6 }), NOW),
  ]);
  const decisions = [left.decision, right.decision].sort();
  assert.deepEqual(decisions, ["ALLOW", "BLOCK"]);
  const rows = await gate.entries();
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.hold_usd, 0.6);
});

test("8 an unavailable ledger blocks and stores nothing the caller can treat as spent", async () => {
  const gate = governor({}, new UnavailableCostLedger());
  const decision = await gate.authorize(contract(), NOW);
  assert.equal(decision.decision, "BLOCK");
  assert.equal(decision.code, "ledger_failure");
  assert.equal(decision.reservation_id, null);
});

test("9 an estimate is never stored as actual, and a missing actual is not zero", async () => {
  const gate = governor();
  const decision = await gate.authorize(contract(), NOW);
  const settled = await gate.settle(decision.reservation_id!, { actual_cost_usd: null, cost_source: "unavailable" }, NOW);
  assert.equal(settled.ok, true);
  if (!settled.ok) return;
  assert.equal(settled.entry.estimated_cost_usd, 0.1);
  assert.equal(settled.entry.actual_cost_usd, null);
  assert.equal(settled.entry.cost_source, "unavailable");
  assert.notEqual(settled.entry.actual_cost_usd, settled.entry.estimated_cost_usd);

  const priced = governor();
  const allowed = await priced.authorize(contract({ task_id: "TASK-ACT" }), NOW);
  const usage = await priced.settle(allowed.reservation_id!, { actual_cost_usd: 0.4, cost_source: "provider_usage" }, NOW);
  assert.equal(usage.ok, true);
  if (!usage.ok) return;
  assert.equal(usage.entry.estimated_cost_usd, 0.1);
  assert.equal(usage.entry.actual_cost_usd, 0.4);
  assert.equal(usage.entry.overage_usd, 0.3);
  assert.equal(usage.entry.cost_source, "provider_usage");
});

test("10 retry limit, timeout and an in-flight reservation block another call", async () => {
  const gate = governor();
  const first = await gate.authorize(contract(), NOW);
  assert.equal(first.decision, "ALLOW");
  const inflight = await gate.authorize(contract({ retry_attempt: 1 }), NOW);
  assert.equal(inflight.code, "in_flight");
  await gate.settle(first.reservation_id!, { actual_cost_usd: null, cost_source: "unavailable" }, NOW);
  const retry = await gate.authorize(contract({ retry_attempt: 1 }), NOW);
  assert.equal(retry.code, "retry_limit");
  const timeout = await governor().authorize(contract({ timeout_ms: INTERNAL_GOVERNOR_LIMITS.max_timeout_ms + 1 }), NOW);
  assert.equal(timeout.code, "timeout");
  assert.equal((await gate.entries()).length, 1);
});

test("11 GO REQUIRED survives ack and does not reserve", async () => {
  const gate = governor();
  const decision = await gate.authorize(contract({ approval_gate: "GO REQUIRED", acked: true }), NOW);
  assert.equal(decision.decision, "ESCALATE");
  assert.equal(decision.code, "go_required");
  assert.match(decision.reason, /survives ack/);
  assert.equal((await gate.entries()).length, 0);
});

test("12 STOP and the kill switch block", async () => {
  const gate = governor();
  assert.equal((await gate.authorize(contract({ approval_gate: "STOP" }), NOW)).code, "stop");
  assert.equal((await gate.authorize(contract({ kill_switch: true }), NOW)).code, "kill_switch");
  assert.equal((await gate.entries()).length, 0);
});

test("13 forbidden side effects and capabilities are refused", async () => {
  const effects = await governor().authorize(contract({ side_effects: ["billing.charge"] }), NOW);
  assert.equal(effects.code, "forbidden_side_effect");
  const capability = await governor({ capability_allowlist: ["bus-alive"] }).authorize(
    contract({ capability_id: "portal-scrape" }),
    NOW,
  );
  assert.equal(capability.code, "capability_denied");
});

test("14 a missing version or a live-price label fails closed", async () => {
  const missing = await governor({ version: "" }).authorize(contract(), NOW);
  assert.equal(missing.code, "invalid_config");
  const live = parseGovernorConfig({
    version: COST_GOVERNOR_VERSION,
    limits: { ...INTERNAL_GOVERNOR_LIMITS },
    catalog: { ...catalog(), source_label: "vendor_live" },
  });
  assert.equal(live.ok, false);
  const broken = await governor({ load_error: "config file unreadable" }).authorize(contract(), NOW);
  assert.equal(broken.code, "invalid_config");
  assert.match(broken.reason, /unreadable/);
});

test("15 the default catalog is empty and these tests do not call a provider", async () => {
  const config = defaultGovernorConfig();
  assert.equal(config.catalog.entries.length, 0);
  assert.equal(config.catalog.source_label, CONFIGURED_SNAPSHOT_LABEL);
  assert.equal(config.limits.daily_usd, 5);
  assert.notEqual(config.limits.monthly_usd, 100);
  const decision = await new CostGovernor(config).authorize(contract({ capability_id: "bus-alive" }), NOW);
  assert.equal(decision.code, "unknown_price");
  assert.equal(decision.actual_cost_usd, null);
});

test("secrets in the purpose are redacted before they reach the ledger", async () => {
  const gate = governor();
  await gate.authorize(
    contract({ purpose: "use sk-ant-api03-supersecretvalue and api_key=abcd1234" }),
    NOW,
  );
  const [entry] = await gate.entries();
  assert.match(entry!.purpose_redacted, /\[redacted\]/);
  assert.equal(entry!.purpose_redacted.includes("supersecretvalue"), false);
  assert.equal(entry!.purpose_redacted.includes("abcd1234"), false);
});

test("UTC calendar boundaries reset the day without using a local midnight", async () => {
  const gate = governor({ limits: { ...INTERNAL_GOVERNOR_LIMITS, per_task_usd: 0.5, daily_usd: 0.5 } });
  const first = await gate.authorize(contract({ estimated_cost_usd: 0.2, max_cost_usd: 0.2 }), new Date("2026-10-14T12:00:00.000Z"));
  assert.equal(first.decision, "ALLOW");
  const bratislavaEvening = await gate.authorize(
    contract({ task_id: "TASK-TZ", estimated_cost_usd: 0.4, max_cost_usd: 0.4 }),
    new Date("2026-10-15T00:30:00.000+02:00"),
  );
  assert.equal(bratislavaEvening.code, "daily_limit");
  const nextUtcDay = await gate.authorize(
    contract({ task_id: "TASK-NEXT", estimated_cost_usd: 0.2, max_cost_usd: 0.2 }),
    new Date("2026-10-15T00:00:00.000Z"),
  );
  assert.equal(nextUtcDay.decision, "ALLOW");
  const rows = await gate.entries();
  assert.equal(rows.find((entry) => entry.task_id === "TASK-1")?.day_key, "2026-10-14");
  assert.equal(rows.find((entry) => entry.task_id === "TASK-NEXT")?.day_key, "2026-10-15");
  assert.equal(rows.every((entry) => entry.month_key === "2026-10"), true);
});

test("a file ledger survives a new governor and a corrupt file blocks", async () => {
  const files = new Map<string, string>();
  const io: LedgerIo = {
    read: async (file) => files.get(file),
    write: async (file, contents) => {
      files.set(file, contents);
    },
  };
  const tight = {
    ...openConfig(),
    limits: { ...INTERNAL_GOVERNOR_LIMITS, per_task_usd: 0.5, daily_usd: 0.5 },
  };
  const first = new CostGovernor(tight, new FileCostLedger("budget.json", io), () => "res_file");
  const allowed = await first.authorize(contract({ estimated_cost_usd: 0.2, max_cost_usd: 0.2 }), NOW);
  assert.equal(allowed.decision, "ALLOW");
  const second = new CostGovernor(tight, new FileCostLedger("budget.json", io), () => "res_next");
  const blocked = await second.authorize(contract({ task_id: "TASK-2", estimated_cost_usd: 0.4, max_cost_usd: 0.4 }), NOW);
  assert.equal(blocked.code, "daily_limit");

  files.set("broken.json", "{");
  const broken = new CostGovernor(openConfig(), new FileCostLedger("broken.json", io), () => "res_bad");
  const failed = await broken.authorize(contract(), NOW);
  assert.equal(failed.code, "ledger_failure");
});

test("a bus task without cost counters is not a spendable contract", async () => {
  const task = {
    v: 1,
    id: "TASK-BUS",
    type: "task",
    status: "open",
    from: "sol-gpt",
    to: "claude-code",
    created_at: NOW.toISOString(),
    mode: "READ_ONLY",
    summary: "BUS ALIVE check",
    next_action: { gate: "AUTO-SAFE", description: "Reply BUS ALIVE" },
    body: "",
  } as BusEnvelope;
  const input = contractFromBusTask(task, { model: "sonnet", timeoutMs: 30_000, capabilityId: "bus-alive" });
  const decision = await governor({ capability_allowlist: ["bus-alive"] }).authorize(input, NOW);
  assert.equal(decision.code, "invalid_contract");
  assert.equal(decision.actual_cost_usd, null);
});

function openConfig(): GovernorConfig {
  return {
    version: COST_GOVERNOR_VERSION,
    limits: { ...INTERNAL_GOVERNOR_LIMITS },
    catalog: catalog(),
  };
}
