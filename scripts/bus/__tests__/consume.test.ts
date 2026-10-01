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
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
import {
  ClaudeTimeoutError,
  FileExecutionCounter,
  FileExecutionLedger,
  resolveClaudeBinary,
  runConsumer,
  runWatch,
  type ClaudeExecutor,
} from "../consume.ts";
import {
  BUS_ALIVE_CAPABILITY,
  CLAUDE_RUN_TIMEOUT_MS,
  leaseUntil,
  type BusCapability,
} from "../../../packages/bus-core/src/index.ts";

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
  ledger: FileExecutionLedger;
  store: FileBusStore;
  busRoot: string;
  close(): Promise<void>;
}

/**
 * Write a bus file byte for byte, the way a human author does. The store only
 * ever writes serialized envelopes, which quote anything YAML would eat — so a
 * damaged file cannot be produced through it.
 */
async function seedRawFile(bus: Harness, box: string, id: string, lines: string[]): Promise<string> {
  await mkdir(path.join(bus.busRoot, box), { recursive: true });
  await writeFile(path.join(bus.busRoot, box, `${id}.md`), lines.join("\n"), "utf8");
  return id;
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
    ledger: new FileExecutionLedger(stateDir),
    store,
    busRoot,
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
  // Drop the local record: this test is about the guard that works across
  // machines, where the second runner has never seen this task before.
  await bus.ledger.clear(taskId);

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

test("a live lease held by another runner stops a second process mid-flight", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const taskId = await seedTask(bus.client);
  await bus.ledger.write({
    task_id: taskId,
    state: "EXECUTING",
    owner: "runner@other-host/boot-9/999",
    lease_expires_at: leaseUntil(new Date()),
    capability_id: "bus-alive",
    idempotent: true,
    persistence_attempts: 0,
    updated_at: new Date().toISOString(),
  });

  const calls: string[] = [];
  const outcomes = await runConsumer({ client: bus.client, executor: stubExecutor("BUS ALIVE", calls), ledger: bus.ledger });
  assert.equal(calls.length, 0, "Claude must not be invoked while someone else holds the lease");
  assert.equal(outcomes[0]!.action === "skipped" && outcomes[0]!.code, "lease_held");
});

test("an expired lease from a dead runner is reclaimed", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const taskId = await seedTask(bus.client);
  await bus.ledger.write({
    task_id: taskId,
    state: "CLAIMED",
    owner: "runner@dead-host/boot-1/1",
    lease_expires_at: new Date(Date.now() - 1).toISOString(),
    capability_id: "bus-alive",
    idempotent: true,
    persistence_attempts: 0,
    updated_at: new Date().toISOString(),
  });

  const calls: string[] = [];
  const outcomes = await runConsumer({ client: bus.client, executor: stubExecutor("BUS ALIVE", calls), ledger: bus.ledger });
  assert.equal(outcomes[0]!.action, "executed", "nothing had run, so the task is free to take");
  assert.equal(calls.length, 1);
});

test("a task whose gate lost text to YAML is refused end to end", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  // Written straight to the store the way an author writes a file: a bare `#`
  // on the mode line. Over HTTP this task looks perfectly clean.
  const id = "TASK-20260918-097-eaten-qualifier";
  await seedRawFile(bus, "inbox", id, [
      "---",
      "v: 1",
      `id: ${id}`,
      "type: task",
      "status: open",
      "from: sol-gpt",
      "to: claude-code",
      "created_at: 2026-09-18T20:30:00.000Z",
      "mode: READ_ONLY #len do casu kym founder nepovie inak",
      "summary: BUS LIVE TEST",
      "next_action:",
      "  gate: AUTO-SAFE",
      "  description: Odpovedz BUS ALIVE",
    "---",
    "",
  ]);

  // The list route hands over a clean-looking envelope...
  const listed = await bus.client.list("inbox", { to: "claude-code", status: "open" });
  assert.equal(listed[0]!.mode, "READ_ONLY", "the eaten qualifier is invisible here");

  // ...so the consumer must fetch the warnings itself before trusting it.
  const calls: string[] = [];
  const outcomes = await runConsumer({ client: bus.client, executor: stubExecutor("BUS ALIVE", calls), ledger: bus.ledger });

  assert.equal(calls.length, 0, "a damaged task must not reach Claude");
  assert.equal(outcomes[0]!.action, "blocked");
  assert.equal(outcomes[0]!.action === "blocked" && outcomes[0]!.code, "lost_text_in_authority_field");

  const blockers = await bus.client.list("outbox", { from: "claude-code", type: "blocker" });
  assert.equal(blockers.length, 1);
  assert.match(blockers[0]!.summary, /mode/);

  // The task stays open: the sender has to requote the value.
  assert.equal((await bus.client.list("inbox", { to: "claude-code", status: "open" }))[0]!.id, id);
});

test("a task carrying a `#` only in prose still executes", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const id = "TASK-20260918-096-hash-in-prose";
  await seedRawFile(bus, "inbox", id, [
      "---",
      "v: 1",
      `id: ${id}`,
      "type: task",
      "status: open",
      "from: sol-gpt",
      "to: claude-code",
      "created_at: 2026-09-18T20:30:00.000Z",
      "mode: READ_ONLY",
      "summary: BUS LIVE TEST",
      "next_action:",
      "  gate: AUTO-SAFE",
      "  description: Odpovedz BUS ALIVE po merge #593",
    "---",
    "",
  ]);

  const calls: string[] = [];
  const outcomes = await runConsumer({ client: bus.client, executor: stubExecutor("BUS ALIVE", calls), ledger: bus.ledger });
  assert.equal(calls.length, 1, "prose damage must not block an otherwise valid task");
  assert.equal(outcomes[0]!.action, "executed");
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

/* ------------------------------------------- durable execution (KROK 2C) */

/** A client that fails chosen calls, so persistence can break on demand. */
function flakyClient(real: BusHttpClient, plan: { postFailures?: number; ackFailures?: number }): BusHttpClient {
  let posts = plan.postFailures ?? 0;
  let acks = plan.ackFailures ?? 0;
  return {
    health: () => real.health(),
    list: (box: never, query: never) => real.list(box, query),
    read: (box: never, id: never) => real.read(box, id),
    post: async (box: never, envelope: never) => {
      if (posts > 0) {
        posts -= 1;
        throw new Error("github 500 (simulated)");
      }
      return real.post(box, envelope);
    },
    ack: async (box: never, id: never, options: never) => {
      if (acks > 0) {
        acks -= 1;
        throw new Error("github 502 (simulated)");
      }
      return real.ack(box, id, options);
    },
  } as unknown as BusHttpClient;
}

/** Blows up if invoked — proof that a resumed run never re-asks Claude. */
const forbiddenExecutor: ClaudeExecutor = async () => {
  throw new Error("Claude was invoked again after EXECUTED — invariant I1 broken");
};

test("a reply that cannot be written is stored, then resumed without re-running Claude", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const taskId = await seedTask(bus.client);
  const calls: string[] = [];

  const failed = await runConsumer({
    client: flakyClient(bus.client, { postFailures: 1 }),
    executor: stubExecutor("BUS ALIVE", calls),
    ledger: bus.ledger,
  });
  assert.equal(failed[0]!.action, "failed");
  assert.equal(calls.length, 1, "Claude ran exactly once");

  // The durability anchor: the reply is on disk before any network call.
  const stored = await bus.ledger.read(taskId);
  assert.equal(stored?.state, "EXECUTED");
  assert.equal(stored?.reply, "BUS ALIVE");
  assert.equal(stored?.persistence_attempts, 1);
  assert.equal((await bus.client.list("outbox", { from: "claude-code" })).length, 0);

  const resumed = await runConsumer({ client: bus.client, executor: forbiddenExecutor, ledger: bus.ledger });
  assert.equal(resumed[0]!.action, "executed");
  assert.equal((await bus.ledger.read(taskId))?.state, "DONE");
  assert.equal((await bus.client.list("outbox", { from: "claude-code" })).length, 1);
  assert.deepEqual(await bus.client.list("inbox", { to: "claude-code", status: "open" }), []);
});

test("the persistence budget is two attempts, then the runner stops instead of looping", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const taskId = await seedTask(bus.client);
  const broken = flakyClient(bus.client, { postFailures: 99 });

  const first = await runConsumer({ client: broken, executor: stubExecutor("BUS ALIVE"), ledger: bus.ledger });
  assert.equal(first[0]!.action, "failed");
  const second = await runConsumer({ client: broken, executor: forbiddenExecutor, ledger: bus.ledger });
  assert.equal(second[0]!.action, "failed");
  assert.equal((await bus.ledger.read(taskId))?.state, "FAILED_PERSISTENT");

  // Third pass: no further attempt, and above all no second execution.
  const third = await runConsumer({ client: broken, executor: forbiddenExecutor, ledger: bus.ledger });
  assert.equal(third[0]!.action === "skipped" && third[0]!.code, "failed_persistent");
});

test("a crash after the result was posted still closes the task", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const taskId = await seedTask(bus.client);
  // Post lands, every ack fails: the state the `already_handled` gate used to
  // strand — result on the bus, task still open, forever.
  const failed = await runConsumer({
    client: flakyClient(bus.client, { ackFailures: 99 }),
    executor: stubExecutor("BUS ALIVE"),
    ledger: bus.ledger,
  });
  assert.equal(failed[0]!.action, "failed");
  assert.equal((await bus.ledger.read(taskId))?.state, "RESULT_POSTED");
  assert.equal((await bus.client.list("inbox", { to: "claude-code", status: "open" })).length, 1);

  const resumed = await runConsumer({ client: bus.client, executor: forbiddenExecutor, ledger: bus.ledger });
  assert.equal(resumed[0]!.action, "executed");
  assert.deepEqual(await bus.client.list("inbox", { to: "claude-code", status: "open" }), []);
  assert.equal((await bus.ledger.read(taskId))?.state, "DONE");
});

test("a non-idempotent capability is never auto-executed, not even the first time", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const taskId = await seedTask(bus.client);
  const risky: BusCapability = { ...BUS_ALIVE_CAPABILITY, id: "risky", idempotent: false };
  const calls: string[] = [];

  const stopped = await runConsumer({
    client: bus.client,
    executor: stubExecutor("BUS ALIVE", calls),
    ledger: bus.ledger,
    capabilities: [risky],
  });

  // Absent state is indistinguishable from lost state, so a first run cannot be
  // told apart from a repeat. Under capability policy B this is unreachable —
  // anything non-idempotent has side effects and never reaches AUTO-SAFE.
  assert.equal(stopped[0]!.action === "blocked" && stopped[0]!.code, "unprovable_first_run");
  assert.equal(calls.length, 0, "Claude must not be invoked");
  assert.equal((await bus.ledger.read(taskId))?.state, "NEEDS_FOUNDER");
  assert.equal((await bus.client.list("inbox", { to: "claude-code", status: "open" })).length, 1);
});

test("an interrupted run of a non-idempotent capability waits for the founder", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const taskId = await seedTask(bus.client);
  const risky: BusCapability = { ...BUS_ALIVE_CAPABILITY, id: "risky", idempotent: false };
  // A process that died mid-run: EXECUTING, lease long gone, no reply.
  await bus.ledger.write({
    task_id: taskId,
    state: "EXECUTING",
    owner: "runner@dead-host/boot-1/1",
    lease_expires_at: new Date(Date.now() - 1).toISOString(),
    capability_id: "risky",
    idempotent: false,
    persistence_attempts: 0,
    updated_at: new Date().toISOString(),
  });

  const stopped = await runConsumer({
    client: bus.client,
    executor: forbiddenExecutor,
    ledger: bus.ledger,
    capabilities: [risky],
  });
  assert.equal(stopped[0]!.action === "blocked" && stopped[0]!.code, "execution_unknown");
  assert.equal((await bus.ledger.read(taskId))?.state, "NEEDS_FOUNDER");
  // The task stays open; only the founder closes it.
  assert.equal((await bus.client.list("inbox", { to: "claude-code", status: "open" })).length, 1);

  const again = await runConsumer({
    client: bus.client,
    executor: forbiddenExecutor,
    ledger: bus.ledger,
    capabilities: [risky],
  });
  assert.equal(again[0]!.action === "skipped" && again[0]!.code, "needs_founder");
});

test("an interrupted run of an idempotent capability is simply retried", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const taskId = await seedTask(bus.client);
  await bus.ledger.write({
    task_id: taskId,
    state: "EXECUTING",
    owner: "runner@dead-host/boot-1/1",
    lease_expires_at: new Date(Date.now() - 1).toISOString(),
    capability_id: "bus-alive",
    idempotent: true,
    persistence_attempts: 0,
    updated_at: new Date().toISOString(),
  });

  const outcomes = await runConsumer({ client: bus.client, executor: stubExecutor("BUS ALIVE"), ledger: bus.ledger });
  assert.equal(outcomes[0]!.action, "executed");
});

test("a timed-out run of an idempotent capability may simply be retried", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  await seedTask(bus.client);
  const timingOut: ClaudeExecutor = async () => {
    throw new ClaudeTimeoutError(CLAUDE_RUN_TIMEOUT_MS);
  };

  const failed = await runConsumer({ client: bus.client, executor: timingOut, ledger: bus.ledger });
  assert.equal(failed[0]!.action, "failed");

  const retried = await runConsumer({ client: bus.client, executor: stubExecutor("BUS ALIVE"), ledger: bus.ledger });
  assert.equal(retried[0]!.action, "executed");
});

/* ----------------------------------------------- always-on runner (2D) */

const REFUSED_TASK = { next_action: { gate: "GO REQUIRED", description: "Odpovedz BUS ALIVE" } };

test("a refused task is explained once, not every cycle, and stays open", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const taskId = await seedTask(bus.client, REFUSED_TASK);
  const codes: string[] = [];
  for (let cycle = 0; cycle < 3; cycle += 1) {
    const outcomes = await runConsumer({ client: bus.client, executor: forbiddenExecutor, ledger: bus.ledger });
    codes.push(`${outcomes[0]!.action}:${(outcomes[0] as { code?: string }).code ?? ""}`);
  }

  assert.deepEqual(codes, ["blocked:gate_not_auto_safe", "skipped:blocker_deduped", "skipped:blocker_deduped"]);
  assert.equal((await bus.client.list("outbox", { from: "claude-code" })).length, 1, "exactly one blocker");
  // The founder closes a blocked task, never the runner.
  assert.equal((await bus.client.list("inbox", { to: "claude-code", status: "open" })).length, 1);
  assert.equal(taskId.startsWith("TASK-"), true);
});

test("a task the founder fixes after a blocker becomes runnable again", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const taskId = await seedTask(bus.client, REFUSED_TASK);
  const blocked = await runConsumer({ client: bus.client, executor: forbiddenExecutor, ledger: bus.ledger });
  assert.equal(blocked[0]!.action, "blocked");

  // The founder edits the gate the blocker complained about.
  const doc = await bus.store.read("inbox", taskId);
  await bus.store.write(
    "inbox",
    { ...doc.envelope!, next_action: { gate: "AUTO-SAFE", description: "Odpovedz BUS ALIVE" } },
    { overwrite: true },
  );

  const fixed = await runConsumer({ client: bus.client, executor: stubExecutor("BUS ALIVE"), ledger: bus.ledger });
  assert.equal(fixed[0]!.action, "executed", "a blocker must not gag a task forever");
});

test("the daily cap is a hard ceiling: at the limit nothing is executed", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const stateDir = await mkdtemp(path.join(tmpdir(), "bus-cap-"));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  const counter = new FileExecutionCounter(stateDir);
  await counter.record(new Date());

  await seedTask(bus.client);
  const outcomes = await runConsumer({
    client: bus.client,
    executor: forbiddenExecutor,
    ledger: bus.ledger,
    counter,
    dailyCap: 1,
  });

  assert.equal(outcomes[0]!.action === "blocked" && outcomes[0]!.code, "daily_cap_reached");
  assert.match(outcomes[0]!.action === "blocked" ? outcomes[0]!.reason : "", /1\/1 executions used/);
  assert.equal((await bus.client.list("outbox", { from: "claude-code", type: "blocker" })).length, 1);
});

test("an execution spends the budget even when it then fails", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const stateDir = await mkdtemp(path.join(tmpdir(), "bus-cap-"));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  const counter = new FileExecutionCounter(stateDir);

  await seedTask(bus.client);
  const failing: ClaudeExecutor = async () => {
    throw new Error("claude exited 1");
  };
  await runConsumer({ client: bus.client, executor: failing, ledger: bus.ledger, counter, dailyCap: 10 });

  assert.equal((await counter.stamps()).length, 1, "the invocation consumed the resource the cap bounds");
});

test("the watch loop runs bounded cycles and reports what it did", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  await seedTask(bus.client);
  const report = await runWatch({
    client: bus.client,
    executor: stubExecutor("BUS ALIVE"),
    ledger: bus.ledger,
    intervalMs: 1,
    maxCycles: 2,
  });

  assert.equal(report.cycles, 2);
  assert.equal(report.executed, 1, "the second cycle finds nothing left to do");
  assert.equal(report.errors, 0);
});

test("an aborted watch stops without starting another cycle", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const controller = new AbortController();
  const cycles: string[] = [];
  const report = await runWatch({
    client: bus.client,
    executor: forbiddenExecutor,
    ledger: bus.ledger,
    intervalMs: 50,
    log: (line) => {
      if (line.startsWith("QUEUE")) {
        cycles.push(line);
        controller.abort();
      }
    },
    signal: controller.signal,
  });

  assert.equal(report.cycles, 1);
  assert.equal(cycles.length, 1);
});

test("a cycle that throws backs off instead of ending the loop", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const broken = { ...bus.client, health: async () => ({ ok: false }) } as unknown as BusHttpClient;
  const lines: string[] = [];
  const report = await runWatch({
    client: broken,
    executor: forbiddenExecutor,
    ledger: bus.ledger,
    intervalMs: 1,
    maxCycles: 2,
    log: (line) => lines.push(line),
  });

  assert.equal(report.errors, 2, "both cycles failed and neither killed the loop");
  assert.match(lines.join("\n"), /retrying in \d+s/);
});

test("the watch loop stamps liveness so quiet can be told from dead", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const stateDir = await mkdtemp(path.join(tmpdir(), "bus-live-"));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  const livenessFile = path.join(stateDir, "liveness.json");

  await runWatch({
    client: bus.client,
    executor: forbiddenExecutor,
    ledger: bus.ledger,
    intervalMs: 1,
    maxCycles: 1,
    livenessFile,
  });

  const stamped = JSON.parse(await readFile(livenessFile, "utf8")) as { at: string; cycles: number };
  assert.equal(stamped.cycles, 1);
  assert.ok(!Number.isNaN(Date.parse(stamped.at)));
});

test("a task parked by the cap stays parked after the window frees — the founder unparks it", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const stateDir = await mkdtemp(path.join(tmpdir(), "bus-cap-"));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  const counter = new FileExecutionCounter(stateDir);
  await counter.record(new Date());

  await seedTask(bus.client);
  const capped = await runConsumer({
    client: bus.client,
    executor: forbiddenExecutor,
    ledger: bus.ledger,
    counter,
    dailyCap: 1,
  });
  assert.equal(capped[0]!.action === "blocked" && capped[0]!.code, "daily_cap_reached");

  // Budget restored — but the task was parked as NEEDS_FOUNDER, and that state
  // is cleared by a person, not by a clock. Documented, not assumed.
  const later = await runConsumer({
    client: bus.client,
    executor: forbiddenExecutor,
    ledger: bus.ledger,
    counter,
    dailyCap: 100,
  });
  assert.equal(later[0]!.action === "skipped" && later[0]!.code, "needs_founder");
});

const REPO_HEAD_TASK = {
  ...LIVE_TASK,
  summary: "Report the REPO HEAD of the machine you are running on.",
  next_action: { gate: "AUTO-SAFE", description: "Odpovedz commit sha a nevykonavaj ziadne zmeny." },
};

test("repo-head: the runner reads the sha, the model relays it, the contract checks both", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const head = "5b2e9153b70a6dbad0bd8f1573b23f301e6ee612";
  const taskId = await seedTask(bus.client, REPO_HEAD_TASK);
  const prompts: string[] = [];

  const outcomes = await runConsumer({
    client: bus.client,
    executor: stubExecutor(head, prompts),
    ledger: bus.ledger,
    gatherFacts: async () => ({ repo_head: head }),
  });

  assert.equal(outcomes[0]!.action, "executed");
  assert.equal(outcomes[0]!.action === "executed" && outcomes[0]!.reply, head);

  // The sha reached the process in its prompt: the runner read it, not the model.
  assert.match(prompts[0]!, new RegExp(head));
  assert.match(prompts[0]!, new RegExp(taskId));

  const results = await bus.client.list("outbox", { from: "claude-code" });
  assert.equal(results[0]!.thread, taskId);
  assert.equal(results[0]!.counters?.repo_changes, 0);
});

test("repo-head: a reply that invents a sha fails the contract and is not published", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  await seedTask(bus.client, REPO_HEAD_TASK);
  const outcomes = await runConsumer({
    client: bus.client,
    executor: stubExecutor("0123456789abcdef0123456789abcdef01234567"),
    ledger: bus.ledger,
    gatherFacts: async () => ({ repo_head: "5b2e9153b70a6dbad0bd8f1573b23f301e6ee612" }),
  });

  assert.equal(outcomes[0]!.action, "failed");
  assert.match(outcomes[0]!.action === "failed" ? outcomes[0]!.reason : "", /is not the repository head/);

  // Nothing reached the bus: a failed contract must not look like an answer.
  assert.equal((await bus.client.list("outbox", { from: "claude-code" })).length, 0);
});

test("a fact the machine cannot read stops the run before it costs anything", async (t) => {
  const bus = await harness();
  t.after(() => bus.close());

  const stateDir = await mkdtemp(path.join(tmpdir(), "bus-cap-"));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  const counter = new FileExecutionCounter(stateDir);

  await seedTask(bus.client, REPO_HEAD_TASK);
  const forbidden: ClaudeExecutor = async () => {
    throw new Error("Claude must not be invoked without the facts the capability declared");
  };

  const outcomes = await runConsumer({
    client: bus.client,
    executor: forbidden,
    ledger: bus.ledger,
    counter,
    gatherFacts: async () => {
      throw new Error("capability repo-head: fact repo_head could not be read");
    },
  });

  assert.equal(outcomes[0]!.action, "failed");
  assert.match(outcomes[0]!.action === "failed" ? outcomes[0]!.reason : "", /fact repo_head could not be read/);

  // The budget is for executions. An environment that could not answer never
  // reached one, so it must not have spent a slot.
  assert.equal((await counter.stamps()).length, 0);

  // No blocker either: this is transient, and the task stays open so the next
  // cycle retries once the machine recovers.
  assert.equal((await bus.client.list("outbox", { from: "claude-code" })).length, 0);
  assert.equal((await bus.client.list("inbox", { to: "claude-code", status: "open" })).length, 1);
});

test("the real fact source reads this repository, with nothing injected", async (t) => {
  // Every other repo-head test substitutes `gatherFacts`, which would leave the
  // one piece that touches the machine unexercised — a guard that only exists
  // on paper. This one runs it for real and pins the value to git itself.
  const bus = await harness();
  t.after(() => bus.close());

  const { stdout } = await promisify(execFile)("git", ["rev-parse", "HEAD"], {
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.."),
  });
  const head = stdout.trim();

  await seedTask(bus.client, REPO_HEAD_TASK);
  // Stands in for a model that relays faithfully: it answers with the sha the
  // runner put in the prompt, and nothing else.
  const relaying: ClaudeExecutor = async (prompt) => ({
    reply: /\b([0-9a-f]{40})\b/.exec(prompt)?.[1] ?? "no sha in prompt",
    sessionId: "stub-session",
    model: "stub",
    numTurns: 1,
    durationMs: 1,
    costUsd: 0,
    command: "stub-executor (not a real Claude Code process)",
  });

  const outcomes = await runConsumer({ client: bus.client, executor: relaying, ledger: bus.ledger });

  assert.equal(outcomes[0]!.action, "executed");
  assert.equal(outcomes[0]!.action === "executed" && outcomes[0]!.reply, head);
});
