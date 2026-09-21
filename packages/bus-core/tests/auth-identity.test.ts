/**
 * BUS-AUTH-IDENTITY — the acceptance cases from
 * `docs/architecture/adr-2026-09-21-bus-auth-identity.md` §3.
 *
 * The property under test is not "a bearer matches". It is: the bus can tell
 * WHO is asking, and `envelope.from` is an attestation of the credential that
 * carried it rather than a claim the caller typed.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createBusHandler, type BusCredential } from "../src/http.ts";
import { FileBusStore } from "../src/store.ts";
import type { BusAgent, BusBox } from "../src/types.ts";

const SOL_SECRET = "secret-for-sol-gpt";
const CLAUDE_SECRET = "secret-for-claude-code";
const NOW = () => new Date("2026-09-21T09:00:00Z");

const CREDENTIALS: BusCredential[] = [
  { id: "sol-gpt", secret: SOL_SECRET, agent: "sol-gpt" },
  { id: "claude-code", secret: CLAUDE_SECRET, agent: "claude-code", execution: true },
];

function envelope(from: BusAgent, to: BusAgent) {
  return {
    type: "result",
    status: "done",
    from,
    to,
    task_id: "TASK-AUTH-IDENTITY",
    summary: "identity acceptance case",
    body: "detail",
  };
}

async function newHandler(credentials: BusCredential[] = CREDENTIALS) {
  const root = await mkdtemp(path.join(tmpdir(), "bus-auth-"));
  const store = new FileBusStore(root);
  return { store, handle: createBusHandler({ store, credentials, now: NOW }) };
}

function post(box: BusBox, secret: string, body: unknown): Request {
  return new Request(`https://bus.test/bus/messages?box=${box}`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ack(box: BusBox, id: string, secret: string, body: unknown): Request {
  return new Request(`https://bus.test/bus/messages/${encodeURIComponent(id)}/ack?box=${box}`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Put a message in `inbox` as the agent the credential speaks as. */
async function seedInbox(handle: (r: Request) => Promise<Response | null>, secret: string, from: BusAgent, to: BusAgent) {
  const response = await handle(post("inbox", secret, envelope(from, to)));
  // One read: a Response body cannot be consumed twice, and an eager failure
  // message would consume it before the assertion ever needs one.
  const raw = await response!.text();
  assert.equal(response?.status, 201, raw);
  return JSON.parse(raw) as { id: string };
}

// --- Founder-specified cases 1-6 ------------------------------------------

test("1. sol-gpt may not write outbox", async () => {
  const { handle } = await newHandler();
  const response = await handle(post("outbox", SOL_SECRET, envelope("sol-gpt", "claude-code")));
  assert.equal(response?.status, 403);
  assert.equal((await response!.json()).error, "box_not_writable");
});

test("2. sol-gpt may write inbox, tasks, context and decisions", async () => {
  const { handle } = await newHandler();
  for (const box of ["inbox", "tasks", "context", "decisions"] as BusBox[]) {
    const response = await handle(post(box, SOL_SECRET, envelope("sol-gpt", "claude-code")));
    assert.equal(response?.status, 201, `${box}: ${await response!.text()}`);
  }
});

test("3. claude-code, the execution identity, may write outbox", async () => {
  const { handle } = await newHandler();
  const response = await handle(post("outbox", CLAUDE_SECRET, envelope("claude-code", "sol-gpt")));
  assert.equal(response?.status, 201, await response!.text());
});

test("4. no identity may write state, execution or not", async () => {
  const { handle } = await newHandler();
  for (const secret of [SOL_SECRET, CLAUDE_SECRET]) {
    const response = await handle(post("state", secret, envelope("claude-code", "sol-gpt")));
    assert.equal(response?.status, 403);
  }
});

test("5. sol-gpt cannot impersonate claude-code to reach outbox", async () => {
  const { handle } = await newHandler();
  // Even carrying the right `from`, the credential is the wrong one.
  const response = await handle(post("outbox", SOL_SECRET, envelope("claude-code", "sol-gpt")));
  assert.equal(response?.status, 403);
});

test("6. a revoked credential is unknown — revocation is removal from the list", async () => {
  const { handle } = await newHandler(CREDENTIALS.filter((credential) => credential.agent !== "sol-gpt"));
  const response = await handle(post("inbox", SOL_SECRET, envelope("sol-gpt", "claude-code")));
  assert.equal(response?.status, 401);
  // The remaining credential is unaffected: revocation is per identity.
  assert.equal((await handle(post("inbox", CLAUDE_SECRET, envelope("claude-code", "sol-gpt"))))?.status, 201);
});

// --- Added cases 7-13, each closing a path the six above leave open --------

test("7. a forged `from` is refused even in a box the caller may write", async () => {
  const { handle } = await newHandler();
  // This is the suppressed-execution path: consume.ts builds its duplicate
  // guard from messages whose `from` is claude-code. A forged one convinces the
  // consumer a task was already answered, so the real task never runs.
  const response = await handle(post("inbox", SOL_SECRET, envelope("claude-code", "sol-gpt")));
  assert.equal(response?.status, 403);
  const body = (await response!.json()) as { error: string; identity: string };
  assert.equal(body.error, "from_not_authorized");
  assert.equal(body.identity, "sol-gpt");
  // Unvalidated caller input is not reflected back: `from` has not passed field
  // validation at the point the authority gate runs.
  assert.equal(Object.keys(body).sort().join(","), "error,identity");
});

test("7b. writing outbox does not become a licence to rewrite what is in outbox", async () => {
  const { handle } = await newHandler();
  // The execution identity may POST to outbox, but acking a message OUT of
  // outbox rewrites a result that is already published. Those are separate
  // capabilities and must not be coupled through one list.
  const posted = await handle(post("outbox", CLAUDE_SECRET, envelope("claude-code", "sol-gpt")));
  const { id } = (await posted!.json()) as { id: string };

  const response = await handle(ack("outbox", id, CLAUDE_SECRET, { status: "archived", to_box: "archive" }));
  assert.equal(response?.status, 403);
  assert.equal((await response!.json()).error, "box_not_writable");
});

test("8. sol-gpt cannot ack a message into outbox — the #601 gap", async () => {
  const { handle } = await newHandler();
  const { id } = await seedInbox(handle, SOL_SECRET, "sol-gpt", "claude-code");
  const response = await handle(ack("inbox", id, SOL_SECRET, { status: "done", to_box: "outbox" }));
  assert.equal(response?.status, 403);
  assert.equal((await response!.json()).error, "ack_target_not_writable");
});

test("9. claude-code acking inbox -> outbox still works — the legitimate path", async () => {
  const { handle } = await newHandler();
  const { id } = await seedInbox(handle, CLAUDE_SECRET, "claude-code", "sol-gpt");
  const response = await handle(ack("inbox", id, CLAUDE_SECRET, { status: "done", to_box: "outbox" }));
  const raw = await response!.text();
  assert.equal(response?.status, 200, raw);
  assert.deepEqual(JSON.parse(raw), { ok: true, id, from_box: "inbox", to_box: "outbox", status: "done" });
});

test("9b. the execution agent may ack a task another agent wrote", async () => {
  const { handle } = await newHandler();
  // An ack changes status, never `from`. Binding `from` on ack would forbid
  // exactly what the execution agent exists to do.
  const { id } = await seedInbox(handle, SOL_SECRET, "sol-gpt", "claude-code");
  const response = await handle(ack("inbox", id, CLAUDE_SECRET, { status: "done", to_box: "outbox" }));
  assert.equal(response?.status, 200, await response!.text());
});

test("10. an unknown bearer is 401, unchanged", async () => {
  const { handle } = await newHandler();
  assert.equal((await handle(post("inbox", "not-a-credential", envelope("sol-gpt", "claude-code"))))?.status, 401);
  assert.equal((await handle(post("inbox", `${SOL_SECRET}x`, envelope("sol-gpt", "claude-code"))))?.status, 401);
});

test("11. /health states the auth posture instead of leaving it assumed", async () => {
  const { handle } = await newHandler();
  assert.deepEqual(await (await handle(new Request("https://bus.test/health")))!.json(), {
    ok: true,
    service: "revolis-bus",
    version: 1,
    auth_mode: "per-agent",
    from_binding: true,
    outbox_provenance: "bound",
  });

  const root = await mkdtemp(path.join(tmpdir(), "bus-auth-shared-"));
  const shared = createBusHandler({ store: new FileBusStore(root), token: "shared-secret", now: NOW });
  assert.deepEqual(await (await shared(new Request("https://bus.test/health")))!.json(), {
    ok: true,
    service: "revolis-bus",
    version: 1,
    auth_mode: "shared",
    from_binding: false,
    outbox_provenance: "unverified",
  });
});

test("12. ambiguous configuration refuses to start rather than pick a record", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "bus-auth-dup-"));
  const store = new FileBusStore(root);

  assert.throws(
    () =>
      createBusHandler({
        store,
        credentials: [
          { id: "a", secret: "same-secret", agent: "sol-gpt" },
          { id: "b", secret: "same-secret", agent: "claude-code" },
        ],
      }),
    /share a secret/,
  );

  assert.throws(() => createBusHandler({ store, credentials: [] }), /refusing to serve an unauthenticated bus/);
  assert.throws(
    () => createBusHandler({ store, token: "t", credentials: [{ id: "a", secret: "s", agent: "sol-gpt" }] }),
    /never both/,
  );
  assert.throws(
    () => createBusHandler({ store, credentials: [{ id: "a", secret: "", agent: "sol-gpt" }] }),
    /empty secret/,
  );
});

test("13. a refused write leaves no trace on disk", async () => {
  const { store, handle } = await newHandler();
  const before = await store.readBox("inbox");

  await handle(post("inbox", SOL_SECRET, envelope("claude-code", "sol-gpt"))); // forged from
  await handle(post("outbox", SOL_SECRET, envelope("sol-gpt", "claude-code"))); // forbidden box
  await handle(post("inbox", "not-a-credential", envelope("sol-gpt", "claude-code"))); // unknown bearer

  for (const box of ["inbox", "outbox", "state", "archive"] as BusBox[]) {
    const after = await store.readBox(box);
    assert.equal(after.length, box === "inbox" ? before.length : 0, `${box} changed after a refused write`);
  }
});

// --- The mode that must not quietly look like the one above ----------------

test("shared mode keeps working and binds nothing — that is what DEGRADED means", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "bus-auth-degraded-"));
  const handle = createBusHandler({ store: new FileBusStore(root), token: "shared-secret", now: NOW });

  // No identity, so a forged `from` is accepted. The deployment reports this on
  // /health rather than presenting itself as bound.
  const response = await handle(post("inbox", "shared-secret", envelope("claude-code", "sol-gpt")));
  assert.equal(response?.status, 201, await response!.text());
});
