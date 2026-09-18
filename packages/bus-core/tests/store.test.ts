import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BusStoreError, FileBusStore } from "../src/store.ts";
import { parseBusDocument } from "../src/envelope.ts";
import type { BusEnvelope } from "../src/types.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoBusRoot = path.resolve(here, "../../../.ai/bus");

function envelope(overrides: Partial<BusEnvelope> = {}): BusEnvelope {
  return {
    v: 1,
    id: "MSG-20260918-001-test",
    type: "result",
    status: "done",
    from: "claude-code",
    to: "sol-gpt",
    created_at: "2026-09-18T09:00:00Z",
    summary: "test message",
    body: "## Summary\n\ndetail",
    ...overrides,
  };
}

async function newStore(): Promise<FileBusStore> {
  const root = await mkdtemp(path.join(tmpdir(), "bus-store-"));
  return new FileBusStore(root);
}

test("write then read round trips through the filesystem", async () => {
  const store = await newStore();
  const ref = await store.write("outbox", envelope());
  assert.equal(ref.id, "MSG-20260918-001-test");
  const doc = await store.read("outbox", "MSG-20260918-001-test");
  assert.equal(doc.envelope?.summary, "test message");
  assert.deepEqual(doc.errors, []);
});

test("write refuses to silently overwrite an existing message", async () => {
  const store = await newStore();
  await store.write("outbox", envelope());
  await assert.rejects(() => store.write("outbox", envelope({ summary: "changed" })), (error: BusStoreError) => {
    assert.equal(error.code, "conflict");
    return true;
  });
  const ref = await store.write("outbox", envelope({ summary: "changed" }), { overwrite: true });
  const raw = await readFile(ref.path, "utf8");
  assert.match(raw, /summary: changed/);
});

test("write rejects an invalid envelope before touching disk", async () => {
  const store = await newStore();
  await assert.rejects(() => store.write("outbox", envelope({ summary: "" })), (error: BusStoreError) => {
    assert.equal(error.code, "invalid");
    return true;
  });
  assert.deepEqual(await store.list("outbox"), []);
});

test("write leaves no partial file behind", async () => {
  const store = await newStore();
  const ref = await store.write("outbox", envelope());
  const files = await readdir(path.dirname(ref.path));
  assert.deepEqual(files, ["MSG-20260918-001-test.md"]);
});

test("reading a missing message is a typed not_found", async () => {
  const store = await newStore();
  await assert.rejects(() => store.read("inbox", "MSG-20260918-999-nope"), (error: BusStoreError) => {
    assert.equal(error.code, "not_found");
    return true;
  });
});

test("path traversal in an id is rejected", async () => {
  const store = await newStore();
  await assert.rejects(() => store.read("inbox", "../../etc/passwd"), (error: BusStoreError) => {
    assert.equal(error.code, "invalid");
    return true;
  });
});

test("move relocates a message between boxes", async () => {
  const store = await newStore();
  await store.write("inbox", envelope());
  const moved = await store.move("inbox", "MSG-20260918-001-test", "outbox");
  assert.equal(moved.box, "outbox");
  assert.deepEqual(await store.list("inbox"), []);
  assert.equal((await store.list("outbox")).length, 1);
});

test("readBox filters by recipient and status", async () => {
  const store = await newStore();
  await store.write("inbox", envelope({ id: "MSG-20260918-001-a", to: "claude-code", status: "open" }));
  await store.write("inbox", envelope({ id: "MSG-20260918-002-b", to: "founder", status: "open" }));
  await store.write("inbox", envelope({ id: "MSG-20260918-003-c", to: "claude-code", status: "done" }));

  const mine = await store.readBox("inbox", { to: "claude-code", status: "open" });
  assert.deepEqual(mine.map((doc) => doc.envelope?.id), ["MSG-20260918-001-a"]);
});

test("nextSequence continues the day's numbering per box", async () => {
  const store = await newStore();
  const date = new Date("2026-09-18T12:00:00Z");
  assert.equal(await store.nextSequence("outbox", "result", date), 1);
  await store.write("outbox", envelope({ id: "MSG-20260918-001-a" }));
  await store.write("outbox", envelope({ id: "MSG-20260918-007-b" }));
  assert.equal(await store.nextSequence("outbox", "result", date), 8);
  assert.equal(await store.nextSequence("outbox", "result", new Date("2026-09-19T12:00:00Z")), 1);
});

test("listing an absent box is empty rather than an error", async () => {
  const store = await newStore();
  assert.deepEqual(await store.list("archive"), []);
});

test("every existing .ai/bus file still parses (legacy or v1) without throwing", async () => {
  const boxes = ["inbox", "outbox", "tasks", "context", "decisions", "state", "archive"] as const;
  let parsed = 0;
  for (const box of boxes) {
    const dir = path.join(repoBusRoot, box);
    let names: string[];
    try {
      names = await readdir(dir);
    } catch {
      continue;
    }
    for (const name of names.filter((entry) => entry.endsWith(".md"))) {
      const raw = await readFile(path.join(dir, name), "utf8");
      const result = parseBusDocument(raw, `${box}/${name}`);
      assert.ok(result.envelope || result.legacy || result.errors.length > 0, `${box}/${name} produced nothing`);
      parsed += 1;
    }
  }
  assert.ok(parsed > 0, "expected existing bus files in the repository");
});

test("a legacy file is readable through the store without being rewritten", async () => {
  const store = await newStore();
  const root = (store as unknown as { root: string }).root;
  await mkdir(path.join(root, "outbox"), { recursive: true });
  await writeFile(path.join(root, "outbox", "MSG-legacy.md"), "# REVOLIS EXECUTION RESULT\n\nno frontmatter\n", "utf8");
  const doc = await store.read("outbox", "MSG-legacy");
  assert.equal(doc.legacy?.legacy, true);
  assert.equal(doc.envelope, undefined);
});
