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

/**
 * Did the operator ask for the GitHub backend? Anything that only makes sense
 * there counts, including `REVOLIS_BUS_BRANCH` — a branch name means nothing to
 * a filesystem store, so setting one is a statement of intent.
 *
 * This exists so a half-configured GitHub backend cannot quietly become a
 * filesystem one. That failure is silent and expensive: the server starts, the
 * tunnel goes up, the Action is configured, messages are accepted — and none of
 * them reach the repository, which is the whole point of the run.
 */
export function githubIntended(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.REVOLIS_BUS_GITHUB_TOKEN || env.REVOLIS_BUS_REPO || env.REVOLIS_BUS_BRANCH);
}

export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): BusStore {
  const githubToken = env.REVOLIS_BUS_GITHUB_TOKEN;
  const repo = env.REVOLIS_BUS_REPO;

  // Fail closed on a half-configured GitHub backend rather than falling back.
  if (githubIntended(env) && !(githubToken && repo)) {
    const missing = [
      githubToken ? null : "REVOLIS_BUS_GITHUB_TOKEN",
      repo ? null : "REVOLIS_BUS_REPO",
    ].filter(Boolean);
    throw new Error(
      `the GitHub backend is configured but ${missing.join(" and ")} ${missing.length > 1 ? "are" : "is"} missing — ` +
        `set ${missing.length > 1 ? "them" : "it"}, or unset the GitHub variables to run on the filesystem on purpose`,
    );
  }

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

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Read-only reachability check for the GitHub backend, run before the server
 * announces itself.
 *
 * Every failure it reports used to surface at the first write instead — by
 * which time a tunnel is up and a ChatGPT Action is pointed at it, so the cost
 * of the mistake is a whole setup, not a restart. Two GETs, no writes: the
 * repository (existence, credential, push permission) and the branch.
 *
 * Throws with the remedy, never a bare status code.
 */
export async function preflightGitHub(
  target: { owner: string; repo: string; branch: string; token: string; apiBase?: string },
  fetchImpl: FetchLike = (url, init) => fetch(url, init),
): Promise<void> {
  const base = (target.apiBase ?? "https://api.github.com").replace(/\/+$/, "");
  const headers = {
    authorization: `Bearer ${target.token}`,
    accept: "application/vnd.github+json",
    "user-agent": "revolis-bus",
  };
  const where = `${target.owner}/${target.repo}`;

  const repoResponse = await fetchImpl(`${base}/repos/${target.owner}/${target.repo}`, { headers });
  if (repoResponse.status === 401) {
    throw new Error("REVOLIS_BUS_GITHUB_TOKEN was refused (401) — the token is invalid, expired or revoked");
  }
  if (repoResponse.status === 403) {
    throw new Error(
      `the token is valid but forbidden on ${where} (403) — grant it "Contents: Read and write", ` +
        "and authorize it for SSO if the organization requires it",
    );
  }
  if (repoResponse.status === 404) {
    // GitHub answers 404 rather than 403 for a repository a fine-grained PAT
    // cannot see, so a wrong name and a missing grant are indistinguishable here
    // and both belong in the message.
    throw new Error(
      `${where} was not found (404) — either REVOLIS_BUS_REPO is wrong, or the token has no access to it`,
    );
  }
  if (!repoResponse.ok) {
    throw new Error(`GitHub preflight on ${where} failed (${repoResponse.status})`);
  }

  const repoInfo = (await repoResponse.json()) as { permissions?: { push?: boolean } };
  // Absent permissions mean unknown, not denied: some token types omit the
  // block. Only an explicit `false` is a finding.
  if (repoInfo.permissions?.push === false) {
    throw new Error(`the token can read ${where} but not write to it — grant "Contents: Read and write"`);
  }

  const branchResponse = await fetchImpl(
    `${base}/repos/${target.owner}/${target.repo}/branches/${encodeURIComponent(target.branch)}`,
    { headers },
  );
  if (branchResponse.status === 404) {
    throw new Error(
      `branch "${target.branch}" does not exist in ${where} — create it once with ` +
        `\`git push origin main:refs/heads/${target.branch}\`, or fix REVOLIS_BUS_BRANCH`,
    );
  }
  if (!branchResponse.ok) {
    throw new Error(`GitHub preflight on branch "${target.branch}" failed (${branchResponse.status})`);
  }
}

async function main(): Promise<void> {
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

  let store: BusStore;
  try {
    store = storeFromEnv();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }

  const backend = githubIntended() ? "github" : "filesystem";
  if (backend === "github") {
    const [owner, repo] = process.env.REVOLIS_BUS_REPO!.split("/");
    const branch = process.env.REVOLIS_BUS_BRANCH ?? "main";
    try {
      await preflightGitHub({ owner: owner!, repo: repo!, branch, token: process.env.REVOLIS_BUS_GITHUB_TOKEN! });
    } catch (error) {
      process.stderr.write(`GitHub preflight failed: ${error instanceof Error ? error.message : String(error)}\n`);
      process.stderr.write("Refusing to start: a bus that cannot write to the repository accepts messages nobody reads.\n");
      process.exit(1);
    }
    process.stderr.write(`GitHub preflight: ${owner}/${repo}@${branch} reachable and writable\n`);
  }

  const handle = createBusHandler({
    store,
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
    // `backend` is the resolved store, decided above — not re-derived here,
    // where a second inference could disagree with the one actually in use.
    process.stdout.write(`revolis-bus listening on :${port} (store: ${backend})\n`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
    process.exit(1);
  });
}
