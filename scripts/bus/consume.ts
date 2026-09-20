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
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  BusHttpClient,
  buildBlockerEnvelope,
  buildResultEnvelope,
  CONSUMER_AGENT,
  evaluateTask,
  handledTaskIds,
  isBusBox,
  LOST_TEXT_FIELD,
  validateOutgoing,
  type BusBox,
  type BusCapability,
  type BusEnvelope,
  type BusValidationError,
  type ClaudeRunReport,
} from "../../packages/bus-core/src/index.ts";

const execFile = promisify(execFileCallback);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const DEFAULT_URL = "http://127.0.0.1:8787";
const DEFAULT_MODEL = "sonnet";
const DEFAULT_TIMEOUT_MS = 180_000;

/* ------------------------------------------------------------------ claims */

/**
 * Local claim file. The bus is the authoritative duplicate guard; this only
 * closes the window between "started" and "result visible on the bus", and it
 * lives outside the repository so a run never dirties the checkout.
 */
export interface ClaimLedger {
  claim(taskId: string): Promise<boolean>;
  release(taskId: string): Promise<void>;
  complete(taskId: string, resultId: string): Promise<void>;
}

export function defaultStateDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.REVOLIS_BUS_CONSUMER_STATE ?? path.join(tmpdir(), "revolis-bus-consumer");
}

export class FileClaimLedger implements ClaimLedger {
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  private file(taskId: string): string {
    if (taskId.includes("/") || taskId.includes("..")) throw new Error(`Illegal task id: ${taskId}`);
    return path.join(this.dir, `${taskId}.json`);
  }

  async claim(taskId: string): Promise<boolean> {
    await mkdir(this.dir, { recursive: true });
    try {
      // `wx` fails if the file exists: an atomic claim, no read-then-write race.
      await writeFile(this.file(taskId), JSON.stringify({ claimed_at: new Date().toISOString(), pid: process.pid }), {
        encoding: "utf8",
        flag: "wx",
      });
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
      throw error;
    }
  }

  async release(taskId: string): Promise<void> {
    await unlink(this.file(taskId)).catch(() => {});
  }

  async complete(taskId: string, resultId: string): Promise<void> {
    await writeFile(this.file(taskId), JSON.stringify({ completed_at: new Date().toISOString(), result_id: resultId }), "utf8");
  }
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
          reject(new Error(`claude timed out after ${timeoutMs}ms`));
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
  ledger: ClaimLedger;
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
  // Answered threads are the authoritative duplicate guard, across machines.
  const answered = handledTaskIds([
    ...(await options.client.list("outbox", { from: CONSUMER_AGENT, limit: 100 })),
    ...(await options.client.list(inbox, { from: CONSUMER_AGENT, limit: 100 })),
  ]);

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
  warnings: readonly BusValidationError[];
}

async function processTask(task: BusEnvelope, ctx: ProcessContext): Promise<ConsumeOutcome> {
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

  const claimed = await ctx.ledger.claim(task.id);
  if (!claimed) {
    ctx.log(`SKIP  ${task.id}: already claimed by another consumer run`);
    return { taskId: task.id, action: "skipped", code: "already_claimed", reason: "local claim file exists" };
  }

  try {
    ctx.log(`RUN   ${task.id}: capability ${decision.capability.id} -> real Claude Code`);
    const run = await ctx.executor(decision.capability.prompt(task), { taskId: task.id });

    const contractError = decision.capability.verify(run.reply);
    if (contractError) throw new Error(`capability ${decision.capability.id} contract failed: ${contractError}`);

    const result = buildResultEnvelope({
      task,
      capability: decision.capability,
      run,
      now: ctx.now(),
      repoCommit: ctx.repoCommit,
    });
    const problems = validateOutgoing(result);
    if (problems.length > 0) {
      throw new Error(`result envelope rejected: ${problems.map((p) => `${p.field}: ${p.message}`).join("; ")}`);
    }

    // Remote agents may only write to inbox; ack is what moves a finished
    // message into outbox. Same two steps the CLI performs.
    const posted = await ctx.client.post(ctx.inbox, result);
    await ctx.client.ack(ctx.inbox, posted.id, { status: "done", toBox: "outbox" });
    ctx.log(`RESULT ${posted.id} posted for ${task.id}`);

    const acked = await ctx.client.ack(ctx.inbox, task.id, { status: "done", toBox: ctx.ackBox });
    ctx.log(`ACK   ${task.id}: open -> ${acked.status} (${acked.from_box} -> ${acked.to_box})`);

    await ctx.ledger.complete(task.id, posted.id);
    return { taskId: task.id, action: "executed", resultId: posted.id, reply: run.reply.trim(), run };
  } catch (error) {
    // Release the claim so a fixed run can retry; never fabricate a result.
    await ctx.ledger.release(task.id);
    const reason = error instanceof Error ? error.message : String(error);
    ctx.log(`FAIL  ${task.id}: ${reason}`);
    return { taskId: task.id, action: "failed", reason };
  }
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

  const outcomes = await runConsumer({
    client: new BusHttpClient({ baseUrl, token }),
    executor: realClaudeExecutor({
      model: flagString(args, "model") ?? process.env.REVOLIS_BUS_CONSUMER_MODEL ?? DEFAULT_MODEL,
      timeoutMs: Number.isFinite(timeout) ? timeout : DEFAULT_TIMEOUT_MS,
    }),
    ledger: new FileClaimLedger(defaultStateDir()),
    taskId: flagString(args, "task"),
    inboxBox: boxRaw,
    ackBox: ackRaw,
    dryRun: args.flags["dry-run"] === true,
    postBlockers: args.flags["no-blockers"] !== true,
    repoCommit: await currentCommit(),
    log: (line) => process.stdout.write(`${line}\n`),
  });

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
