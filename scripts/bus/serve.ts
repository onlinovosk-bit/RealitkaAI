#!/usr/bin/env node
/**
 * Revolis Bus HTTP transport — standalone server.
 *
 *   REVOLIS_BUS_TOKEN=... node scripts/bus/serve.ts
 *
 * Storage is chosen by environment:
 *   - default: the local checkout (`.ai/bus`), for local runs behind a tunnel
 *   - REVOLIS_BUS_GITHUB_TOKEN + REVOLIS_BUS_REPO: commits straight to GitHub,
 *     so the server can run anywhere without a writable checkout.
 *
 * Fail-closed: without REVOLIS_BUS_TOKEN the server refuses to start. There is
 * no anonymous mode.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createBusHandler,
  FileBusStore,
  GitHubBusStore,
  isBusBox,
  type BusBox,
  type BusCredential,
  type BusStore,
} from "../../packages/bus-core/src/index.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    process.stderr.write(`${name} is required — refusing to start an unauthenticated bus.\n`);
    process.exit(1);
  }
  return value;
}

export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): BusStore {
  const githubToken = env.REVOLIS_BUS_GITHUB_TOKEN;
  const repo = env.REVOLIS_BUS_REPO;
  if (githubToken && repo) {
    const [owner, name] = repo.split("/");
    if (!owner || !name) throw new Error(`REVOLIS_BUS_REPO must be "owner/repo", got "${repo}"`);
    return new GitHubBusStore({
      owner,
      repo: name,
      token: githubToken,
      branch: env.REVOLIS_BUS_BRANCH ?? "main",
      root: env.REVOLIS_BUS_PATH ?? ".ai/bus",
      committer: { name: "revolis-bus", email: "bus@revolis.local" },
    });
  }
  return new FileBusStore(env.REVOLIS_BUS_ROOT ?? path.join(repoRoot, ".ai", "bus"));
}

export function writableBoxesFromEnv(env: NodeJS.ProcessEnv = process.env): BusBox[] | undefined {
  const raw = env.REVOLIS_BUS_WRITABLE_BOXES;
  if (!raw) return undefined;
  const boxes = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const invalid = boxes.filter((box) => !isBusBox(box));
  if (invalid.length > 0) throw new Error(`REVOLIS_BUS_WRITABLE_BOXES contains unknown boxes: ${invalid.join(", ")}`);
  return boxes as BusBox[];
}

/**
 * Per-agent credentials, when the deployment has them. Returns `undefined` when
 * neither is set, which leaves the caller to fall back to the shared secret —
 * loudly, never silently.
 *
 * A half-migration (only one of the two set) is allowed on purpose: the missing
 * side is locked out immediately and visibly, which is safer than quietly
 * dropping back to a credential that carries no identity.
 */
export function credentialsFromEnv(env: NodeJS.ProcessEnv = process.env): BusCredential[] | undefined {
  const writableBoxes = writableBoxesFromEnv(env);
  const credentials: BusCredential[] = [];

  if (env.REVOLIS_BUS_TOKEN_SOL) {
    credentials.push({ id: "sol-gpt", secret: env.REVOLIS_BUS_TOKEN_SOL, agent: "sol-gpt", writableBoxes });
  }
  if (env.REVOLIS_BUS_TOKEN_CLAUDE) {
    credentials.push({
      id: "claude-code",
      secret: env.REVOLIS_BUS_TOKEN_CLAUDE,
      agent: "claude-code",
      writableBoxes,
      execution: true,
    });
  }

  return credentials.length > 0 ? credentials : undefined;
}

/** Bridge node:http onto the Web `Request`/`Response` handler. */
export function nodeAdapter(handle: (request: Request) => Promise<Response | null>) {
  return async function onRequest(incoming: IncomingMessage, outgoing: ServerResponse): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of incoming) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks);

    const request = new Request(`http://${incoming.headers.host ?? "localhost"}${incoming.url ?? "/"}`, {
      method: incoming.method,
      headers: Object.entries(incoming.headers).flatMap(([key, value]) =>
        value === undefined ? [] : [[key, Array.isArray(value) ? value.join(", ") : value] as [string, string]],
      ),
      body: incoming.method === "GET" || incoming.method === "HEAD" || body.length === 0 ? undefined : body,
    });

    const response = (await handle(request)) ?? new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  };
}

function main(): void {
  const credentials = credentialsFromEnv();
  if (!credentials) {
    // Fail closed, exactly as before: no shared secret either means no bus.
    requiredEnv("REVOLIS_BUS_TOKEN");
    process.stderr.write(
      "AUTH MODE: DEGRADED — single shared credential, no caller identity. " +
        "Set REVOLIS_BUS_TOKEN_SOL and REVOLIS_BUS_TOKEN_CLAUDE to bind `from` to the bearer.\n",
    );
  } else {
    process.stderr.write(`AUTH MODE: per-agent (${credentials.map((c) => c.agent).join(", ")})\n`);
  }

  const port = Number.parseInt(process.env.PORT ?? "8787", 10);
  const handle = createBusHandler({
    store: storeFromEnv(),
    ...(credentials ? { credentials } : { token: process.env.REVOLIS_BUS_TOKEN, writableBoxes: writableBoxesFromEnv() }),
  });
  const onRequest = nodeAdapter(handle);

  createServer((incoming, outgoing) => {
    void onRequest(incoming, outgoing).catch((error: unknown) => {
      process.stderr.write(`bus: ${error instanceof Error ? error.message : String(error)}\n`);
      if (!outgoing.headersSent) outgoing.writeHead(500, { "content-type": "application/json" });
      outgoing.end(JSON.stringify({ error: "internal_error" }));
    });
  }).listen(port, () => {
    const backend = process.env.REVOLIS_BUS_GITHUB_TOKEN && process.env.REVOLIS_BUS_REPO ? "github" : "filesystem";
    process.stdout.write(`revolis-bus listening on :${port} (store: ${backend})\n`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
