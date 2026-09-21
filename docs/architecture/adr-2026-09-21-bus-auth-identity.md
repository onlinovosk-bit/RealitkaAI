# ADR 2026-09-21 — BUS-AUTH-IDENTITY: caller identity in the transport

**Status:** SPECIFICATION — no code. Implementation requires a separate Founder GO.
**Follows:** #601 (`9d933ea`), which closed the ack source-box path and explicitly
left the authority boundary open.

---

## 1. Measured problem, not assumed

Read from the code at `9d933ea`, not from design intent:

| Fact | Where |
|---|---|
| One shared secret for every caller | `http.ts` `BusHttpOptions.token` — a single string |
| Authorisation is "does the bearer match" and nothing else | `http.ts:51` `authorize()` |
| `writableBoxes` is global, not per caller | `http.ts:26` `DEFAULT_WRITABLE` |
| **`envelope.from` is never checked against anything** | no reference to `envelope.from` in `http.ts` |
| The execution agent uses the same HTTP surface and the same token | `scripts/bus/consume.ts` → `BusHttpClient` |

So the server cannot distinguish the strategic agent from the execution agent, and
the `from` field — the only thing that says who wrote a message — is self-declared.

### 1.1 Three concrete consequences

1. **Forged provenance.** Any credential holder can post a message carrying
   `from: claude-code`. Nothing rejects it. `outbox` therefore proves nothing about
   who produced a message, which is precisely what #601 declined to claim.

2. **Suppressed execution — not theoretical.** `consume.ts:274` builds its duplicate
   guard from `list("outbox", { from: CONSUMER_AGENT })`. A message forged with
   `from: claude-code` makes the consumer believe a task has already been answered,
   and the real task is never executed. A write becomes a denial of execution.

3. **`ack(inbox → outbox)` remains open.** #601 gated the ack *source* box. The
   target is still free, and it cannot be gated globally without breaking the
   consumer, which legitimately acks into `outbox`. Only identity separates the two.

---

## 2. Design

### 2.1 Credentials carry identity

```
Authorization: Bearer <secret>
        ↓
credential registry
        ↓
AgentIdentity { agent: "sol-gpt" | "claude-code", capabilities }
        ↓
per-request authorisation
```

A credential is a record, not a string:

```ts
interface BusCredential {
  /** Stable label for logs and revocation. Never the secret. */
  id: string;
  /** The bearer secret. Compared in constant time, as today. */
  secret: string;
  /** The agent this credential speaks as. Binding, not a hint. */
  agent: BusAgent;
}
```

`BusHttpOptions.token: string` becomes `credentials: BusCredential[]`.

### 2.2 Capability per identity

| | `sol-gpt` | `claude-code` |
|---|---|---|
| POST to `inbox`, `tasks`, `context`, `decisions` | ✅ | ✅ |
| POST to `outbox` | ❌ | ✅ |
| ack source box | its writable set | `inbox` + its writable set |
| ack target box | its writable set + `archive` | + `outbox` |
| `state`, plain `archive` writes | ❌ | ❌ |

`outbox` becomes what #601 could only describe: a box only the execution identity
can write.

### 2.3 The rule that makes provenance real

> **Every write must satisfy `envelope.from === identity.agent`. A mismatch is 403.**

Without this, per-box capability is still bypassable: a caller allowed to write to
`inbox` could put `from: claude-code` on the message and poison the consumer's
duplicate guard (§1.1.2). With it, the `from` field stops being a claim and becomes
an attestation of the credential that carried it.

This is the core of the ADR. Per-box rules without `from` binding would be theatre.

### 2.4 Degraded mode must be visible, never silent

The bus is deployed and in use. A hard cutover breaks a running tunnel, so a single
`REVOLIS_BUS_TOKEN` keeps working — but it is a **named, reported state**, not a
quiet fallback:

- startup logs `AUTH MODE: DEGRADED — single shared credential, no caller identity`
- `GET /health` reports `auth_mode: "shared" | "per-agent"`
- in `shared` mode the `from` binding cannot be enforced, so the server reports
  `from_binding: false` and `outbox_provenance: "unverified"`

A deployment can therefore be *asked* whether the boundary is real, instead of
being assumed to have it. Silence is not permission (`GOVERNANCE.md` C3).

---

## 3. Tests — the acceptance criteria

Founder-specified:

| # | Case | Expected |
|---|---|---|
| 1 | `sol-gpt` → `outbox` | DENY |
| 2 | `sol-gpt` → `inbox`/`tasks`/`context`/`decisions` | ALLOW |
| 3 | `claude-code` → `outbox` | ALLOW |
| 4 | `claude-code` → a forbidden box (`state`) | DENY |
| 5 | `sol-gpt` cannot impersonate `claude-code` | DENY |
| 6 | revoked credential | DENY |

Added, because each closes a path the six above leave open:

| # | Case | Expected |
|---|---|---|
| 7 | `sol-gpt` posts to `inbox` with `from: claude-code` | DENY — §2.3 |
| 8 | `sol-gpt` acks an `inbox` message with `to_box: outbox` | DENY — the #601 gap |
| 9 | `claude-code` acks `inbox → outbox` | ALLOW — the legitimate path |
| 10 | unknown bearer | 401, unchanged |
| 11 | `shared` mode reports `auth_mode` and `from_binding: false` | health says so |
| 12 | two credentials, same secret, different agents | refuse to start — ambiguous identity |
| 13 | a refused write leaves no trace | footprint unchanged, as in `authority-boundary.test.ts` |

Case 12 matters: a misconfiguration that makes identity ambiguous must fail closed at
startup, not resolve to whichever record was read first.

---

## 4. Migration

1. `BusCredential[]` added; `token: string` accepted and wrapped as one credential in
   `shared` mode.
2. `serve.ts` reads `REVOLIS_BUS_TOKEN_SOL` and `REVOLIS_BUS_TOKEN_CLAUDE`; if both
   absent it falls back to `REVOLIS_BUS_TOKEN` and reports DEGRADED.
3. `BusHttpClient` gains no new required argument — it already sends one bearer.
   `consume.ts` uses the `claude-code` secret; the Custom GPT Action uses `sol-gpt`.
4. Rotate the existing shared secret out once both are in place. The shared secret is
   currently known to both sides and must not survive as either agent's credential.

Step 4 is not optional: keeping today's token as one of the two would leave the other
side holding a credential it should no longer have.

---

## 5. What this does NOT fix

Declared here so no later report can imply otherwise:

- A **stolen** `claude-code` secret still speaks as `claude-code`. Identity binds a
  credential to an agent; it does not prove who holds the credential. Closing that
  needs per-message signing or mTLS — a separate decision.
- Messages already in the repository were written under the shared credential. Their
  `from` is **unverified** and stays that way; history is not rewritten.
- `LIVE_TRADING` is untouched. This ADR changes who may write which box, nothing else.
- The **git write authority** of a future always-on runner is a different layer and is
  not covered here. `adr-2026-09-21-bus-runner-v2.md` carries it as an open question
  (§10.3) and as a risk (§11): a fine-grained PAT cannot be scoped to one branch, so
  `contents: write` reaches the whole repository. Binding an HTTP caller to an agent
  does not constrain what the runner's PAT can push. Both layers need identity; this
  ADR closes only the transport one.

## 6. Definition of Done

- `credentials: BusCredential[]` replaces `token: string`; 13 tests above pass.
- `GET /health` reports `auth_mode` and `from_binding`.
- `shared` mode still starts, reports DEGRADED, and is covered by a test.
- Existing bus suite stays green (108 at `9d933ea`).
- `docs/ops/bus-handshake-runbook.md` updated for two secrets.
- No change to `LIVE_TRADING`, the safety envelope, or any capability status.

## 7. Open question for the Founder

Should `shared` mode be permitted **indefinitely**, or expire?

A deployment that reports DEGRADED forever is honest but comfortable. The alternative —
`shared` mode refuses to start after a Founder-set date — applies P7's reasoning
(a capability that does not expire is not a capability, it is a default) to the
transport. **Not decided here.**
