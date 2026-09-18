#!/usr/bin/env node
/**
 * BUS handshake harness — the three tests that decide whether the transport
 * actually removes the founder from the loop.
 *
 *   BUS-001  transport:   strategic agent -> BUS -> execution agent
 *   BUS-002  return path: execution agent -> BUS -> strategic agent
 *   BUS-003  gate:        a GO REQUIRED result cannot be cleared by the bus
 *
 * Two modes:
 *
 *   npm run bus:handshake
 *       Local: starts a throwaway server over a temp bus root and runs all
 *       three tests. Proves the code path. No tunnel, no repo writes.
 *
 *   REVOLIS_BUS_TOKEN=... npm run bus:handshake -- --url https://<tunnel-host>
 *       Remote: runs the identical tests against a live endpoint — the same
 *       calls a ChatGPT Custom GPT Action makes. This is the real dogfood.
 *
 * The token is read from the environment only. Never pass it as a flag: flags
 * land in shell history and in the process list.
 */

import { createServer, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { createBusHandler, FileBusStore, type BusEnvelope } from "../../packages/bus-core/src/index.ts";
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

interface Ctx {
  baseUrl: string;
  token: string;
  /** Present only in local mode: the same files, reached without HTTP. */
  store?: FileBusStore;
  log: string[];
}

class HandshakeError extends Error {}

function record(ctx: Ctx, line: string): void {
  ctx.log.push(line);
  process.stdout.write(`${line}\n`);
}

async function call(ctx: Ctx, method: string, url: string, body?: unknown, token = ctx.token): Promise<Response> {
  return fetch(`${ctx.baseUrl}${url}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
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
  record(ctx, `ENDPOINT: ${ctx.baseUrl} reachable (health ${health.status})`);

  const anonymous = await fetch(`${ctx.baseUrl}/bus/messages`);
  expect(anonymous.status === 401, `unauthenticated read returned ${anonymous.status}, expected 401`);

  const wrongToken = await call(ctx, "GET", "/bus/messages", undefined, `${ctx.token}-wrong`);
  expect(wrongToken.status === 401, `wrong token returned ${wrongToken.status}, expected 401`);

  const authorized = await call(ctx, "GET", "/bus/messages?box=inbox");
  expect(authorized.ok, `authorized read returned ${authorized.status}`);
  record(ctx, "AUTH: anonymous 401, wrong token 401, valid token 200");
}

/** BUS-001 — the strategic agent posts a task and the execution side sees it. */
async function bus001(ctx: Ctx): Promise<string> {
  const response = await call(ctx, "POST", "/bus/messages?box=inbox", HANDSHAKE_TASK);
  expect(response.status === 201, `POST task returned ${response.status}`);
  const { id } = (await response.json()) as { id: string };

  if (ctx.store) {
    // Reached through the store, not HTTP: proves both access paths are one bus.
    const docs = await ctx.store.readBox("inbox", { to: "claude-code", status: "open" });
    expect(docs.some((doc) => doc.envelope?.id === id), `${id} not visible to the execution agent on disk`);
  } else {
    const pulled = await call(ctx, "GET", "/bus/messages?box=inbox&to=claude-code&status=open");
    const payload = (await pulled.json()) as { messages: BusEnvelope[] };
    expect(payload.messages.some((envelope) => envelope.id === id), `${id} not returned when pulling as claude-code`);
  }

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

  let resultId: string;
  if (ctx.store) {
    const sequence = await ctx.store.nextSequence("outbox", "result", new Date());
    resultId = `MSG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(sequence).padStart(3, "0")}-handshake-result`;
    await ctx.store.write("outbox", { v: 1, id: resultId, created_at: new Date().toISOString(), ...result } as BusEnvelope);
  } else {
    const posted = await call(ctx, "POST", "/bus/messages?box=inbox", result);
    expect(posted.status === 201, `POST result returned ${posted.status}`);
    resultId = ((await posted.json()) as { id: string }).id;
  }

  const box = ctx.store ? "outbox" : "inbox";
  const digest = await call(ctx, "GET", `/bus/messages?box=${box}&to=sol-gpt&format=digest`);
  expect(digest.ok, `digest read returned ${digest.status}`);
  const text = await digest.text();
  expect(text.includes(resultId), `result ${resultId} missing from the strategic agent's digest`);

  record(ctx, `BUS-002 PASS  return path: claude-code -> BUS -> sol-gpt  (${resultId})`);
  return resultId;
}

/** BUS-003 — the bus must not be able to clear a founder gate. */
async function bus003(ctx: Ctx, resultId: string): Promise<void> {
  const box = ctx.store ? "outbox" : "inbox";

  const digest = await call(ctx, "GET", `/bus/messages/${resultId}?box=${box}&format=digest`);
  const text = await digest.text();
  expect(/FOUNDER_DECISIONS_REQUIRED: [1-9]/.test(text), "digest does not surface a pending founder decision");
  expect(text.includes("[GO REQUIRED]"), "digest does not carry the GO REQUIRED gate");

  // There must be no route that executes, approves or merges anything.
  for (const route of ["/bus/approve", "/bus/execute", "/bus/merge", `/bus/messages/${resultId}/approve`]) {
    const probe = await call(ctx, "POST", route, {});
    expect(
      probe.status === 404 || probe.status === 405,
      `${route} answered ${probe.status} — the bus must expose no execute/approve surface`,
    );
  }

  // ack closes a message; it must not be able to clear the gate.
  const acked = await call(ctx, "POST", `/bus/messages/${resultId}/ack?box=${box}`, {
    status: "done",
    to_box: "outbox",
    // A caller trying to smuggle an approval through ack:
    next_action: { gate: "AUTO-SAFE", description: "approved" },
    decisions_required: [],
  });
  expect(acked.ok, `ack returned ${acked.status}`);

  const after = await call(ctx, "GET", `/bus/messages/${resultId}?box=outbox`);
  const payload = (await after.json()) as { message: BusEnvelope };
  expect(payload.message.next_action?.gate === "GO REQUIRED", "ack changed the gate — founder approval was bypassable");
  expect((payload.message.decisions_required ?? []).length > 0, "ack dropped the pending founder decision");

  record(ctx, "BUS-003 PASS  gate: GO REQUIRED survives ack; no execute/approve/merge route exists");
}

async function startLocalServer(token: string): Promise<{ server: Server; baseUrl: string; store: FileBusStore; root: string }> {
  const root = await mkdtemp(path.join(tmpdir(), "bus-handshake-"));
  const store = new FileBusStore(root);
  const server = createServer((incoming, outgoing) => void nodeAdapter(createBusHandler({ store, token }))(incoming, outgoing));
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
    const token = process.env.REVOLIS_BUS_TOKEN;
    if (!token) {
      process.stderr.write("REVOLIS_BUS_TOKEN must be set in the environment for a remote handshake.\n");
      process.exit(1);
    }
    ctx = { baseUrl: remoteUrl.replace(/\/+$/, ""), token, log: [] };
    record(ctx, `MODE: remote (live endpoint — the same calls a ChatGPT Action makes)`);
  } else {
    const token = randomBytes(32).toString("hex"); // throwaway, never persisted
    const local = await startLocalServer(token);
    ctx = { baseUrl: local.baseUrl, token, store: local.store, log: [] };
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

    record(ctx, "");
    record(ctx, "HANDSHAKE: PASS");
    record(ctx, `COPY_PASTE_REQUIRED: ${remoteUrl ? "no — every hop went over the bus" : "n/a (local mode does not involve ChatGPT)"}`);
  } catch (error) {
    record(ctx, "");
    record(ctx, `HANDSHAKE: FAIL — ${error instanceof Error ? error.message : String(error)}`);
    await cleanup();
    process.exit(1);
  }
  await cleanup();
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
