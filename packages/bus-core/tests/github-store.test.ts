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

interface TreeEntry {
  path: string;
  mode: string;
  type: string;
  sha: string | null;
}

/**
 * @param refConflicts how many times PATCH /git/refs answers 422 before succeeding,
 *        i.e. how often a concurrent writer moves the branch under us.
 */
function fakeGitHub(files: Record<string, string>, refConflicts = 0) {
  const calls: Call[] = [];
  const git = {
    headSha: "commit-head",
    treeSha: "tree-head",
    commits: [] as string[],
    conflictsLeft: refConflicts,
    pending: [] as Array<{ path: string; content: string | null }>,
  };

  const fetchImpl: FetchLike = async (url, init) => {
    const method = init?.method ?? "GET";
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
    calls.push({ url, method, body, headers: (init?.headers ?? {}) as Record<string, string> });
    const pathname = decodeURIComponent(new URL(url).pathname);

    // ---- Git Data API -------------------------------------------------
    const gitPath = pathname.split("/git/")[1];
    if (gitPath !== undefined) {
      if (method === "GET" && gitPath.startsWith("ref/heads/")) {
        return Response.json({ object: { sha: git.headSha } });
      }
      if (method === "GET" && gitPath.startsWith("commits/")) {
        return Response.json({ tree: { sha: git.treeSha } });
      }
      if (method === "POST" && gitPath === "trees") {
        // Creating a tree does not move the branch — only the ref update does.
        // Resolve the blob contents now, apply them on a successful PATCH.
        git.pending = ((body?.tree ?? []) as TreeEntry[]).map((entry) => ({
          path: entry.path,
          content:
            entry.sha === null
              ? null
              : (files[Object.keys(files).find((file) => `sha-${file}` === entry.sha) ?? ""] ?? ""),
        }));
        return Response.json({ sha: "tree-next" });
      }
      if (method === "POST" && gitPath === "commits") {
        git.commits.push(String(body?.tree));
        return Response.json({ sha: "commit-next" });
      }
      if (method === "PATCH" && gitPath.startsWith("refs/heads/")) {
        if (git.conflictsLeft > 0) {
          git.conflictsLeft -= 1;
          return Response.json({ message: "Update is not a fast forward" }, { status: 422 });
        }
        git.headSha = String(body?.sha);
        for (const entry of git.pending) {
          if (entry.content === null) delete files[entry.path];
          else files[entry.path] = entry.content;
        }
        git.pending = [];
        return Response.json({ object: { sha: git.headSha } });
      }
      return Response.json({ message: "unexpected git call" }, { status: 500 });
    }

    const repoPath = pathname.split("/contents/")[1] ?? "";

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
  return { calls, fetchImpl, files, git };
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

test("move is one commit that adds the target and deletes the source", async () => {
  const github = fakeGitHub({ ".ai/bus/inbox/MSG-20260918-001-test.md": serializeEnvelope(envelope) });
  const ref = await store(github.fetchImpl).move("inbox", "MSG-20260918-001-test", "archive");

  assert.equal(ref.path, ".ai/bus/archive/MSG-20260918-001-test.md");
  assert.equal(github.git.commits.length, 1, "a move must be a single commit");

  const tree = github.calls.find((call) => call.method === "POST" && call.url.endsWith("/git/trees"))!;
  assert.equal(tree.body?.base_tree, "tree-head", "the tree must build on the current head");
  assert.deepEqual(tree.body?.tree, [
    {
      path: ".ai/bus/archive/MSG-20260918-001-test.md",
      mode: "100644",
      type: "blob",
      sha: "sha-.ai/bus/inbox/MSG-20260918-001-test.md",
    },
    { path: ".ai/bus/inbox/MSG-20260918-001-test.md", mode: "100644", type: "blob", sha: null },
  ]);

  const commit = github.calls.find((call) => call.method === "POST" && call.url.endsWith("/git/commits"))!;
  assert.deepEqual(commit.body?.parents, ["commit-head"]);
  assert.equal(commit.body?.tree, "tree-next");

  const patch = github.calls.find((call) => call.method === "PATCH")!;
  assert.equal(patch.body?.sha, "commit-next");
  assert.equal(patch.body?.force, undefined, "a non-fast-forward must fail, never overwrite");
});

test("move never falls back to the contents API", async () => {
  const github = fakeGitHub({ ".ai/bus/inbox/MSG-20260918-001-test.md": serializeEnvelope(envelope) });
  await store(github.fetchImpl).move("inbox", "MSG-20260918-001-test", "archive");

  const contentsWrites = github.calls.filter(
    (call) => call.url.includes("/contents/") && call.method !== "GET",
  );
  assert.deepEqual(contentsWrites, [], "PUT+DELETE is exactly the window this replaces");
  assert.equal(
    github.calls.some((call) => call.url.endsWith("/git/blobs")),
    false,
    "the source blob is reused by sha, nothing is uploaded",
  );
});

test("after a move the message is in the target box only", async () => {
  const github = fakeGitHub({ ".ai/bus/inbox/MSG-20260918-001-test.md": serializeEnvelope(envelope) });
  const subject = store(github.fetchImpl);
  await subject.move("inbox", "MSG-20260918-001-test", "archive");

  assert.deepEqual(await subject.list("inbox"), []);
  assert.deepEqual((await subject.list("archive")).map((entry) => entry.id), ["MSG-20260918-001-test"]);
});

test("a branch that moved under us is retried once", async () => {
  const github = fakeGitHub({ ".ai/bus/inbox/MSG-20260918-001-test.md": serializeEnvelope(envelope) }, 1);
  const ref = await store(github.fetchImpl).move("inbox", "MSG-20260918-001-test", "archive");

  assert.equal(ref.box, "archive");
  assert.equal(github.calls.filter((call) => call.method === "PATCH").length, 2);
});

test("a branch that keeps moving fails as a conflict, it never forces", async () => {
  const github = fakeGitHub({ ".ai/bus/inbox/MSG-20260918-001-test.md": serializeEnvelope(envelope) }, 5);
  await assert.rejects(
    () => store(github.fetchImpl).move("inbox", "MSG-20260918-001-test", "archive"),
    (error: BusStoreError) => {
      assert.equal(error.code, "conflict");
      assert.match(error.message, /moved during the move/);
      return true;
    },
  );
  assert.equal(github.calls.filter((call) => call.method === "PATCH").length, 2, "one retry, not a loop");
});

test("a missing source is not_found before any git call", async () => {
  const github = fakeGitHub({});
  await assert.rejects(() => store(github.fetchImpl).move("inbox", "MSG-20260918-001-test", "archive"), (error: BusStoreError) => {
    assert.equal(error.code, "not_found");
    return true;
  });
  assert.deepEqual(github.calls.filter((call) => call.url.includes("/git/")), []);
});

test("a failure names the stage it failed at", async () => {
  const failing: FetchLike = async (url, init) => {
    if (String(url).endsWith("/git/trees")) return Response.json({ message: "boom" }, { status: 500 });
    return fakeGitHub({ ".ai/bus/inbox/MSG-20260918-001-test.md": serializeEnvelope(envelope) }).fetchImpl(url, init);
  };
  await assert.rejects(
    () => store(failing).move("inbox", "MSG-20260918-001-test", "archive"),
    /GitHub move failed to build tree \(500\)/,
  );
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

test("moving into the same box is a no-op, never a delete", async () => {
  const stored = serializeEnvelope(envelope);
  const github = fakeGitHub({ ".ai/bus/inbox/MSG-20260918-001-test.md": stored });

  const ref = await store(github.fetchImpl).move("inbox", "MSG-20260918-001-test", "inbox");

  assert.equal(ref.path, ".ai/bus/inbox/MSG-20260918-001-test.md");
  assert.equal(github.files[".ai/bus/inbox/MSG-20260918-001-test.md"], stored, "the message must survive");
  assert.deepEqual(github.calls.filter((call) => call.url.includes("/git/")), [], "nothing to commit");
});
