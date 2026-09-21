import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createBusHandler, FileBusStore, GitHubBusStore } from "../../../packages/bus-core/src/index.ts";
import { credentialsFromEnv, nodeAdapter, storeFromEnv, writableBoxesFromEnv } from "../serve.ts";

test("storeFromEnv picks GitHub only when both repo and token are present", () => {
  assert.ok(storeFromEnv({ REVOLIS_BUS_ROOT: "/tmp/bus" }) instanceof FileBusStore);
  assert.ok(storeFromEnv({ REVOLIS_BUS_GITHUB_TOKEN: "t", REVOLIS_BUS_ROOT: "/tmp/bus" }) instanceof FileBusStore);
  assert.ok(
    storeFromEnv({ REVOLIS_BUS_GITHUB_TOKEN: "t", REVOLIS_BUS_REPO: "owner/repo" }) instanceof GitHubBusStore,
  );
});

test("a malformed repo is rejected instead of silently falling back to disk", () => {
  assert.throws(() => storeFromEnv({ REVOLIS_BUS_GITHUB_TOKEN: "t", REVOLIS_BUS_REPO: "justrepo" }), /owner\/repo/);
});

test("writable boxes come from env and unknown boxes are rejected", () => {
  assert.equal(writableBoxesFromEnv({}), undefined);
  assert.deepEqual(writableBoxesFromEnv({ REVOLIS_BUS_WRITABLE_BOXES: "inbox, tasks" }), ["inbox", "tasks"]);
  assert.throws(() => writableBoxesFromEnv({ REVOLIS_BUS_WRITABLE_BOXES: "inbox,prod" }), /prod/);
});

test("per-agent credentials come from env, and their absence is not silently equivalent", () => {
  // No per-agent secret must never look like per-agent auth. `undefined` is what
  // sends serve.ts down the DEGRADED branch, where it says so out loud.
  assert.equal(credentialsFromEnv({}), undefined);
  assert.equal(credentialsFromEnv({ REVOLIS_BUS_TOKEN: "shared" }), undefined);

  const both = credentialsFromEnv({ REVOLIS_BUS_TOKEN_SOL: "a", REVOLIS_BUS_TOKEN_CLAUDE: "b" })!;
  assert.deepEqual(
    both.map((credential) => [credential.agent, credential.execution === true]),
    [
      ["sol-gpt", false],
      ["claude-code", true],
    ],
  );

  // A half-migration locks the missing side out instead of dropping back to a
  // credential that carries no identity.
  const solOnly = credentialsFromEnv({ REVOLIS_BUS_TOKEN_SOL: "a" })!;
  assert.deepEqual(
    solOnly.map((credential) => credential.agent),
    ["sol-gpt"],
  );
});

test("a configured writable list cannot strip the execution agent of outbox", async () => {
  const credentials = credentialsFromEnv({
    REVOLIS_BUS_TOKEN_CLAUDE: "b",
    REVOLIS_BUS_WRITABLE_BOXES: "inbox,tasks",
  })!;
  const root = await mkdtemp(path.join(tmpdir(), "bus-serve-writable-"));
  const handle = createBusHandler({ store: new FileBusStore(root), credentials });

  const response = await handle(
    new Request("https://bus.test/bus/messages?box=outbox", {
      method: "POST",
      headers: { authorization: "Bearer b", "content-type": "application/json" },
      body: JSON.stringify({
        type: "result",
        status: "done",
        from: "claude-code",
        to: "sol-gpt",
        summary: "execution identity keeps outbox",
        body: "detail",
      }),
    }),
  );
  assert.equal(response?.status, 201, await response!.text());
});

test("the node adapter serves the bus over real HTTP", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "bus-serve-"));
  const store = new FileBusStore(root);
  const handle = createBusHandler({ store, token: "secret" });
  const server = createServer((incoming, outgoing) => void nodeAdapter(handle)(incoming, outgoing));
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as { port: number };

  try {
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, 200);

    const anonymous = await fetch(`http://127.0.0.1:${port}/bus/messages`);
    assert.equal(anonymous.status, 401);

    const posted = await fetch(`http://127.0.0.1:${port}/bus/messages?box=inbox`, {
      method: "POST",
      headers: { authorization: "Bearer secret", "content-type": "application/json" },
      body: JSON.stringify({
        type: "task",
        status: "open",
        from: "sol-gpt",
        to: "claude-code",
        summary: "Classify 347 branches",
        body: "read-only audit",
      }),
    });
    assert.equal(posted.status, 201);
    const { id } = (await posted.json()) as { id: string };

    const listed = await fetch(`http://127.0.0.1:${port}/bus/messages?box=inbox&format=digest`, {
      headers: { authorization: "Bearer secret" },
    });
    assert.match(await listed.text(), new RegExp(id));

    const unknown = await fetch(`http://127.0.0.1:${port}/nope`);
    assert.equal(unknown.status, 404);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
