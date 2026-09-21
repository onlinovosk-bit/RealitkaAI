#!/usr/bin/env node
/**
 * Revolis Bus consumer — the execution side of the loop.
 *
 * Reads tasks addressed to `claude-code` off the bus, applies the BUS v1 gates,
 * invokes a **real** Claude Code process for the ones that pass, and writes the
 * result back as a BUS v1 envelope. Nothing here simulates Claude: if the
 * `claude` binary is missing or fails, the consumer reports a failure rather
 * than inventing an answer.
 *
 *   REVOLIS_BUS_TOKEN=... npm run bus:consume -- --once
 *   REVOLIS_BUS_TOKEN=... npm run bus:consume -- --task TASK-... --dry-run
 *
 * The token is read from the environment only — flags land in shell history and
 * in the process list.
 *
 * Safety posture:
 *   - the Claude Code process runs with every tool disabled (`--tools ""`),
 *     no MCP servers and no project customizations, in a throwaway cwd outside
 *     the repository, so an executed task cannot change anything;
 *   - only READ_ONLY / AUTO-SAFE tasks with no pending founder decision run;
 *   - only tasks matching an allowlisted capability run;
 *   - duplicate execution is blocked by the bus itself (an answered thread) and
 *     by a local claim file for concurrent runs.
 */

import { execFile as execFileCallback, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile, unlink } from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  BusHttpClient,
  buildBlockerEnvelope,
  buildResultEnvelope,
  CLAUDE_RUN_TIMEOUT_MS,
  capState,
  CONSUMER_AGENT,
  DAILY_EXECUTION_CAP,
  DEFAULT_CAPABILITIES,
  evaluateTask,
  handledTaskIds,
  HEARTBEAT_INTERVAL_MS,
  isBusBox,
  leaseUntil,
  LOST_TEXT_FIELD,
  persistenceExhausted,
  planFor,
  reportedRefusals,
  validateOutgoing,
  withinWindow,
  type BusBox,
  type BusCapability,
  type BusEnvelope,
  type BusValidationError,
  type ClaudeRunReport,
  type ExecutionRecord,
} from "../../packages/bus-core/src/index.ts";

const execFile = promisify(execFileCallback);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const DEFAULT_URL = "http://127.0.0.1:8787";
const DEFAULT_MODEL = "sonnet";
const DEFAULT_TIMEOUT_MS = CLAUDE_RUN_TIMEOUT_MS;

/* ------------------------------------------------------------------ state */

/**
 * Durable execution state, one file per task, outside the repository.
 *
 * The bus remains the authority on what is done; this records the phase a run
 * reached, and — from EXECUTED onwards — the reply itself, so that a failed
 * write is resumed rather than re-executed.
 */
export interface ExecutionLedger {
  read(taskId: string): Promise<ExecutionRecord | undefined>;
  write(record: ExecutionRecord): Promise<void>;
  clear(taskId: string): Promise<void>;
}

export function defaultStateDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.REVOLIS_BUS_CONSUMER_STATE ?? path.join(tmpdir(), "revolis-bus-consumer");
}

/**
 * Identity of this runner instance. A restart must never look like the same
 * holder, or a crashed run would keep its own lease alive.
 */
let processOwner: string | undefined;

export function runnerOwner(env: NodeJS.ProcessEnv = process.env): string {
  if (env.REVOLIS_BUS_RUNNER_ID) return env.REVOLIS_BUS_RUNNER_ID;
  // Memoized: the owner identifies this process, so two passes of the same
  // runner see their own lease rather than mistaking it for a rival's. A
  // restart mints a new identity, which is exactly what a lease needs.
  processOwner ??= `runner@${hostname()}/${randomUUID().slice(0, 8)}/${process.pid}`;
  return processOwner;
}

export class FileExecutionLedger implements ExecutionLedger {
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  private file(taskId: string): string {
    if (taskId.includes("/") || taskId.includes("..")) throw new Error(`Illegal task id: ${taskId}`);
    return path.join(this.dir, `${taskId}.json`);
  }

  async read(taskId: string): Promise<ExecutionRecord | undefined> {
    let raw: string;
    try {
      raw = await readFile(this.file(taskId), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
    try {
      return JSON.parse(raw) as ExecutionRecord;
    } catch {
      // Unreadable state is not absent state. Failing loudly beats treating a
      // corrupt record as "never ran" and executing a second time.
      throw new Error(`execution state for ${taskId} is corrupt — resolve it by hand before running again`);
    }
  }

  async write(record: ExecutionRecord): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const file = this.file(record.task_id);
    // Write-then-rename: a torn file would read as corrupt and stop the runner.
    const temp = `${file}.tmp-${process.pid}`;
    await writeFile(temp, JSON.stringify(record, null, 2), "utf8");
    await rename(temp, file);
  }

  async clear(taskId: string): Promise<void> {
    await unlink(this.file(taskId)).catch(() => {});
  }
}

/**
 * Durable count of executions inside the rolling window.
 *
 * A budget, not an audit log: stamps outside the window are dropped on write,
 * so the file cannot grow without bound.
 */
export class FileExecutionCounter {
  private readonly file: string;

  constructor(dir: string) {
    this.file = path.join(dir, "executions.json");
  }

  async stamps(): Promise<string[]> {
    try {
      const parsed = JSON.parse(await readFile(this.file, "utf8")) as unknown;
      return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      // A corrupt budget must not read as "nothing spent".
      throw new Error(`execution counter at ${this.file} is unreadable — resolve it by hand before running again`);
    }
  }

  async record(now: Date): Promise<void> {
    const kept = withinWindow([...(await this.stamps()), now.toISOString()], now);
    await mkdir(path.dirname(this.file), { recursive: true });
    const temp = `${this.file}.tmp-${process.pid}`;
    await writeFile(temp, JSON.stringify(kept), "utf8");
    await rename(temp, this.file);
  }
}

/**
 * Keeps the lease alive while Claude runs, so a long run is not stolen.
 *
 * `stop()` awaits the write in flight. Without that, a beat issued just before
 * the run ends could land after EXECUTED was written and put the record back to
 * EXECUTING — losing the stored reply, which is the one thing this phase exists
 * to protect.
 */
function startHeartbeat(
  ledger: ExecutionLedger,
  holder: { record: ExecutionRecord },
  now: () => Date,
  log: (line: string) => void,
  intervalMs: number = HEARTBEAT_INTERVAL_MS,
): { stop: () => Promise<void> } {
  let stopped = false;
  let inFlight: Promise<void> = Promise.resolve();

  const timer = setInterval(() => {
    if (stopped) return;
    const extended = { ...holder.record, lease_expires_at: leaseUntil(now()), updated_at: now().toISOString() };
    holder.record = extended;
    inFlight = ledger.write(extended).catch((error: unknown) => {
      // The run continues; the lease may lapse and another runner could take
      // over — which is why exactly one runner instance is supported.
      log(`WARN  ${extended.task_id}: heartbeat failed (${error instanceof Error ? error.message : String(error)})`);
    });
  }, intervalMs);
  timer.unref?.();

  return {
    stop: async () => {
      stopped = true;
      clearInterval(timer);
      await inFlight;
    },
  };
}

/* ---------------------------------------------------------------- executor */

export type ClaudeExecutor = (prompt: string, context: { taskId: string }) => Promise<ClaudeRunReport>;

export interface ClaudeExecutorOptions {
  model?: string;
  timeoutMs?: number;
  binary?: string;
}

interface ClaudeJsonResult {
  result?: string;
  is_error?: boolean;
  session_id?: string;
  num_turns?: number;
  duration_ms?: number;
  total_cost_usd?: number | null;
  subtype?: string;
  permission_denials?: unknown[];
}

/**
 * Locate the Claude Code executable.
 *
 * On Windows `claude` on PATH is a `.cmd` shim, and `spawn()` refuses to run
 * batch files (EINVAL) unless a shell is involved — which would mangle the
 * empty `--tools ""` argument. So resolve the native binary the shim delegates
 * to and spawn that directly.
 */
export function resolveClaudeBinary(env: NodeJS.ProcessEnv = process.env): string {
  if (env.REVOLIS_BUS_CLAUDE_BIN) return env.REVOLIS_BUS_CLAUDE_BIN;
  if (process.platform !== "win32") return "claude";

  for (const dir of (env.PATH ?? "").split(path.delimiter).filter(Boolean)) {
    const candidates = [
      path.join(dir, "claude.exe"),
      path.join(dir, "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe"),
    ];
    const found = candidates.find((candidate) => existsSync(candidate));
    if (found) return found;
  }
  throw new Error("claude.exe not found on PATH — set REVOLIS_BUS_CLAUDE_BIN to the Claude Code binary");
}

/**
 * A run that outlived its timeout. The process was killed, so whether Claude
 * finished its work is unknowable — the one failure that must not be retried
 * blindly.
 */
export class ClaudeTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`claude timed out after ${timeoutMs}ms`);
    this.name = "ClaudeTimeoutError";
  }
}

/** The real thing: a child Claude Code process, run headless and tool-less. */
export function realClaudeExecutor(options: ClaudeExecutorOptions = {}): ClaudeExecutor {
  const model = options.model ?? DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const binary = options.binary ?? resolveClaudeBinary();

  const args = [
    "-p",
    "--output-format",
    "json",
    "--tools",
    "", // no tools at all — the process cannot read, write or run anything
    "--strict-mcp-config",
    "--safe-mode", // no CLAUDE.md, skills, plugins or hooks: a hermetic run
    "--permission-mode",
    "manual",
    "--model",
    model,
    "--system-prompt",
    "You are a Revolis BUS execution agent. You have no tools. Answer literally and with nothing else.",
  ];
  // Evidence line for the result envelope: the shape of the run, not the prompt.
  const command = `${path.basename(binary)} -p --output-format json --tools "" --strict-mcp-config --safe-mode --permission-mode manual --model ${model}`;

  return async function run(prompt: string): Promise<ClaudeRunReport> {
    // A throwaway cwd outside the repository: defence in depth behind --tools "".
    const cwd = await mkdtemp(path.join(tmpdir(), "revolis-bus-claude-"));
    try {
      const raw = await new Promise<string>((resolve, reject) => {
        const child = spawn(binary, args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        const timer = setTimeout(() => {
          child.kill();
          reject(new ClaudeTimeoutError(timeoutMs));
        }, timeoutMs);

        child.stdout.on("data", (chunk: Buffer) => {
          stdout += chunk.toString("utf8");
        });
        child.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString("utf8");
        });
        child.on("error", (error) => {
          clearTimeout(timer);
          reject(new Error(`cannot start ${binary}: ${error.message}`));
        });
        child.on("close", (code) => {
          clearTimeout(timer);
          if (code === 0) resolve(stdout);
          else reject(new Error(`claude exited ${code}: ${stderr.trim().slice(0, 400)}`));
        });

        child.stdin.end(prompt, "utf8");
      });

      let parsed: ClaudeJsonResult;
      try {
        parsed = JSON.parse(raw) as ClaudeJsonResult;
      } catch {
        throw new Error(`claude returned non-JSON output (${raw.trim().slice(0, 200)})`);
      }
      if (parsed.is_error || typeof parsed.result !== "string") {
        throw new Error(`claude reported an error (subtype=${parsed.subtype ?? "unknown"})`);
      }

      return {
        reply: parsed.result,
        sessionId: parsed.session_id,
        model,
        numTurns: parsed.num_turns,
        durationMs: parsed.duration_ms,
        costUsd: parsed.total_cost_usd ?? null,
        command,
      };
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  };
}

/* ------------------------------------------------------------------- run */

export type ConsumeOutcome =
  | { taskId: string; action: "executed"; resultId: string; reply: string; run: ClaudeRunReport }
  | { taskId: string; action: "blocked"; code: string; reason: string; blockerId?: string }
  | { taskId: string; action: "skipped"; code: string; reason: string }
  | { taskId: string; action: "failed"; reason: string };

export interface ConsumeOptions {
  client: BusHttpClient;
  executor: ClaudeExecutor;
  ledger: ExecutionLedger;
  /** Durable execution budget. Omitted means the cap is not enforced. */
  counter?: FileExecutionCounter;
  /** Hard ceiling inside the rolling 24 h window. */
  dailyCap?: number;
  /** This runner instance. Defaults to a fresh identity per process. */
  owner?: string;
  capabilities?: BusCapability[];
  /** Process only this task id. */
  taskId?: string;
  inboxBox?: BusBox;
  /** Where an acknowledged task lands. Matches the CLI default. */
  ackBox?: BusBox;
  dryRun?: boolean;
  postBlockers?: boolean;
  repoCommit?: string;
  now?: () => Date;
  log?: (line: string) => void;
}

export async function runConsumer(options: ConsumeOptions): Promise<ConsumeOutcome[]> {
  const inbox = options.inboxBox ?? "inbox";
  const ackBox = options.ackBox ?? "outbox";
  const log = options.log ?? (() => {});
  const now = options.now ?? (() => new Date());
  const postBlockers = options.postBlockers ?? true;

  const health = await options.client.health();
  if (!health.ok) throw new Error("bus health check failed");

  const open = await options.client.list(inbox, { to: CONSUMER_AGENT, status: "open", type: "task", limit: 100 });
  const mine = [
    ...(await options.client.list("outbox", { from: CONSUMER_AGENT, limit: 100 })),
    ...(await options.client.list(inbox, { from: CONSUMER_AGENT, limit: 100 })),
  ];
  // Answered threads are the authoritative duplicate guard, across machines.
  const answered = handledTaskIds(mine);
  // Refusals already explained, so a task is not re-explained every minute.
  const reported = reportedRefusals(mine);

  const queue = options.taskId ? open.filter((task) => task.id === options.taskId) : open;
  if (options.taskId && queue.length === 0) {
    throw new Error(`${options.taskId} is not an open task addressed to ${CONSUMER_AGENT} in ${inbox}`);
  }
  log(`QUEUE: ${queue.length} open task(s) for ${CONSUMER_AGENT}, ${answered.size} thread(s) already answered`);

  const outcomes: ConsumeOutcome[] = [];
  for (const task of queue) {
    // `list` carries envelopes only. Warnings live on the single-message route,
    // and without them the gate cannot tell a clean `READ_ONLY` from one that
    // lost a qualifier to a YAML comment.
    const warnings = await readWarnings(options.client, inbox, task.id, log);
    outcomes.push(
      await processTask(task, {
        ...options,
        inbox,
        ackBox,
        log,
        now,
        postBlockers,
        answered,
        reported,
        capabilities: options.capabilities,
        warnings,
      }),
    );
  }
  return outcomes;
}

/**
 * A message whose warnings cannot be read is treated as damaged, not as clean.
 * Failing open here would undo the gate this function exists to feed.
 */
async function readWarnings(
  client: BusHttpClient,
  box: BusBox,
  id: string,
  log: (line: string) => void,
): Promise<BusValidationError[]> {
  try {
    return (await client.read(box, id)).warnings ?? [];
  } catch (error) {
    log(`WARN  ${id}: could not read parse warnings (${error instanceof Error ? error.message : String(error)})`);
    return [{ field: LOST_TEXT_FIELD, key: "mode", message: "parse warnings unavailable — treating the message as damaged" }];
  }
}

interface ProcessContext extends ConsumeOptions {
  inbox: BusBox;
  ackBox: BusBox;
  log: (line: string) => void;
  now: () => Date;
  postBlockers: boolean;
  answered: ReadonlySet<string>;
  reported: ReadonlyMap<string, Set<string>>;
  warnings: readonly BusValidationError[];
}

async function processTask(task: BusEnvelope, ctx: ProcessContext): Promise<ConsumeOutcome> {
  // Durable state is consulted before the gates. Once this runner has posted
  // anything on the thread — a result or a blocker — `already_handled` would
  // answer every later pass, hiding both the task that still needs acking and
  // the one parked for the founder behind the same generic skip.
  const prior = await ctx.ledger.read(task.id);
  if (prior && !ctx.dryRun) {
    const owner = ctx.owner ?? runnerOwner();
    const plan = planFor(prior, { now: ctx.now(), owner, idempotent: prior.idempotent });

    if (plan.action === "skip") {
      ctx.log(`SKIP  ${task.id}: ${plan.code} — ${plan.reason}`);
      return { taskId: task.id, action: "skipped", code: plan.code, reason: plan.reason };
    }
    if (plan.action === "needs_founder") {
      return needsFounder(task, ctx, owner, plan.code, plan.reason);
    }
    if (plan.action === "resume_persistence") {
      const capability = (ctx.capabilities ?? DEFAULT_CAPABILITIES).find((entry) => entry.id === prior.capability_id);
      if (!capability) {
        return needsFounder(task, ctx, owner, "capability_gone", `capability ${prior.capability_id} is no longer registered`);
      }
      ctx.log(`RESUME ${task.id}: ${prior.state} — writing the stored reply, not re-running Claude`);
      return persistResult(task, ctx, capability, prior, owner);
    }
    // `execute`: the claim lapsed before anything ran, so fall through to the
    // gates exactly as a fresh task would.
  }

  const decision = evaluateTask(task, {
    handled: ctx.answered,
    capabilities: ctx.capabilities,
    warnings: ctx.warnings,
  });

  if (!decision.execute) {
    if (!decision.reportable) {
      ctx.log(`SKIP  ${task.id}: ${decision.code} — ${decision.reason}`);
      return { taskId: task.id, action: "skipped", code: decision.code, reason: decision.reason };
    }
    // Already explained on the bus: stay silent rather than post the same
    // blocker every cycle. The task is left OPEN — closing it is the founder's.
    if (ctx.reported.get(task.id)?.has(decision.code)) {
      ctx.log(`SKIP  ${task.id}: ${decision.code} already reported — no second blocker`);
      return { taskId: task.id, action: "skipped", code: "blocker_deduped", reason: decision.reason };
    }

    ctx.log(`BLOCK ${task.id}: ${decision.code} — ${decision.reason}`);
    if (ctx.dryRun || !ctx.postBlockers) {
      return { taskId: task.id, action: "blocked", code: decision.code, reason: decision.reason };
    }
    const blocker = buildBlockerEnvelope(task, decision, ctx.now());
    const problems = validateOutgoing(blocker);
    if (problems.length > 0) throw new Error(`blocker envelope rejected: ${problems.map((p) => p.field).join(", ")}`);
    const posted = await ctx.client.post(ctx.inbox, blocker);
    await ctx.client.ack(ctx.inbox, posted.id, { status: "blocked", toBox: "outbox" });
    // The task itself stays open: only the founder closes a blocked task.
    return { taskId: task.id, action: "blocked", code: decision.code, reason: decision.reason, blockerId: posted.id };
  }

  if (ctx.dryRun) {
    ctx.log(`PLAN  ${task.id}: would run capability ${decision.capability.id} via a real Claude Code process`);
    return { taskId: task.id, action: "skipped", code: "dry_run", reason: `capability ${decision.capability.id}` };
  }

  const owner = ctx.owner ?? runnerOwner();
  const plan = planFor(await ctx.ledger.read(task.id), {
    now: ctx.now(),
    owner,
    idempotent: decision.capability.idempotent,
  });

  if (plan.action === "skip") {
    ctx.log(`SKIP  ${task.id}: ${plan.code} — ${plan.reason}`);
    return { taskId: task.id, action: "skipped", code: plan.code, reason: plan.reason };
  }
  if (plan.action === "needs_founder") {
    return needsFounder(task, ctx, owner, plan.code, plan.reason);
  }
  if (plan.action === "resume_persistence") {
    const stored = (await ctx.ledger.read(task.id))!;
    ctx.log(`RESUME ${task.id}: ${stored.state} — writing the stored reply, not re-running Claude`);
    return persistResult(task, ctx, decision.capability, stored, owner);
  }

  if (ctx.counter) {
    const cap = ctx.dailyCap ?? DAILY_EXECUTION_CAP;
    const state = capState(await ctx.counter.stamps(), ctx.now(), cap);
    if (state.remaining === 0) {
      return needsFounder(
        task,
        ctx,
        owner,
        "daily_cap_reached",
        `${state.used}/${cap} executions used in the last 24 h; the next slot frees at ${state.resetsAt ?? "unknown"}`,
      );
    }
  }

  const startedAt = ctx.now();
  const claimed: ExecutionRecord = {
    task_id: task.id,
    state: "CLAIMED",
    owner,
    lease_expires_at: leaseUntil(startedAt),
    capability_id: decision.capability.id,
    idempotent: decision.capability.idempotent,
    persistence_attempts: 0,
    updated_at: startedAt.toISOString(),
  };
  await ctx.ledger.write(claimed);

  // EXECUTING is written BEFORE the process starts. A crash from here on is
  // indistinguishable from a completed run, and must be treated as such.
  const holder = {
    record: { ...claimed, state: "EXECUTING" as const, lease_expires_at: leaseUntil(ctx.now()), updated_at: ctx.now().toISOString() },
  };
  await ctx.ledger.write(holder.record);
  const heartbeat = startHeartbeat(ctx.ledger, holder, ctx.now, ctx.log);

  // The budget is spent when Claude is invoked. A run that then fails still
  // consumed the resource the cap exists to bound.
  await ctx.counter?.record(ctx.now());

  let run: ClaudeRunReport;
  try {
    ctx.log(`RUN   ${task.id}: capability ${decision.capability.id} -> real Claude Code`);
    run = await ctx.executor(decision.capability.prompt(task), { taskId: task.id });

    const contractError = decision.capability.verify(run.reply);
    if (contractError) throw new Error(`capability ${decision.capability.id} contract failed: ${contractError}`);
  } catch (error) {
    await heartbeat.stop();
    const reason = error instanceof Error ? error.message : String(error);

    if (error instanceof ClaudeTimeoutError && !decision.capability.idempotent) {
      return needsFounder(task, ctx, owner, "execution_unknown", reason);
    }
    // Everything else either never started or came back reporting failure: no
    // reply exists, so clearing the state leaves the task cleanly retryable.
    await ctx.ledger.clear(task.id);
    ctx.log(`FAIL  ${task.id}: ${reason}`);
    return { taskId: task.id, action: "failed", reason };
  }
  await heartbeat.stop();

  // The durability anchor: the reply is on disk before any network call.
  const executed: ExecutionRecord = {
    ...holder.record,
    state: "EXECUTED",
    reply: run.reply,
    run: { sessionId: run.sessionId, model: run.model, numTurns: run.numTurns, durationMs: run.durationMs, costUsd: run.costUsd, command: run.command },
    lease_expires_at: leaseUntil(ctx.now()),
    updated_at: ctx.now().toISOString(),
  };
  await ctx.ledger.write(executed);

  return persistResult(task, ctx, decision.capability, executed, owner, run);
}

/** Park a task for the founder: recorded locally and reported on the bus. */
async function needsFounder(
  task: BusEnvelope,
  ctx: ProcessContext,
  owner: string,
  code: string,
  reason: string,
): Promise<ConsumeOutcome> {
  const existing = await ctx.ledger.read(task.id);
  await ctx.ledger.write({
    task_id: task.id,
    state: "NEEDS_FOUNDER",
    owner,
    lease_expires_at: leaseUntil(ctx.now()),
    persistence_attempts: existing?.persistence_attempts ?? 0,
    capability_id: existing?.capability_id,
    idempotent: existing?.idempotent,
    reply: existing?.reply,
    run: existing?.run,
    result_id: existing?.result_id,
    failure: `${code}: ${reason}`,
    updated_at: ctx.now().toISOString(),
  });
  ctx.log(`STOP  ${task.id}: ${code} — ${reason}`);

  if (!ctx.postBlockers) return { taskId: task.id, action: "blocked", code, reason };
  const blocker = buildBlockerEnvelope(task, { execute: false, reportable: true, code, reason }, ctx.now());
  const problems = validateOutgoing(blocker);
  if (problems.length > 0) throw new Error(`blocker envelope rejected: ${problems.map((p) => p.field).join(", ")}`);
  const posted = await ctx.client.post(ctx.inbox, blocker);
  await ctx.client.ack(ctx.inbox, posted.id, { status: "blocked", toBox: "outbox" });
  // The task stays open: only the founder closes it.
  return { taskId: task.id, action: "blocked", code, reason, blockerId: posted.id };
}

/**
 * Write a reply that already exists. Never calls Claude — by the time this runs
 * the answer is on disk, and re-asking would be a second real execution.
 */
async function persistResult(
  task: BusEnvelope,
  ctx: ProcessContext,
  capability: BusCapability,
  stored: ExecutionRecord,
  owner: string,
  run?: ClaudeRunReport,
): Promise<ConsumeOutcome> {
  if (persistenceExhausted(stored)) {
    const reason = stored.failure ?? "persistence budget spent";
    ctx.log(`SKIP  ${task.id}: failed_persistent — ${reason}`);
    return { taskId: task.id, action: "skipped", code: "failed_persistent", reason };
  }

  let current: ExecutionRecord = {
    ...stored,
    owner,
    persistence_attempts: stored.persistence_attempts + 1,
    lease_expires_at: leaseUntil(ctx.now()),
    updated_at: ctx.now().toISOString(),
  };
  await ctx.ledger.write(current);

  const report: ClaudeRunReport = run ?? {
    reply: stored.reply ?? "",
    sessionId: stored.run?.sessionId,
    model: stored.run?.model,
    numTurns: stored.run?.numTurns,
    durationMs: stored.run?.durationMs,
    costUsd: stored.run?.costUsd ?? null,
    command: stored.run?.command ?? "resumed from durable state",
  };

  try {
    if (current.state === "EXECUTED") {
      const result = buildResultEnvelope({ task, capability, run: report, now: ctx.now(), repoCommit: ctx.repoCommit });
      const problems = validateOutgoing(result);
      if (problems.length > 0) {
        throw new Error(`result envelope rejected: ${problems.map((p) => `${p.field}: ${p.message}`).join("; ")}`);
      }
      const posted = await ctx.client.post(ctx.inbox, result);
      current = { ...current, state: "RESULT_POSTED", result_id: posted.id, updated_at: ctx.now().toISOString() };
      await ctx.ledger.write(current);
      ctx.log(`RESULT ${posted.id} posted for ${task.id}`);
    }

    // Both acks tolerate an already-moved message: on a resumed run the first
    // one may have landed before the crash.
    if (!current.result_id) throw new Error("result was posted but its id was not recorded");
    await ackIfPresent(ctx, current.result_id, { status: "done", toBox: "outbox" });
    const acked = await ackIfPresent(ctx, task.id, { status: "done", toBox: ctx.ackBox });
    if (acked) ctx.log(`ACK   ${task.id}: open -> ${acked.status} (${acked.from_box} -> ${acked.to_box})`);

    current = { ...current, state: "DONE", updated_at: ctx.now().toISOString() };
    await ctx.ledger.write(current);
    return { taskId: task.id, action: "executed", resultId: current.result_id, reply: report.reply.trim(), run: report };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (persistenceExhausted(current)) {
      await ctx.ledger.write({ ...current, state: "FAILED_PERSISTENT", failure: reason, updated_at: ctx.now().toISOString() });
      ctx.log(`FAIL  ${task.id}: persistence gave up after ${current.persistence_attempts} attempts — ${reason}`);
      return { taskId: task.id, action: "failed", reason: `persistence gave up after ${current.persistence_attempts} attempts: ${reason}` };
    }
    // The reply stays on disk in EXECUTED/RESULT_POSTED; the next run resumes.
    ctx.log(`FAIL  ${task.id}: persistence attempt ${current.persistence_attempts} — ${reason}`);
    return { taskId: task.id, action: "failed", reason };
  }
}

/** `not_found` means the message already moved, which is the desired end state. */
async function ackIfPresent(
  ctx: ProcessContext,
  id: string,
  options: { status: BusEnvelope["status"]; toBox: BusBox },
): Promise<{ status: string; from_box: string; to_box: string } | undefined> {
  try {
    return await ctx.client.ack(ctx.inbox, id, options);
  } catch (error) {
    if ((error as { status?: number }).status === 404) return undefined;
    throw error;
  }
}

/* ------------------------------------------------------------------ watch */

export const DEFAULT_POLL_INTERVAL_MS = 60_000;
const MAX_BACKOFF_MS = 10 * 60_000;

export interface WatchOptions extends ConsumeOptions {
  intervalMs?: number;
  /** Aborting finishes the cycle in flight, then stops. */
  signal?: AbortSignal;
  /** Stamped after every cycle so "quiet" can be told from "dead". */
  livenessFile?: string;
  /** Bounded runs, for tests and one-off sweeps. */
  maxCycles?: number;
}

export interface WatchReport {
  cycles: number;
  executed: number;
  failed: number;
  errors: number;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * The always-on loop: one `runConsumer` cycle every interval, forever.
 *
 * It owns no policy of its own. Everything that decides whether work happens —
 * the gates, the lease, the durable state, the daily ceiling — lives below it,
 * so the loop can be stopped or restarted without changing what a task does.
 *
 * A cycle that throws does not end the loop: the bus or GitHub being briefly
 * unreachable is an outage to wait out, not a reason to stop consuming. Repeated
 * failures back off so an outage is not hammered.
 */
export async function runWatch(options: WatchOptions): Promise<WatchReport> {
  const interval = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const log = options.log ?? (() => {});
  const now = options.now ?? (() => new Date());
  const report: WatchReport = { cycles: 0, executed: 0, failed: 0, errors: 0 };
  let consecutiveErrors = 0;

  log(`WATCH start: every ${Math.round(interval / 1000)}s, stop with SIGINT`);

  while (!options.signal?.aborted && (options.maxCycles === undefined || report.cycles < options.maxCycles)) {
    let delay = interval;
    try {
      const outcomes = await runConsumer(options);
      report.executed += outcomes.filter((outcome) => outcome.action === "executed").length;
      report.failed += outcomes.filter((outcome) => outcome.action === "failed").length;
      consecutiveErrors = 0;
    } catch (error) {
      report.errors += 1;
      consecutiveErrors += 1;
      delay = Math.min(interval * 2 ** consecutiveErrors, MAX_BACKOFF_MS);
      log(
        `ERROR cycle ${report.cycles + 1}: ${error instanceof Error ? error.message : String(error)} ` +
          `— retrying in ${Math.round(delay / 1000)}s`,
      );
    }
    report.cycles += 1;

    if (options.livenessFile) {
      // Silence is not health: an external check needs to tell a quiet bus from
      // a dead runner.
      await writeFile(
        options.livenessFile,
        JSON.stringify({ at: now().toISOString(), ...report, consecutive_errors: consecutiveErrors }),
        "utf8",
      ).catch(() => {});
    }

    if (options.signal?.aborted) break;
    if (options.maxCycles !== undefined && report.cycles >= options.maxCycles) break;
    await sleep(delay, options.signal);
  }

  log(`WATCH stop: ${report.cycles} cycle(s), ${report.executed} executed, ${report.failed} failed, ${report.errors} error(s)`);
  return report;
}

/* -------------------------------------------------------------------- cli */

interface Args {
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): Args {
  const flags: Record<string, string | boolean> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    index += 1;
  }
  return { flags };
}

function flagString(args: Args, key: string): string | undefined {
  const value = args.flags[key];
  return typeof value === "string" ? value : undefined;
}

async function currentCommit(): Promise<string | undefined> {
  try {
    const { stdout } = await execFile("git", ["rev-parse", "HEAD"], { cwd: repoRoot });
    return stdout.trim();
  } catch {
    return undefined;
  }
}

const HELP = `Revolis Bus consumer

  --once              process the current queue and exit (default)
  --task <id>         process only this task
  --url <base>        bus base url (default ${DEFAULT_URL}, env REVOLIS_BUS_URL)
  --box <box>         inbox box to read (default inbox)
  --ack-box <box>     where an acknowledged task lands (default outbox)
  --model <model>     model for the Claude Code process (default ${DEFAULT_MODEL})
  --timeout <ms>      Claude Code timeout (default ${DEFAULT_TIMEOUT_MS})
  --dry-run           evaluate gates, invoke nothing, write nothing
  --no-blockers       do not post a blocker when a task fails the gates

Token: REVOLIS_BUS_TOKEN (environment only).
`;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.flags.help) {
    process.stdout.write(HELP);
    return;
  }

  const token = process.env.REVOLIS_BUS_TOKEN;
  if (!token) {
    process.stderr.write("REVOLIS_BUS_TOKEN must be set in the environment.\n");
    process.exit(1);
  }

  const boxRaw = flagString(args, "box") ?? "inbox";
  const ackRaw = flagString(args, "ack-box") ?? "outbox";
  if (!isBusBox(boxRaw) || !isBusBox(ackRaw)) {
    process.stderr.write(`Unknown box: ${isBusBox(boxRaw) ? ackRaw : boxRaw}\n`);
    process.exit(1);
  }

  const baseUrl = flagString(args, "url") ?? process.env.REVOLIS_BUS_URL ?? DEFAULT_URL;
  const timeout = Number.parseInt(flagString(args, "timeout") ?? String(DEFAULT_TIMEOUT_MS), 10);

  const stateDir = defaultStateDir();
  const capRaw = Number.parseInt(flagString(args, "daily-cap") ?? String(DAILY_EXECUTION_CAP), 10);
  const options: ConsumeOptions = {
    client: new BusHttpClient({ baseUrl, token }),
    executor: realClaudeExecutor({
      model: flagString(args, "model") ?? process.env.REVOLIS_BUS_CONSUMER_MODEL ?? DEFAULT_MODEL,
      timeoutMs: Number.isFinite(timeout) ? timeout : DEFAULT_TIMEOUT_MS,
    }),
    ledger: new FileExecutionLedger(stateDir),
    counter: new FileExecutionCounter(stateDir),
    dailyCap: Number.isFinite(capRaw) ? capRaw : DAILY_EXECUTION_CAP,
    taskId: flagString(args, "task"),
    inboxBox: boxRaw,
    ackBox: ackRaw,
    dryRun: args.flags["dry-run"] === true,
    postBlockers: args.flags["no-blockers"] !== true,
    repoCommit: await currentCommit(),
    log: (line) => process.stdout.write(`${line}\n`),
  };

  if (args.flags.watch === true) {
    const controller = new AbortController();
    for (const signal of ["SIGINT", "SIGTERM"] as const) {
      process.on(signal, () => {
        process.stdout.write(`\n${signal} — finishing the cycle in flight, then stopping\n`);
        controller.abort();
      });
    }
    const intervalRaw = Number.parseInt(flagString(args, "interval") ?? String(DEFAULT_POLL_INTERVAL_MS), 10);
    await runWatch({
      ...options,
      intervalMs: Number.isFinite(intervalRaw) ? intervalRaw : DEFAULT_POLL_INTERVAL_MS,
      signal: controller.signal,
      livenessFile: path.join(stateDir, "liveness.json"),
    });
    return;
  }

  const outcomes = await runConsumer(options);
  const executed = outcomes.filter((outcome) => outcome.action === "executed").length;
  const failed = outcomes.filter((outcome) => outcome.action === "failed").length;
  process.stdout.write(`\nCONSUMER: ${outcomes.length} task(s), ${executed} executed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
