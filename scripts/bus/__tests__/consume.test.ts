/**
 * Integration tests: the consumer against a real HTTP bus over a real store.
 *
 * Only the Claude Code process is substituted — spawning a real one would make
 * these tests cost money and need network. The live dogfood is what proves the
 * real executor; these prove the loop around it.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  BusHttpClient,
  createBusHandler,
  FileBusStore,
  type BusEnvelope,
  type ClaudeRunReport,
} from "../../../packages/bus-core/src/index.ts";
import { nodeAdapter } from "../serve.ts";
import { FileClaimLedger, resolveClaudeBinary, runConsumer, type ClaudeExecutor } from "../consume.ts";

const TOKEN = "test-token";

const LIVE_TASK = {
  type: "task",
  status: "open",
  from: "sol-gpt",
  to: "claude-code",
  mode: "READ_ONLY",
  stop_after_report: true,
  summary: "BUS LIVE TEST: potvrd prijatie spravy cez Revolis BUS.",
  next_action: { gate: "AUTO-SAFE", description: "Odpovedz BUS ALIVE a nevykonavaj ziadne zmeny." },
  body: "",
};

interface Harness {
  client: BusHttpClient;
  ledger: FileClaimLedger;
  store: FileBusStore;
  close(): Promise<void>;
}

async function harness(): Promise<Harness> {
  const busRoot = await mkdtemp(path.join(tmpdir(), "bus-consume-"));
  const stateDir = await mkdtemp(path.join(tmpdir(), "bus-claims-"));
  const store = new FileBusStore(busRoot);
  const handle = createBusHandler({ store, token: TOKEN });
  const server: Server = createServer((incoming, outgoing) => void nodeAdapter(handle)(incoming, outgoing));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };

  return {
    client: new BusHttpClient({ baseUrl: `http://127.0.0.1:${port}`, token: TOKEN }),
    ledger: new FileClaimLedger(stateDir),
    store,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(busRoot, { recursive: true, force: true });
      await rm(stateDir, { recursive: true, force: true });
    },
  };
}

function stubExecutor(reply: string, calls: string[] = []): ClaudeExecutor {
  return async (prompt): Promise<ClaudeRunReport> => {
    calls.push(prompt);
    return {
      reply,
      sessionId: "stub-session",
      model: "stub",
      numTurns: 1,
      durationMs: 1,
      costUsd: 0,
      command: "stub-executor (not a real Claude Code process)",
    };
  };
}

async function seedTask(client: BusHttpClient, overrides: Record<string, unknown> = {}): Promise<string> {
  const posted = await client.post("inbox", { ...LIVE_TASK, ...overrides } as unknown as BusEnvelope);
  return posted.id;
}

test("the full loop: task -> gates -> Claude -> result -> ack", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const taskId = await seedTask(bus.client);
  const prompts: string[] = [];
  const outcomes = await runConsumer({
    client: bus.client,
    executor: stubExecutor("BUS ALIVE", prompts),
    ledger: bus.ledger,
    repoCommit: "deadbeef",
  });

  assert.equal(outcomes.length, 1);
  const outcome = outcomes[0]!;
  assert.equal(outcome.action, "executed");
  assert.equal(outcome.action === "executed" && outcome.reply, "BUS ALIVE");

  // The prompt handed to Claude names the task and forbids repository changes.
  assert.match(prompts[0]!, new RegExp(taskId));
  assert.match(prompts[0]!, /repository changes are forbidden/);

  // The result landed in outbox, threaded to the task, with the founder gate.
  const results = await bus.client.list("outbox", { from: "claude-code" });
  assert.equal(results.length, 1);
  assert.equal(results[0]!.thread, taskId);
  assert.equal(results[0]!.type, "result");
  assert.equal(results[0]!.status, "done");
  assert.equal(results[0]!.next_action?.gate, "GO REQUIRED");
  assert.equal(results[0]!.counters?.repo_changes, 0);

  // The task was acked: no longer open in inbox, now done in outbox.
  assert.equal((await bus.client.list("inbox", { to: "claude-code", status: "open" })).length, 0);
  const acked = await bus.client.list("outbox", { to: "claude-code" });
  assert.equal(acked.length, 1);
  assert.equal(acked[0]!.id, taskId);
  assert.equal(acked[0]!.status, "done");
});

test("a second run does not execute the same task twice", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  await seedTask(bus.client);
  const calls: string[] = [];
  await runConsumer({ client: bus.client, executor: stubExecutor("BUS ALIVE", calls), ledger: bus.ledger });
  const second = await runConsumer({ client: bus.client, executor: stubExecutor("BUS ALIVE", calls), ledger: bus.ledger });

  assert.equal(calls.length, 1, "Claude must be invoked exactly once");
  assert.equal(second.length, 0, "the acked task is no longer in the open queue");
});

test("a re-opened task that already has an answer is refused by the bus-side guard", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const taskId = await seedTask(bus.client);
  const calls: string[] = [];
  await runConsumer({ client: bus.client, executor: stubExecutor("BUS ALIVE", calls), ledger: bus.ledger });

  // Someone re-opens the task in inbox after it was answered.
  const doc = await bus.store.read("outbox", taskId);
  await bus.store.write("inbox", { ...doc.envelope!, status: "open" }, { overwrite: true });

  const outcomes = await runConsumer({ client: bus.client, executor: stubExecutor("BUS ALIVE", calls), ledger: bus.ledger });
  assert.equal(calls.length, 1, "Claude must still have been invoked exactly once");
  assert.equal(outcomes[0]!.action, "skipped");
  assert.equal(outcomes[0]!.action === "skipped" && outcomes[0]!.code, "already_handled");
});

test("a gated task is never executed and comes back as a blocker", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const taskId = await seedTask(bus.client, {
    mode: "IMPLEMENT",
    summary: "BUS ALIVE ale s implementaciou",
    next_action: { gate: "GO REQUIRED", description: "Odpovedz BUS ALIVE a zmen repo" },
  });
  const calls: string[] = [];
  const outcomes = await runConsumer({ client: bus.client, executor: stubExecutor("BUS ALIVE", calls), ledger: bus.ledger });

  assert.equal(calls.length, 0, "a gated task must not reach Claude");
  assert.equal(outcomes[0]!.action, "blocked");
  assert.equal(outcomes[0]!.action === "blocked" && outcomes[0]!.code, "mode_not_read_only");

  const blockers = await bus.client.list("outbox", { from: "claude-code", type: "blocker" });
  assert.equal(blockers.length, 1);
  assert.equal(blockers[0]!.thread, taskId);

  // The blocked task stays open: only the founder closes it.
  const stillOpen = await bus.client.list("inbox", { to: "claude-code", status: "open" });
  assert.equal(stillOpen.length, 1);
  assert.equal(stillOpen[0]!.id, taskId);
});

test("a reply that breaks the capability contract fails loudly and writes nothing", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const taskId = await seedTask(bus.client);
  const outcomes = await runConsumer({
    client: bus.client,
    executor: stubExecutor("Sure, I confirm receipt of your message!"),
    ledger: bus.ledger,
  });

  assert.equal(outcomes[0]!.action, "failed");
  assert.match(outcomes[0]!.action === "failed" ? outcomes[0]!.reason : "", /contract failed/);
  assert.equal((await bus.client.list("outbox", { from: "claude-code" })).length, 0);

  // The claim was released, so a corrected run can retry the same task.
  const retry = await runConsumer({ client: bus.client, executor: stubExecutor("BUS ALIVE"), ledger: bus.ledger });
  assert.equal(retry[0]!.action, "executed");
  assert.equal((await bus.client.list("outbox", { to: "claude-code" }))[0]!.id, taskId);
});

test("--dry-run evaluates the gates without invoking Claude or writing", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  await seedTask(bus.client);
  const calls: string[] = [];
  const outcomes = await runConsumer({
    client: bus.client,
    executor: stubExecutor("BUS ALIVE", calls),
    ledger: bus.ledger,
    dryRun: true,
  });

  assert.equal(calls.length, 0);
  assert.equal(outcomes[0]!.action === "skipped" && outcomes[0]!.code, "dry_run");
  assert.equal((await bus.client.list("outbox")).length, 0);
  assert.equal((await bus.client.list("inbox", { to: "claude-code", status: "open" })).length, 1);
});

test("--task scopes the run to exactly one message", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const first = await seedTask(bus.client);
  await seedTask(bus.client, { summary: "BUS ALIVE druha uloha" });
  const calls: string[] = [];
  const outcomes = await runConsumer({
    client: bus.client,
    executor: stubExecutor("BUS ALIVE", calls),
    ledger: bus.ledger,
    taskId: first,
  });

  assert.equal(outcomes.length, 1);
  assert.equal(calls.length, 1);
  assert.equal((await bus.client.list("inbox", { to: "claude-code", status: "open" })).length, 1);
});

test("a concurrent claim stops a second process mid-flight", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const taskId = await seedTask(bus.client);
  assert.equal(await bus.ledger.claim(taskId), true);

  const calls: string[] = [];
  const outcomes = await runConsumer({ client: bus.client, executor: stubExecutor("BUS ALIVE", calls), ledger: bus.ledger });
  assert.equal(calls.length, 0);
  assert.equal(outcomes[0]!.action === "skipped" && outcomes[0]!.code, "already_claimed");
});

test("the Claude binary is explicitly resolvable and never silently guessed", () => {
  assert.equal(resolveClaudeBinary({ REVOLIS_BUS_CLAUDE_BIN: "/opt/claude" }), "/opt/claude");
  if (process.platform === "win32") {
    // A .cmd shim cannot be spawned directly, so the resolver must find the exe.
    assert.match(resolveClaudeBinary(), /claude\.exe$/);
    assert.throws(() => resolveClaudeBinary({ PATH: "" }), /claude\.exe not found/);
  } else {
    assert.equal(resolveClaudeBinary({}), "claude");
  }
});
