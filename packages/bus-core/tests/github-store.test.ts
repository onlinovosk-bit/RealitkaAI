import test from "node:test";
import assert from "node:assert/strict";
import { GitHubBusStore, type FetchLike } from "../src/github-store.ts";
import { serializeEnvelope } from "../src/envelope.ts";
import { BusStoreError } from "../src/store.ts";
import type { BusEnvelope } from "../src/types.ts";

const envelope: BusEnvelope = {
  v: 1,
  id: "MSG-20260918-001-test",
  type: "result",
  status: "done",
  from: "claude-code",
  to: "sol-gpt",
  created_at: "2026-09-18T09:00:00Z",
  summary: "test message",
  body: "detail",
};

interface Call {
  url: string;
  method: string;
  body?: Record<string, unknown>;
  headers: Record<string, string>;
}

function fakeGitHub(files: Record<string, string>) {
  const calls: Call[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    const method = init?.method ?? "GET";
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
    calls.push({ url, method, body, headers: (init?.headers ?? {}) as Record<string, string> });
    const repoPath = decodeURIComponent(new URL(url).pathname.split("/contents/")[1] ?? "");

    if (method === "GET") {
      const dirEntries = Object.keys(files).filter((file) => file.startsWith(`${repoPath}/`));
      if (files[repoPath] !== undefined) {
        return Response.json({
          content: Buffer.from(files[repoPath]!, "utf8").toString("base64"),
          encoding: "base64",
          sha: `sha-${repoPath}`,
        });
      }
      if (dirEntries.length > 0) {
        return Response.json(
          dirEntries.map((file) => ({ name: file.split("/").pop(), path: file, type: "file", sha: `sha-${file}` })),
        );
      }
      return Response.json({ message: "Not Found" }, { status: 404 });
    }
    if (method === "PUT") {
      files[repoPath] = Buffer.from(String(body?.content ?? ""), "base64").toString("utf8");
      return Response.json({ content: { path: repoPath } });
    }
    if (method === "DELETE") {
      delete files[repoPath];
      return Response.json({ ok: true });
    }
    return Response.json({ message: "unexpected" }, { status: 500 });
  };
  return { calls, fetchImpl, files };
}

function store(fetchImpl: FetchLike) {
  return new GitHubBusStore({
    owner: "onlinovosk-bit",
    repo: "RealitkaAI",
    token: "test-token",
    branch: "bus/main",
    root: ".ai/bus",
    fetchImpl,
  });
}

test("write commits the serialized envelope to the bus branch", async () => {
  const github = fakeGitHub({});
  const ref = await store(github.fetchImpl).write("inbox", envelope);

  assert.equal(ref.path, ".ai/bus/inbox/MSG-20260918-001-test.md");
  assert.equal(github.files[".ai/bus/inbox/MSG-20260918-001-test.md"], serializeEnvelope(envelope));
  const put = github.calls.find((call) => call.method === "PUT")!;
  assert.equal(put.body?.branch, "bus/main");
  assert.equal(put.body?.message, "bus(inbox): MSG-20260918-001-test");
  assert.equal(put.body?.sha, undefined);
  assert.equal(put.headers.Authorization, "Bearer test-token");
});

test("write refuses to overwrite an existing message", async () => {
  const github = fakeGitHub({ ".ai/bus/inbox/MSG-20260918-001-test.md": serializeEnvelope(envelope) });
  await assert.rejects(() => store(github.fetchImpl).write("inbox", envelope), (error: BusStoreError) => {
    assert.equal(error.code, "conflict");
    return true;
  });
});

test("overwrite sends the current sha so concurrent writes cannot clobber", async () => {
  const github = fakeGitHub({ ".ai/bus/inbox/MSG-20260918-001-test.md": serializeEnvelope(envelope) });
  await store(github.fetchImpl).write("inbox", { ...envelope, status: "archived" }, { overwrite: true });
  const put = github.calls.find((call) => call.method === "PUT")!;
  assert.equal(put.body?.sha, "sha-.ai/bus/inbox/MSG-20260918-001-test.md");
});

test("invalid envelopes never reach GitHub", async () => {
  const github = fakeGitHub({});
  await assert.rejects(() => store(github.fetchImpl).write("inbox", { ...envelope, summary: "" }));
  assert.deepEqual(github.calls, []);
});

test("list and readBox filter on the parsed envelope", async () => {
  const other = { ...envelope, id: "MSG-20260918-002-other", to: "founder" as const };
  const github = fakeGitHub({
    ".ai/bus/outbox/MSG-20260918-001-test.md": serializeEnvelope(envelope),
    ".ai/bus/outbox/MSG-20260918-002-other.md": serializeEnvelope(other),
  });
  const subject = store(github.fetchImpl);
  assert.deepEqual((await subject.list("outbox")).map((ref) => ref.id), [
    "MSG-20260918-001-test",
    "MSG-20260918-002-other",
  ]);
  const forSol = await subject.readBox("outbox", { to: "sol-gpt" });
  assert.deepEqual(forSol.map((doc) => doc.envelope?.id), ["MSG-20260918-001-test"]);
});

test("a missing box lists empty instead of failing", async () => {
  const github = fakeGitHub({});
  assert.deepEqual(await store(github.fetchImpl).list("archive"), []);
});

test("move writes the target then deletes the source", async () => {
  const github = fakeGitHub({ ".ai/bus/inbox/MSG-20260918-001-test.md": serializeEnvelope(envelope) });
  const ref = await store(github.fetchImpl).move("inbox", "MSG-20260918-001-test", "archive");
  assert.equal(ref.path, ".ai/bus/archive/MSG-20260918-001-test.md");
  assert.equal(github.files[".ai/bus/inbox/MSG-20260918-001-test.md"], undefined);
  assert.equal(github.files[".ai/bus/archive/MSG-20260918-001-test.md"], serializeEnvelope(envelope));
  assert.deepEqual(github.calls.map((call) => call.method).filter((method) => method !== "GET"), ["PUT", "DELETE"]);
});

test("nextSequence reads the day's highest id", async () => {
  const github = fakeGitHub({
    ".ai/bus/outbox/MSG-20260918-001-a.md": serializeEnvelope(envelope),
    ".ai/bus/outbox/MSG-20260918-004-b.md": serializeEnvelope(envelope),
  });
  assert.equal(await store(github.fetchImpl).nextSequence("outbox", "result", new Date("2026-09-18T00:00:00Z")), 5);
});

test("a GitHub error surfaces as a store error, never as a silent empty result", async () => {
  const failing: FetchLike = async () => Response.json({ message: "Bad credentials" }, { status: 401 });
  await assert.rejects(() => store(failing).read("inbox", "MSG-20260918-001-test"), /GitHub read failed \(401\)/);
});

test("path traversal is rejected before any request", async () => {
  const github = fakeGitHub({});
  await assert.rejects(() => store(github.fetchImpl).read("inbox", "../../../etc/passwd"));
  assert.deepEqual(github.calls, []);
});
