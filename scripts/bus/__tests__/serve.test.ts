import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createBusHandler, FileBusStore, GitHubBusStore } from "../../../packages/bus-core/src/index.ts";
import { credentialsFromEnv, githubIntended, nodeAdapter, preflightGitHub, storeFromEnv, writableBoxesFromEnv } from "../serve.ts";

test("storeFromEnv picks GitHub only when both repo and token are present", () => {
  assert.ok(storeFromEnv({ REVOLIS_BUS_ROOT: "/tmp/bus" }) instanceof FileBusStore);
  assert.ok(
    storeFromEnv({ REVOLIS_BUS_GITHUB_TOKEN: "t", REVOLIS_BUS_REPO: "owner/repo" }) instanceof GitHubBusStore,
  );
});

test("a half-configured GitHub backend refuses to start instead of falling back to disk", () => {
  // Behaviour change, deliberate: a token without a repo used to return a
  // FileBusStore. The server then ran, the tunnel went up, the Action was
  // configured, messages were accepted — and nothing reached the repository.
  // Silent and expensive, so it is now an error that names what is missing.
  assert.throws(
    () => storeFromEnv({ REVOLIS_BUS_GITHUB_TOKEN: "t", REVOLIS_BUS_ROOT: "/tmp/bus" }),
    /REVOLIS_BUS_REPO is missing/,
  );
  assert.throws(() => storeFromEnv({ REVOLIS_BUS_REPO: "owner/repo" }), /REVOLIS_BUS_GITHUB_TOKEN is missing/);
});

test("a branch name alone counts as asking for GitHub — it means nothing on disk", () => {
  assert.equal(githubIntended({ REVOLIS_BUS_BRANCH: "bus/main" }), true);
  assert.equal(githubIntended({ REVOLIS_BUS_ROOT: "/tmp/bus" }), false);
  // The likeliest shape of the mistake: the branch is exported, the credentials
  // are not, and the run would otherwise write to the local checkout.
  assert.throws(
    () => storeFromEnv({ REVOLIS_BUS_BRANCH: "bus/main" }),
    /REVOLIS_BUS_GITHUB_TOKEN and REVOLIS_BUS_REPO are missing/,
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

/** A fetch that answers each URL from a table, so no network is touched. */
function stubFetch(routes: Record<string, { status: number; body?: unknown }>) {
  const seen: string[] = [];
  const impl = async (url: string): Promise<Response> => {
    seen.push(url);
    const key = Object.keys(routes).find((fragment) => url.includes(fragment));
    const route = key ? routes[key]! : { status: 404 };
    return new Response(JSON.stringify(route.body ?? {}), {
      status: route.status,
      headers: { "content-type": "application/json" },
    });
  };
  return { impl, seen };
}

const TARGET = { owner: "onlinovosk-bit", repo: "RealitkaAI", branch: "bus/main", token: "pat", apiBase: "https://api.test" };

test("preflight passes when the repo is writable and the branch exists", async () => {
  const { impl, seen } = stubFetch({
    "/repos/onlinovosk-bit/RealitkaAI/branches/": { status: 200 },
    "/repos/onlinovosk-bit/RealitkaAI": { status: 200, body: { permissions: { push: true } } },
  });
  await preflightGitHub(TARGET, impl);
  // Two reads and nothing else: a preflight that wrote would be a side effect
  // on the very branch the run is about to measure.
  assert.equal(seen.length, 2);
  assert.ok(seen.every((url) => url.startsWith("https://api.test/repos/")));
});

test("preflight names the token when GitHub refuses the credential", async () => {
  const { impl } = stubFetch({ "/repos/onlinovosk-bit/RealitkaAI": { status: 401 } });
  await assert.rejects(() => preflightGitHub(TARGET, impl), /REVOLIS_BUS_GITHUB_TOKEN was refused \(401\)/);
});

test("preflight names the missing scope on 403", async () => {
  const { impl } = stubFetch({ "/repos/onlinovosk-bit/RealitkaAI": { status: 403 } });
  await assert.rejects(() => preflightGitHub(TARGET, impl), /Contents: Read and write/);
});

test("preflight keeps both readings of a 404 on the repo", async () => {
  // GitHub answers 404 rather than 403 for a repository a fine-grained PAT
  // cannot see, so the message must not commit to one cause.
  const { impl } = stubFetch({ "/repos/onlinovosk-bit/RealitkaAI": { status: 404 } });
  await assert.rejects(
    () => preflightGitHub(TARGET, impl),
    /REVOLIS_BUS_REPO is wrong, or the token has no access/,
  );
});

test("preflight gives the exact command when the branch is missing", async () => {
  const { impl } = stubFetch({
    "/repos/onlinovosk-bit/RealitkaAI/branches/": { status: 404 },
    "/repos/onlinovosk-bit/RealitkaAI": { status: 200, body: { permissions: { push: true } } },
  });
  await assert.rejects(
    () => preflightGitHub(TARGET, impl),
    /git push origin main:refs\/heads\/bus\/main/,
  );
});

test("preflight refuses a read-only token before the tunnel goes up", async () => {
  const { impl } = stubFetch({
    "/repos/onlinovosk-bit/RealitkaAI/branches/": { status: 200 },
    "/repos/onlinovosk-bit/RealitkaAI": { status: 200, body: { permissions: { push: false } } },
  });
  await assert.rejects(() => preflightGitHub(TARGET, impl), /can read .* but not write to it/);
});

test("absent permissions are unknown, not denied", async () => {
  // Some token types omit the block entirely. Treating that as a failure would
  // refuse to start a bus that works.
  const { impl } = stubFetch({
    "/repos/onlinovosk-bit/RealitkaAI/branches/": { status: 200 },
    "/repos/onlinovosk-bit/RealitkaAI": { status: 200, body: {} },
  });
  await preflightGitHub(TARGET, impl);
});

test("the preflight refuses an unfilled token without spending a request", async () => {
  // The run that prompted this: the credentials file was loaded before the
  // placeholder was replaced. Previously the value reached `fetch`, which
  // answered about index 15 of `Bearer <sem vlož PAT>` — an offset into a string
  // the operator never wrote. Now it never gets that far.
  let calls = 0;
  const countingFetch = async () => {
    calls += 1;
    return new Response("{}", { status: 200 });
  };

  await assert.rejects(
    () =>
      preflightGitHub(
        { owner: "onlinovosk-bit", repo: "RealitkaAI", branch: "bus/main", token: "<sem vlož PAT>" },
        countingFetch,
      ),
    /REVOLIS_BUS_GITHUB_TOKEN still looks like an unfilled placeholder/,
  );
  // The point is not only the better message: a credential that cannot be sent
  // is not worth a round trip to GitHub either.
  assert.equal(calls, 0);
});

test("a bus secret that no client could put in a header is refused at startup", () => {
  // The server never sends these — it compares them against what arrives. A
  // secret no client can encode authenticates nobody, so the server would
  // listen happily and 401 every call with nothing to point at.
  assert.throws(
    () => credentialsFromEnv({ REVOLIS_BUS_TOKEN_SOL: "<A>", REVOLIS_BUS_TOKEN_CLAUDE: "b" }),
    /REVOLIS_BUS_TOKEN_SOL still looks like an unfilled placeholder/,
  );
  assert.throws(
    () => credentialsFromEnv({ REVOLIS_BUS_TOKEN_SOL: "a", REVOLIS_BUS_TOKEN_CLAUDE: "b\n" }),
    /REVOLIS_BUS_TOKEN_CLAUDE has leading or trailing whitespace/,
  );
  // Well-formed secrets are untouched by the check.
  assert.equal(credentialsFromEnv({ REVOLIS_BUS_TOKEN_SOL: "a", REVOLIS_BUS_TOKEN_CLAUDE: "b" })!.length, 2);
});
