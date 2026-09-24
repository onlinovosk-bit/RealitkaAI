#!/usr/bin/env node
/**
 * BUS handshake harness — the tests that decide whether the transport actually
 * removes the founder from the loop.
 *
 *   BUS-001  transport:   strategic agent -> BUS -> execution agent
 *   BUS-002  return path: execution agent -> BUS -> strategic agent
 *   BUS-003  gate:        a GO REQUIRED result cannot be cleared by the bus
 *   BUS-004  identity:    the boundary between the two agents is enforced
 *
 * Two modes:
 *
 *   npm run bus:handshake
 *       Local: starts a throwaway server over a temp bus root and runs every
 *       test. Proves the code path. No tunnel, no repo writes.
 *
 *   REVOLIS_BUS_TOKEN_SOL=... REVOLIS_BUS_TOKEN_CLAUDE=... \
 *   npm run bus:handshake -- --url https://<tunnel-host>
 *       Remote: runs the identical tests against a live endpoint — the same
 *       calls a ChatGPT Custom GPT Action makes. This is the real dogfood.
 *
 * Two secrets, not one. Since per-agent credentials landed in the server, the
 * bearer resolves to an agent and `envelope.from` must match it, so a harness
 * holding a single token cannot post as both sides: BUS-001 speaks as `sol-gpt`
 * and BUS-002 as `claude-code`. A lone `REVOLIS_BUS_TOKEN` still works against
 * a server that is itself still on the shared secret, but that run is DEGRADED
 * and says so — BUS-004 cannot pass where there is no identity to bind.
 *
 * Tokens are read from the environment only. Never pass one as a flag: flags
 * land in shell history and in the process list.
 */

import { createServer, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertUsableBearer,
  createBusHandler,
  FileBusStore,
  type BusAgent,
  type BusAuthMode,
  type BusEnvelope,
} from "../../packages/bus-core/src/index.ts";
import { nodeAdapter } from "./serve.ts";

const HANDSHAKE_TASK = {
  type: "task",
  status: "open",
  from: "sol-gpt",
  to: "claude-code",
  task_id: "TASK-BUS-HANDSHAKE-001",
  mode: "READ_ONLY",
  stop_after_report: true,
  summary: "Potvrd prijatie tejto spravy cez Revolis BUS (bez zmien v repozitari)",
  next_action: { gate: "AUTO-SAFE", description: "Odpovedz result spravou s received=true" },
  body: "Nevykonavaj ziadne zmeny v repozitari. Vrat: received, bus_message_id, current_main_commit, timestamp, response_message_id.",
} as const;

/** A bearer plus the agent the server will resolve it to. */
export interface HandshakeIdentity {
  agent: BusAgent;
  token: string;
}

export interface HandshakeAuth {
  mode: BusAuthMode;
  /** The strategic agent: posts tasks, reads results back. */
  sol: HandshakeIdentity;
  /** The execution agent: alone may write `outbox` and ack into it. */
  claude: HandshakeIdentity;
}

interface Ctx extends HandshakeAuth {
  baseUrl: string;
  /** Present only in local mode: the same files, reached without HTTP. */
  store?: FileBusStore;
  log: string[];
}

class HandshakeError extends Error {}

/**
 * Resolve the two bearers from the environment.
 *
 * Fail closed on a half-migration. `serve.ts` deliberately tolerates one of the
 * two being set — there the missing side is simply locked out, which is visible
 * and safe. Here it is neither: the harness would authenticate one leg and 401
 * the other, and a reader would have to guess which of BUS-001/002 the failure
 * belonged to. A harness whose own credentials are ambiguous cannot certify a
 * boundary, so it refuses to run instead.
 */
export function handshakeAuthFromEnv(env: NodeJS.ProcessEnv = process.env): HandshakeAuth {
  const sol = env.REVOLIS_BUS_TOKEN_SOL;
  const claude = env.REVOLIS_BUS_TOKEN_CLAUDE;

  if (sol && claude) {
    // Checked here, where the variable name is still known. Downstream these are
    // interpolated into `Bearer ${token}` and any complaint is about that.
    assertUsableBearer(sol, "REVOLIS_BUS_TOKEN_SOL");
    assertUsableBearer(claude, "REVOLIS_BUS_TOKEN_CLAUDE");
    if (sol === claude) {
      throw new Error(
        "REVOLIS_BUS_TOKEN_SOL and REVOLIS_BUS_TOKEN_CLAUDE are the same secret — " +
          "the server refuses to start on that, and it would make identity ambiguous here too.",
      );
    }
    return { mode: "per-agent", sol: { agent: "sol-gpt", token: sol }, claude: { agent: "claude-code", token: claude } };
  }

  if (sol || claude) {
    throw new Error(
      `${sol ? "REVOLIS_BUS_TOKEN_SOL" : "REVOLIS_BUS_TOKEN_CLAUDE"} is set but ` +
        `${sol ? "REVOLIS_BUS_TOKEN_CLAUDE" : "REVOLIS_BUS_TOKEN_SOL"} is not. ` +
        "A handshake needs both agents. Set both, or neither plus REVOLIS_BUS_TOKEN for a DEGRADED run.",
    );
  }

  const shared = env.REVOLIS_BUS_TOKEN;
  if (!shared) {
    throw new Error(
      "no bus credential in the environment. Set REVOLIS_BUS_TOKEN_SOL and REVOLIS_BUS_TOKEN_CLAUDE " +
        "(per-agent), or REVOLIS_BUS_TOKEN (shared, DEGRADED), for a remote handshake.",
    );
  }
  assertUsableBearer(shared, "REVOLIS_BUS_TOKEN");
  // One secret worn by both agents: every call still authenticates, but the
  // server binds `from` to nobody, so BUS-004 has no boundary to measure.
  return {
    mode: "shared",
    sol: { agent: "sol-gpt", token: shared },
    claude: { agent: "claude-code", token: shared },
  };
}

function record(ctx: Ctx, line: string): void {
  ctx.log.push(line);
  process.stdout.write(`${line}\n`);
}

async function call(
  ctx: Ctx,
  method: string,
  url: string,
  body?: unknown,
  as: HandshakeIdentity | { token: string } = ctx.sol,
): Promise<Response> {
  return fetch(`${ctx.baseUrl}${url}`, {
    method,
    headers: {
      authorization: `Bearer ${as.token}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function expect(condition: boolean, message: string): void {
  if (!condition) throw new HandshakeError(message);
}

async function checkEndpoint(ctx: Ctx): Promise<void> {
  const health = await fetch(`${ctx.baseUrl}/health`);
  expect(health.ok, `/health returned ${health.status}`);
  const posture = (await health.json()) as { auth_mode?: BusAuthMode; from_binding?: boolean };
  record(ctx, `ENDPOINT: ${ctx.baseUrl} reachable (health ${health.status})`);
  record(ctx, `SERVER AUTH: ${posture.auth_mode ?? "unknown"} (from_binding: ${posture.from_binding ?? "unknown"})`);

  // Diagnose the mismatch here rather than letting it surface as an opaque 401
  // three calls later. Either direction is a misconfiguration, not a bus fault.
  if (posture.auth_mode && posture.auth_mode !== ctx.mode) {
    expect(
      false,
      ctx.mode === "per-agent"
        ? "the harness holds per-agent tokens but the server reports DEGRADED shared auth — " +
            "it will 401 them. Set REVOLIS_BUS_TOKEN_SOL/_CLAUDE in the SERVER's environment (runbook §1)."
        : "the harness holds one shared token but the server runs per-agent auth — " +
            "it will 401. Set REVOLIS_BUS_TOKEN_SOL and REVOLIS_BUS_TOKEN_CLAUDE here too (runbook §1).",
    );
  }

  const anonymous = await fetch(`${ctx.baseUrl}/bus/messages`);
  expect(anonymous.status === 401, `unauthenticated read returned ${anonymous.status}, expected 401`);

  const wrongToken = await call(ctx, "GET", "/bus/messages", undefined, { token: `${ctx.sol.token}-wrong` });
  expect(wrongToken.status === 401, `wrong token returned ${wrongToken.status}, expected 401`);

  const authorized = await call(ctx, "GET", "/bus/messages?box=inbox");
  expect(authorized.ok, `authorized read returned ${authorized.status}`);
  record(ctx, "AUTH: anonymous 401, wrong token 401, valid token 200");
}

/** BUS-001 — the strategic agent posts a task and the execution side sees it. */
async function bus001(ctx: Ctx): Promise<string> {
  const response = await call(ctx, "POST", "/bus/messages?box=inbox", HANDSHAKE_TASK, ctx.sol);
  expect(response.status === 201, `POST task as ${ctx.sol.agent} returned ${response.status}`);
  const { id } = (await response.json()) as { id: string };

  if (ctx.store) {
    // Reached through the store, not HTTP: proves both access paths are one bus.
    const docs = await ctx.store.readBox("inbox", { to: "claude-code", status: "open" });
    expect(docs.some((doc) => doc.envelope?.id === id), `${id} not visible to the execution agent on disk`);
  }
  // Pull as the execution agent over HTTP in every mode: that is the call the
  // consumer makes, and it must work with the execution bearer specifically.
  const pulled = await call(ctx, "GET", "/bus/messages?box=inbox&to=claude-code&status=open", undefined, ctx.claude);
  expect(pulled.ok, `pulling as ${ctx.claude.agent} returned ${pulled.status}`);
  const payload = (await pulled.json()) as { messages: BusEnvelope[] };
  expect(payload.messages.some((envelope) => envelope.id === id), `${id} not returned when pulling as claude-code`);

  record(ctx, `BUS-001 PASS  transport: sol-gpt -> BUS -> claude-code  (${id})`);
  return id;
}

/** BUS-002 — the execution agent answers and the strategic agent reads it back. */
async function bus002(ctx: Ctx, taskMessageId: string): Promise<string> {
  const result = {
    type: "result",
    status: "done",
    from: "claude-code",
    to: "sol-gpt",
    task_id: "TASK-BUS-HANDSHAKE-001",
    thread: taskMessageId,
    mode: "READ_ONLY",
    stop_after_report: true,
    summary: "received=true, handshake potvrdeny cez BUS",
    counters: { received: 1 },
    decisions_required: [
      {
        id: "D1",
        question: "Rozsirit BUS za ramec handshake (MCP, orchestrator)?",
        recommendation: "nie, az po BUS-001/002/003 v realnej prevadzke",
        gate: "GO REQUIRED",
      },
    ],
    evidence: { commands: ["npm run bus:handshake"] },
    next_action: { gate: "GO REQUIRED", description: "Founder rozhodne o rozsireni BUS za handshake" },
    body: `received: true\nbus_message_id: ${taskMessageId}`,
  };

  // Posted to `inbox`, not `outbox`, although the execution agent may write
  // both: BUS-003 has to ack this message, and acking is gated on
  // `ackSourceBoxes`, which excludes `outbox` on purpose — writing a result
  // there must not become a licence to rewrite results already there. The
  // inbox -> outbox ack in BUS-003 is the same path the consumer uses.
  const posted = await call(ctx, "POST", "/bus/messages?box=inbox", result, ctx.claude);
  expect(posted.status === 201, `POST result as ${ctx.claude.agent} returned ${posted.status}`);
  const resultId = ((await posted.json()) as { id: string }).id;

  const digest = await call(ctx, "GET", "/bus/messages?box=inbox&to=sol-gpt&format=digest", undefined, ctx.sol);
  expect(digest.ok, `digest read returned ${digest.status}`);
  const text = await digest.text();
  expect(text.includes(resultId), `result ${resultId} missing from the strategic agent's digest`);

  record(ctx, `BUS-002 PASS  return path: claude-code -> BUS -> sol-gpt  (${resultId})`);
  return resultId;
}

/** BUS-003 — the bus must not be able to clear a founder gate. */
async function bus003(ctx: Ctx, resultId: string): Promise<void> {
  const digest = await call(ctx, "GET", `/bus/messages/${resultId}?box=inbox&format=digest`, undefined, ctx.sol);
  const text = await digest.text();
  expect(/FOUNDER_DECISIONS_REQUIRED: [1-9]/.test(text), "digest does not surface a pending founder decision");
  expect(text.includes("[GO REQUIRED]"), "digest does not carry the GO REQUIRED gate");

  // There must be no route that executes, approves or merges anything.
  for (const route of ["/bus/approve", "/bus/execute", "/bus/merge", `/bus/messages/${resultId}/approve`]) {
    const probe = await call(ctx, "POST", route, {}, ctx.claude);
    expect(
      probe.status === 404 || probe.status === 405,
      `${route} answered ${probe.status} — the bus must expose no execute/approve surface`,
    );
  }

  // ack closes a message; it must not be able to clear the gate.
  const acked = await call(
    ctx,
    "POST",
    `/bus/messages/${resultId}/ack?box=inbox`,
    {
      status: "done",
      to_box: "outbox",
      // A caller trying to smuggle an approval through ack:
      next_action: { gate: "AUTO-SAFE", description: "approved" },
      decisions_required: [],
    },
    ctx.claude,
  );
  expect(acked.ok, `ack as ${ctx.claude.agent} returned ${acked.status}`);

  const after = await call(ctx, "GET", `/bus/messages/${resultId}?box=outbox`, undefined, ctx.sol);
  const payload = (await after.json()) as { message: BusEnvelope };
  expect(payload.message.next_action?.gate === "GO REQUIRED", "ack changed the gate — founder approval was bypassable");
  expect((payload.message.decisions_required ?? []).length > 0, "ack dropped the pending founder decision");

  record(ctx, "BUS-003 PASS  gate: GO REQUIRED survives ack; no execute/approve/merge route exists");
}

/**
 * BUS-004 — the identity boundary, asserted rather than assumed.
 *
 * Two refusals, and the error code matters as much as the status: one proves
 * `outbox` is the execution agent's alone, the other that `from` is bound to
 * the bearer. A 403 for the wrong reason would pass a status check while
 * leaving the actual boundary untested.
 */
async function bus004(ctx: Ctx): Promise<void> {
  if (ctx.mode !== "per-agent") {
    record(ctx, "BUS-004 SKIP  identity: shared secret carries no identity — nothing to bind, nothing to test");
    return;
  }

  const asClaudeShaped = { ...HANDSHAKE_TASK, from: "claude-code", summary: "BUS-004 forged from (must be refused)" };

  const toOutbox = await call(ctx, "POST", "/bus/messages?box=outbox", { ...HANDSHAKE_TASK }, ctx.sol);
  expect(toOutbox.status === 403, `sol-gpt POST outbox returned ${toOutbox.status}, expected 403`);
  const outboxError = ((await toOutbox.json()) as { error?: string }).error;
  expect(outboxError === "box_not_writable", `sol-gpt POST outbox refused as "${outboxError}", expected box_not_writable`);

  const forged = await call(ctx, "POST", "/bus/messages?box=inbox", asClaudeShaped, ctx.sol);
  expect(forged.status === 403, `sol-gpt posting as claude-code returned ${forged.status}, expected 403`);
  const forgedError = ((await forged.json()) as { error?: string }).error;
  expect(
    forgedError === "from_not_authorized",
    `forged from refused as "${forgedError}", expected from_not_authorized`,
  );

  record(ctx, "BUS-004 PASS  identity: sol-gpt 403 on outbox (box_not_writable) and on a forged from (from_not_authorized)");
}

async function startLocalServer(
  auth: HandshakeAuth,
): Promise<{ server: Server; baseUrl: string; store: FileBusStore; root: string }> {
  const root = await mkdtemp(path.join(tmpdir(), "bus-handshake-"));
  const store = new FileBusStore(root);
  // Local mode mirrors the deployed posture, so BUS-004 is a real test here and
  // not something only a tunnel can exercise.
  const handle = createBusHandler({
    store,
    credentials: [
      { id: "sol-gpt", secret: auth.sol.token, agent: "sol-gpt" },
      { id: "claude-code", secret: auth.claude.token, agent: "claude-code", execution: true },
    ],
  });
  const server = createServer((incoming, outgoing) => void nodeAdapter(handle)(incoming, outgoing));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  return { server, baseUrl: `http://127.0.0.1:${port}`, store, root };
}

async function main(): Promise<void> {
  const urlFlag = process.argv.indexOf("--url");
  const remoteUrl = urlFlag === -1 ? undefined : process.argv[urlFlag + 1];

  let ctx: Ctx;
  let cleanup: () => Promise<void> = async () => {};

  if (remoteUrl) {
    let auth: HandshakeAuth;
    try {
      auth = handshakeAuthFromEnv();
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    }
    ctx = { baseUrl: remoteUrl.replace(/\/+$/, ""), ...auth, log: [] };
    record(ctx, `MODE: remote (live endpoint — the same calls a ChatGPT Action makes)`);
    if (auth.mode === "shared") {
      record(ctx, "AUTH: DEGRADED — one shared secret for both agents; `from` binds to nobody");
    }
  } else {
    // Throwaway secrets, never persisted, distinct so identity is unambiguous.
    const auth: HandshakeAuth = {
      mode: "per-agent",
      sol: { agent: "sol-gpt", token: randomBytes(32).toString("hex") },
      claude: { agent: "claude-code", token: randomBytes(32).toString("hex") },
    };
    const local = await startLocalServer(auth);
    ctx = { baseUrl: local.baseUrl, ...auth, store: local.store, log: [] };
    cleanup = async () => {
      await new Promise<void>((resolve) => local.server.close(() => resolve()));
      await rm(local.root, { recursive: true, force: true });
    };
    record(ctx, "MODE: local (throwaway server + temp bus root; no repo writes, no tunnel)");
  }

  try {
    await checkEndpoint(ctx);
    const taskId = await bus001(ctx);
    const resultId = await bus002(ctx, taskId);
    await bus003(ctx, resultId);
    await bus004(ctx);

    record(ctx, "");
    record(ctx, ctx.mode === "per-agent" ? "HANDSHAKE: PASS" : "HANDSHAKE: PASS (DEGRADED — identity boundary untested)");
    record(ctx, `COPY_PASTE_REQUIRED: ${remoteUrl ? "no — every hop went over the bus" : "n/a (local mode does not involve ChatGPT)"}`);
  } catch (error) {
    record(ctx, "");
    record(ctx, `HANDSHAKE: FAIL — ${error instanceof Error ? error.message : String(error)}`);
    await cleanup();
    process.exit(1);
  }
  await cleanup();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  });
}
