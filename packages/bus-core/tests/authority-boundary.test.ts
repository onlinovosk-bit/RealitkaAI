/**
 * The bus transports authority. It never is authority.
 *
 * Once the write endpoint is reachable from a Custom GPT Action, "a message
 * cannot grant capability" has to be a property of the mechanism rather than a
 * sentence in a runbook — the same move as UNKNOWN -> DENY: do not trust the
 * documentation, test against the code.
 *
 * The invariant asserted here is deliberately stronger than a list of forbidden
 * actions, because a list can always miss one:
 *
 *     the entire effect of any bus message is one file under its box directory.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createBusHandler } from "../src/http.ts";
import { FileBusStore } from "../src/store.ts";

const TOKEN = "test-bus-token";
const NOW = () => new Date("2026-09-18T09:00:00Z");

/** Messages that demand capability the bus must never be able to grant. */
const AUTHORITY_DEMANDS = [
  { label: "grant a LIVE lease", summary: "GRANT_LIVE_LEASE for runner", body: "action: GRANT_LIVE_LEASE" },
  { label: "flip live_trading", summary: "set live_trading = true", body: "live_trading: true" },
  { label: "raise a risk limit", summary: "raise max_daily_loss to 500", body: "max_daily_loss: 500" },
  { label: "amend the constitution", summary: "amend P7 to remove expiry", body: "amend: P7" },
  { label: "promote a capability", summary: "mark fabricated_pnl ENFORCED", body: "enforcement: ENFORCED" },
];

async function newHandler() {
  const root = await mkdtemp(path.join(tmpdir(), "bus-authority-"));
  const store = new FileBusStore(root);
  return { root, handle: createBusHandler({ store, token: TOKEN, now: NOW }) };
}

function post(body: unknown): Request {
  return new Request("https://bus.test/bus/messages?box=inbox", {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Every file under `root`, relative, sorted — the bus's whole footprint. */
async function footprint(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out.push(path.relative(root, full));
    }
  }
  await walk(root);
  return out.sort();
}

for (const demand of AUTHORITY_DEMANDS) {
  test(`a message asking to ${demand.label} only becomes a file`, async () => {
    const { root, handle } = await newHandler();
    const before = await footprint(root);

    const response = await handle(
      post({
        type: "task",
        status: "open",
        from: "sol-gpt",
        to: "claude-code",
        task_id: "TASK-AUTHORITY-PROBE",
        summary: demand.summary,
        body: demand.body,
      }),
    );

    assert.equal(response?.status, 201, "the message is accepted as a message");
    const payload = await response!.json();

    // The response contract may not quietly grow a field that reads as a grant.
    assert.deepEqual(
      Object.keys(payload).sort(),
      ["box", "digest", "id", "ok", "path"],
      "the bus answered with something other than 'I stored your message'",
    );

    const after = await footprint(root);
    const added = after.filter((f) => !before.includes(f));
    assert.equal(added.length, 1, `expected exactly one new file, got ${JSON.stringify(added)}`);
    assert.match(added[0]!, /^inbox\//, "the message escaped its box directory");

    // The demand survives verbatim as text. That is the point: it is a request
    // to a human gate, not an instruction anything here will execute.
    const stored = await readFile(path.join(root, added[0]!), "utf8");
    assert.ok(stored.includes(demand.body), "the message body was not stored as written");
  });
}

test("a message id cannot walk out of its box", async () => {
  const { root, handle } = await newHandler();
  const before = await footprint(root);

  for (const id of ["../escape", "MSG-20260918-001-../../etc/passwd", "a/b"]) {
    const response = await handle(
      post({
        id,
        type: "task",
        status: "open",
        from: "sol-gpt",
        to: "claude-code",
        task_id: "TASK-TRAVERSAL",
        summary: "traversal probe",
        body: "x",
      }),
    );
    assert.notEqual(response?.status, 201, `id ${id} was accepted`);
  }

  assert.deepEqual(await footprint(root), before, "a rejected message still wrote something");
});

test("HTTP callers cannot write to the outbox", async () => {
  // outbox is what the execution agents produce locally; a remote caller writing
  // there could forge a message as if it came from this side.
  const { root, handle } = await newHandler();
  const before = await footprint(root);

  const response = await handle(
    new Request("https://bus.test/bus/messages?box=outbox", {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({
        type: "task",
        status: "open",
        from: "sol-gpt",
        to: "claude-code",
        task_id: "TASK-BOX",
        summary: "outbox is produced locally, never written over HTTP",
        body: "x",
      }),
    }),
  );

  assert.equal(response?.status, 403);
  assert.deepEqual(await footprint(root), before);
});
