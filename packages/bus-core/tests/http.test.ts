import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createBusHandler, tokenMatches } from "../src/http.ts";
import { FileBusStore } from "../src/store.ts";
import type { BusEnvelope } from "../src/types.ts";

const TOKEN = "test-bus-token";
const NOW = () => new Date("2026-09-18T09:00:00Z");

const message = {
  type: "result",
  status: "done",
  from: "claude-code",
  to: "sol-gpt",
  task_id: "TASK-347-BRANCH-AUDIT",
  summary: "347 branches classified",
  counters: { safe_to_delete: 281 },
  decisions_required: [{ id: "D1", question: "Delete 281 branches?", gate: "GO REQUIRED" }],
  next_action: { gate: "GO REQUIRED", description: "Founder approves batch deletion" },
  body: "detail",
};

async function newHandler() {
  const root = await mkdtemp(path.join(tmpdir(), "bus-http-"));
  const store = new FileBusStore(root);
  return { store, handle: createBusHandler({ store, token: TOKEN, now: NOW }) };
}

function post(url: string, body: unknown, token = TOKEN): Request {
  return new Request(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function get(url: string, token = TOKEN): Request {
  return new Request(url, { headers: { authorization: `Bearer ${token}` } });
}

test("health needs no token and does not expose data", async () => {
  const { handle } = await newHandler();
  const response = await handle(new Request("https://bus.test/health"));
  assert.equal(response?.status, 200);
  assert.deepEqual(await response!.json(), { ok: true, service: "revolis-bus", version: 1 });
});

test("unknown paths fall through so a host app keeps its own routing", async () => {
  const { handle } = await newHandler();
  assert.equal(await handle(new Request("https://bus.test/api/leads")), null);
});

test("a missing or wrong token is rejected", async () => {
  const { handle } = await newHandler();
  assert.equal((await handle(new Request("https://bus.test/bus/messages")))?.status, 401);
  assert.equal((await handle(get("https://bus.test/bus/messages", "wrong-token")))?.status, 401);
  assert.equal((await handle(get("https://bus.test/bus/messages", `${TOKEN}x`)))?.status, 401);
});

test("tokenMatches is length-safe and exact", () => {
  assert.equal(tokenMatches("abc", "abc"), true);
  assert.equal(tokenMatches("abc", "abd"), false);
  assert.equal(tokenMatches("ab", "abc"), false);
  assert.equal(tokenMatches("", "abc"), false);
});

test("post assigns an id, stores the message and returns the digest", async () => {
  const { handle, store } = await newHandler();
  const response = await handle(post("https://bus.test/bus/messages?box=inbox", message));
  assert.equal(response?.status, 201);
  const payload = (await response!.json()) as { id: string; digest: string };
  assert.equal(payload.id, "MSG-20260918-001-347-branches-classified");
  assert.match(payload.digest, /FOUNDER_DECISIONS_REQUIRED: 1/);

  const stored = await store.read("inbox", payload.id);
  assert.equal(stored.envelope?.summary, "347 branches classified");
  assert.equal(stored.envelope?.created_at, "2026-09-18T09:00:00.000Z");
});

test("post refuses boxes a remote agent must not write", async () => {
  const { handle } = await newHandler();
  const response = await handle(post("https://bus.test/bus/messages?box=archive", message));
  assert.equal(response?.status, 403);
  assert.equal(((await response!.json()) as { error: string }).error, "box_not_writable");
});

test("post rejects an incomplete envelope with field-level problems", async () => {
  const { handle } = await newHandler();
  const response = await handle(post("https://bus.test/bus/messages", { ...message, to: "grok", summary: "" }));
  assert.equal(response?.status, 400);
  const payload = (await response!.json()) as { problems: Array<{ field: string }> };
  assert.deepEqual(payload.problems.map((problem) => problem.field).sort(), ["summary", "to"]);
});

test("post rejects malformed json and oversized bodies", async () => {
  const { handle } = await newHandler();
  assert.equal((await handle(post("https://bus.test/bus/messages", "{not json")))?.status, 400);

  const huge = { ...message, body: "x".repeat(70 * 1024) };
  const response = await handle(post("https://bus.test/bus/messages", huge));
  assert.equal(response?.status, 413);
});

test("post refuses a message carrying a credential", async () => {
  const { handle } = await newHandler();
  const response = await handle(post("https://bus.test/bus/messages", { ...message, body: `ghp_${"a".repeat(36)}` }));
  assert.equal(response?.status, 400);
  assert.deepEqual(((await response!.json()) as { detected: string[] }).detected, ["github token"]);
});

test("duplicate ids conflict instead of overwriting", async () => {
  const { handle } = await newHandler();
  const explicit = { ...message, id: "MSG-20260918-050-fixed" };
  assert.equal((await handle(post("https://bus.test/bus/messages", explicit)))?.status, 201);
  assert.equal((await handle(post("https://bus.test/bus/messages", explicit)))?.status, 409);
});

test("list returns json or the digest a strategic agent can read directly", async () => {
  const { handle, store } = await newHandler();
  await handle(post("https://bus.test/bus/messages?box=inbox", message));
  await store.move("inbox", "MSG-20260918-001-347-branches-classified", "outbox");

  const asJson = await handle(get("https://bus.test/bus/messages?box=outbox&to=sol-gpt"));
  const payload = (await asJson!.json()) as { count: number; messages: BusEnvelope[] };
  assert.equal(payload.count, 1);
  assert.equal(payload.messages[0]!.task_id, "TASK-347-BRANCH-AUDIT");

  const digest = await handle(get("https://bus.test/bus/messages?box=outbox&format=digest"));
  assert.match(await digest!.text(), /BUS: 1 messages, FOUNDER_DECISIONS_REQUIRED: 1/);

  const filtered = await handle(get("https://bus.test/bus/messages?box=outbox&to=founder"));
  assert.equal(((await filtered!.json()) as { count: number }).count, 0);
});

test("reading one message supports json and digest", async () => {
  const { handle } = await newHandler();
  await handle(post("https://bus.test/bus/messages?box=inbox", message));
  const id = "MSG-20260918-001-347-branches-classified";

  const one = await handle(get(`https://bus.test/bus/messages/${id}?box=inbox`));
  assert.equal(((await one!.json()) as { message: BusEnvelope }).message.id, id);

  const digest = await handle(get(`https://bus.test/bus/messages/${id}?box=inbox&format=digest`));
  assert.match(await digest!.text(), /^TASK-347-BRANCH-AUDIT/);

  const missing = await handle(get("https://bus.test/bus/messages/MSG-20260918-999-nope?box=inbox"));
  assert.equal(missing?.status, 404);
});

test("ack moves the message out of the inbox and records the new status", async () => {
  const { handle, store } = await newHandler();
  await handle(post("https://bus.test/bus/messages?box=inbox", message));
  const id = "MSG-20260918-001-347-branches-classified";

  const response = await handle(post(`https://bus.test/bus/messages/${id}/ack?box=inbox`, { status: "archived" }));
  assert.equal(response?.status, 200);
  assert.deepEqual(await store.list("inbox"), []);
  const archived = await store.read("archive", id);
  assert.equal(archived.envelope?.status, "archived");
  assert.equal(archived.envelope?.updated_at, "2026-09-18T09:00:00.000Z");
});

test("unsupported methods are refused", async () => {
  const { handle } = await newHandler();
  const response = await handle(
    new Request("https://bus.test/bus/messages", { method: "DELETE", headers: { authorization: `Bearer ${TOKEN}` } }),
  );
  assert.equal(response?.status, 405);
});

test("a supplied but malformed id is reported, not silently replaced", async () => {
  const { handle } = await newHandler();
  const response = await handle(post("https://bus.test/bus/messages", { ...message, id: "not a bus id" }));
  assert.equal(response?.status, 400);
  const payload = (await response!.json()) as { problems: Array<{ field: string }> };
  assert.deepEqual(payload.problems.map((problem) => problem.field), ["id"]);
});
