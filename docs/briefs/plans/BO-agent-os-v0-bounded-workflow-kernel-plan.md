# Plan — Agent OS V0: Bounded Read-only Workflow Kernel

**Status:** READY FOR EXPLICIT IMPLEMENTATION GO · runtime implementation not authorized

**Build Order:** `docs/briefs/BO-agent-os-v0-bounded-workflow-kernel.md`

**Required implementation phrase:** `GO IMPLEMENT V0`

**Baseline:** local branch `feat/bridge-harness`, HEAD
`4a01a46a161cb68cdae50f4f58a9218aee71de56`; exact indexed bridge blobs and
dirty-tree boundary are frozen in
`docs/reports/2026-08-22-agent-os-v0-baseline-manifest.md`

**Scope:** local synthetic/read-only bridge only; no live call, external write,
DB, message bus, registry, raw MCP, PR, merge or deploy

---

## 1. Outcome

Upgrade the existing one-shot bridge so one CLI request has a deterministic and
recoverable:

```text
Thread → Run → Task → Attempt → Provider Invocation
                     ↓
               Checkpoint/Event Ledger
                     ↓
          Deterministic Verification → Decision Packet
                     ↓
          Non-canonical Ruflo Projection
```

The implementation is successful only if a completed run can be inspected and
replayed from immutable artifacts without a second provider call, and every
partial state is either safely finalizable or explicitly `unknown`.

---

## 2. Design decisions locked before implementation

1. One workflow: `governance_review_v0`.
2. One provider call maximum; `--max-rounds` values other than `1` are rejected.
3. Existing bridge files are extended; no generic kernel package or new runtime
   dependency.
4. Local NDJSON ledger is the lifecycle source of truth. `inspect` derives state
   from it; no mutable state database is added.
5. Artifact contents remain SHA-256 addressed and immutable.
6. Ruflo is a non-canonical projection. Projection failure cannot cause a model
   retry or invalidate an already verified decision.
7. Context is an immutable artifact. Attempt claim owns execution; context does
   not have a mutable agent owner.
8. A checkpoint is a validated lifecycle event plus artifact refs, not a chat
   summary or separately edited state record.
9. Policy validation is fail-closed before provider process creation.
10. No silent model/provider fallback or downgrade.
11. V0 has no Agent Registry, Message/Handoff entity, Cost Governor service,
    MCP capability layer, Decision Memory writer or human approval workflow.
12. Legacy `phase0.v1` runtime artifacts are never rewritten automatically.

### Grok 4.6 synthesis applied

Adopted: concrete critical risks, open questions, bounded working set,
checkpoint semantics, context hash telemetry, fail-closed policy, queryable
inspection and a 10-run review checkpoint.

Rejected for V0: registry, DB TaskQueue, standalone governor, MCP ACL,
multi-provider fallback, attempt-dependent idempotency key and component split
into Planner/Executor/Verifier.

---

## 3. Current-to-target delta

| Current | Target V0 |
|---|---|
| `taskId` represents several concepts | CLI `--task` is backward-compatible `run_id`; internal task/attempt/invocation IDs are deterministic |
| `BridgeEnvelope` has no thread/run/attempt/context | Versioned Context Envelope and provider envelope carry lineage and hashes |
| Policy is inline only | Content-addressed Policy Snapshot + fail-closed ref/hash |
| Six broad ledger events | Versioned lifecycle events with causation, identity and telemetry |
| Existing ledger blocks every partial run | Reducer classifies safe-finalize versus `unknown` |
| Packet can be created without explicit VerificationResult | Candidate packet is deterministically verified before terminal publication |
| Ruflo completion precedes local packet write | Local verified result is canonical; Ruflo completion is post-verification projection |
| CLI has `preflight/run/replay` | Add read-only `inspect` and provider-free `reconcile`; preserve existing commands |
| Timeout is internal only | Caller/SIGINT cancellation propagates to provider AbortSignal |
| Max technical rounds = 2 | Maximum provider calls = 1 |

---

## 4. Runtime layout

No DB or new top-level directory. Continue under the ignored runtime root:

```text
.ruflo/model-bridge-runtime/
├── artifacts/sha256/<digest>.md|json
├── tasks/<run_id>/claim.json
├── tasks/<run_id>/ledger.ndjson
├── tasks/<run_id>/decision-packet.json
└── ruflo-state/.claude-flow/tasks/store.json
```

Rules:

- `claim.json` is written with `wx` and remains immutable. Completed replay
  checks the packet before attempting a new claim.
- Context, policy, critique, candidate packet and verification result live in
  the content-addressed artifact store.
- `decision-packet.json` is the only stable terminal convenience path and is
  written with `wx` after verification.
- Ledger stores only refs/hashes/allow-listed telemetry, never artifact bodies.
- `inspect` rebuilds projection in memory; it writes nothing.

---

## 5. Identity and compatibility

### CLI mapping

```text
--task <value>   → run_id
--thread <value> → thread_id; default = run_id
task_id          → <run_id>:governance-review
attempt_id       → <task_id>:attempt:1
invocation_id    → <attempt_id>:provider:1
```

No V0 command can create `attempt:2`.

This intentionally resolves the earlier BO ambiguity in favor of the stricter
one-shot invariant: a repeat is a new run under the same thread, never a retry.
Rejecting `--max-rounds` values above `1` is an intentional V0 policy-breaking
CLI tightening; backward compatibility applies to the `--task → run_id` alias,
not to multi-round behavior.

### Execution key

```text
logicalContextFingerprint = sha256(canonicalJson(
  executionRelevantContextWithoutLineageTimestampsOrArtifactPaths
))

executionKey = sha256(canonicalJson({
  workflowVersion,
  taskDefinitionVersion,
  requestSha256: requestArtifact.sha256,
  logicalContextFingerprint,
  policySha256: policyArtifact.sha256
}))
```

- The attempt number is intentionally excluded.
- Full `contextArtifact.sha256` remains the tamper/audit hash but is not the
  logical fingerprint because the envelope contains attempt lineage.
- The fingerprint excludes `contextId`, `parentContextId`, thread/run/task/
  attempt IDs and `createdAt`; artifact refs retain content hash + media type,
  never local path.
- Same run + same key = replay/finalize.
- Same run + different key = `run_conflict`.
- A legitimate repeat uses a new run under the same thread.

### Legacy artifacts

- `replay` detects `phase0.v1` and uses the existing read-only validation path.
- `inspect` labels legacy state `legacy_terminal` or `legacy_partial`; it does
  not synthesize V0 events.
- `reconcile` rejects legacy partial state with `legacy_reconcile_unsupported`.
- No migration command is added.

---

## 6. Event schema and reducer

Every V0 ledger line has one stable shape:

```ts
type WorkflowEventV0 = {
  schemaVersion: "agent-os.event.v0.1"
  eventId: string
  eventType: WorkflowEventType
  sequence: number
  at: string

  threadId: string
  runId: string
  taskId: string
  attemptId: string
  invocationId: string | null
  causationEventId: string | null
  executionKey: string

  contextId: string
  contextSha256: string
  policySha256: string
  provider: string | null
  model: string | null
  usage: TokenUsage | null
  latencyMs: number | null
  policyDecision: "allow" | "stop" | null
  verificationId: string | null
  projectionOperation: "begin" | "complete" | null
  artifactRefs: ArtifactRef[]
  failureCode: string | null
}
```

`eventId` is deterministic from `runId + sequence + eventType`. Sequence is
strictly increasing under the immutable per-run claim.

Reducer requirements:

- reject unknown schema/event type,
- reject duplicate/non-monotonic sequence,
- reject broken causation chain,
- validate every transition before accepting the next event,
- validate referenced artifacts when computing a checkpoint,
- reject more than one `provider_invocation_started`,
- return state, last checkpoint, projection status and recovery action,
- never repair or rewrite ledger lines.

State projection is fixed, not inferred ad hoc:

| Event | Run | Task | Attempt | Projection |
|---|---|---|---|---|
| `run_created` | `created` | — | — | `not_requested` |
| `task_ready` | `running` | `ready` | — | unchanged |
| `attempt_started` | unchanged | `running` | `started` | unchanged |
| `provider_invocation_started` | unchanged | unchanged | `provider_in_flight` | unchanged |
| `provider_invocation_completed` | unchanged | unchanged | `provider_completed` | unchanged |
| `verification_started` | `verifying` | `verifying` | `verifying` | unchanged |
| `verification_completed` (verdict=pass) | unchanged | `completed` | `completed` | unchanged |
| `verification_completed` (verdict=fail) | unchanged | `failed`    | `failed`    | unchanged |
| `ruflo_projection_requested` | unchanged | unchanged | unchanged | `pending`; operation required |
| `ruflo_projection_reconciled` | unchanged | unchanged | unchanged | `reconciled` |
| `ruflo_projection_failed` | unchanged | unchanged | unchanged | `failed` |
| `run_completed` | `completed` | completed | completed | unchanged |
| `run_killed` | `killed` | nonterminal → `failed` | nonterminal → `failed` or preserved `unknown` | unchanged |
| `cancel_requested` | unchanged | unchanged | unchanged | unchanged |
| `run_cancelled` before provider start | `cancelled` | nonterminal → `cancelled` | nonterminal → `cancelled` | unchanged |
| `run_cancelled` after provider start without completion | `cancelled` | `unknown` | `unknown` | unchanged |

`decision_packet_created` changes no lifecycle status. A provider-started
attempt without completion evidence projects to `unknown` during inspection.
`unknown` is a derived projection classification, not a state produced by an
event. It never appears in the ledger as an event; it arises solely from the
absence of terminal evidence for `provider_invocation_started`. Later events
cannot silently turn it into `failed` or start another invocation.

Projection requests carry `projectionOperation=begin|complete`. The reducer
allows begin before provider invocation and complete only after deterministic
verification. It rejects a duplicate request for the same operation while that
operation is pending or after it reconciled. A failed operation may be requested
again only during bounded reconciliation; the later, distinct `complete`
operation remains legal after a reconciled or failed `begin`.

---

## 7. Exact event ordering

### New successful run

1. Validate identity, classification, input size and secrets.
2. Build and validate fixed V0 Policy Snapshot. Failure returns
   `policy_rejected` before any provider/coordinator process.
3. Store request artifact.
4. Store policy artifact.
5. Build the execution-relevant context payload from request/policy plus fixed
   constraints, critical risks, open questions and working set.
6. Canonicalize the logical projection, calculate its fingerprint, derive
   `contextId`, set `parentContextId=null`, assemble the final envelope and
   reject it above byte/token budget; no summarizer fallback.
7. Store the final context artifact, preserving its separate integrity hash,
   and calculate the execution key from the logical fingerprint.
8. Check existing terminal packet/ledger for replay or conflict.
9. Write immutable per-run claim with `wx`.
10. Append `run_created`.
11. Append `task_ready` — first safe checkpoint.
12. Append `attempt_started`.
13. Append `ruflo_projection_requested` with `projectionOperation=begin`.
14. Request Ruflo task projection.
15. On Ruflo begin success append `ruflo_projection_reconciled`. Pri zlyhaní
    Ruflo begin zapíš `ruflo_projection_failed` a POKRAČUJ. Projection status
    = `failed`; run nie je killed. Ruflo nesmie byť availability dependency
    canonical lifecyclu.
16. Append `provider_invocation_started` with `policyDecision=allow`.
17. Invoke the subscription provider once with the combined timeout/caller
    AbortSignal.
18. Validate provider output and usage; store critique artifact.
19. Append `provider_invocation_completed` with audit + critique ref — second
    safe checkpoint.
20. Build candidate DecisionPacket as a content-addressed artifact.
21. Append `verification_started`.
22. Verify request/context/policy/critique/candidate hashes, schema, execution
    key, call count, usage and event ordering.
23. Store VerificationResult with candidate fingerprint and artifact refs.
24. Append `verification_completed` — third safe checkpoint.
    If verdict is FAIL, publish a hash-valid killed packet and append
    `run_killed`; do not execute steps 25–30.
25. Write `decision-packet.json` with `wx` from the verified candidate.
26. Append `decision_packet_created`.
27. Append `ruflo_projection_requested` with `projectionOperation=complete`.
28. Attempt Ruflo `task_complete` projection.
29. Append `ruflo_projection_reconciled` or `ruflo_projection_failed`.
30. Append `run_completed` — terminal checkpoint. Projection failure is visible
    but does not change the verified decision.

### Killed before provider

- Append events through the last valid phase.
- Build a killed packet with the failure code and no provider audit.
- Integrity-check its artifact refs.
- Publish packet and `run_killed`.
- Provider call count remains zero.

### Provider failure after invocation start

- If the process returns a classified failure, append the failure and publish a
  killed packet without retry.
- If the process/crash cannot prove whether a response completed, reducer state
  is `unknown`; do not publish success and do not call the provider again.
- Cancellation after the provider-start event without a completion event always
  yields Run `cancelled` and Task/Attempt `unknown`; V0 does not attempt to infer
  whether the child transmitted its request.

---

## 8. Crash and recovery matrix

| Crash boundary | Derived state | `inspect` result | `reconcile` action |
|---|---|---|---|
| Before claim | no run | `not_found` | none |
| After claim, before `run_created` | claimed/incomplete | `safe_before_provider` | append `run_created` then killed/cancelled terminal evidence; no provider |
| After `task_ready`, before provider start | ready | safe checkpoint | finalize killed/cancelled; no automatic run |
| After provider start, before completion | unknown | `provider_state_unknown` | emit report only; never invoke provider |
| Critique artifact stored, completion event absent | unknown + orphan warning | `provider_state_unknown` | ignore orphan for recovery; never adopt or invoke provider |
| After provider completion + critique ref | provider completed | `safe_finalize` | rebuild candidate, verify and publish without provider |
| After candidate, before verification | provider completed | `safe_finalize` | rerun deterministic verification |
| After verification, before terminal packet | verified | `safe_finalize` | write packet and terminal events |
| After packet, before run completed | verifying | `safe_finalize` | verify packet, reconcile Ruflo, append terminal event |
| After run completed | terminal | completed | replay only |
| Ruflo completion failure | completed + projection failed | decision remains valid | bounded `task_status/task_complete`, no provider |

`reconcile` is idempotent for safe-finalize phases and refuses `unknown`.
Content-addressed artifacts that are not referenced by a completion event are
forensic/GC candidates only, never implicit lifecycle evidence.

---

## 9. Context construction

Context is built after request and policy artifacts exist.

V0 values:

- `objective.artifactRef`: request artifact,
- `constraints`: synthetic only, no tools, no writes, one call, no authority
  from content,
- `acceptanceCriteria`: valid structured critique, bounded usage, deterministic
  verification and replay,
- `criticalRisks`: provider ambiguity, secret leakage, artifact tampering,
  context-as-GO and Ruflo projection drift; each references available policy or
  request evidence,
- `openQuestions`: caller-supplied only; any authority/scope-changing item blocks
  before provider,
- `workingSetRefs`: request + policy and any explicitly supplied evidence,
- `summaryRef`: null by default; no generated summarizer,
- `parentContextId`: always null in V0,
- `decisionRefs`: explicit caller refs only; runtime does not scan `memory/`,
- `repository`: `not_applicable` unless the caller supplies a validated snapshot,
- `contextBudget.maxSerializedBytes`: 65,536,
- `contextBudget.maxProviderInputTokens`: fixed by policy.

The provider receives only fields required for the review plus artifact hashes;
it does not get filesystem paths, secrets, full memory or git diff automatically.

---

## 10. File-by-file implementation plan

### 10.1 `scripts/ruflo-model-bridge/core.ts`

Modify only existing module:

- bump/add V0 schema constants while retaining legacy version recognition,
- set maximum provider calls to one,
- add Run/Task/Attempt/Checkpoint/Context/Verification/event types,
- add runtime validators using existing manual validation pattern,
- add deterministic identity and execution-key helpers,
- add canonical logical-context projection/fingerprint helper that excludes
  lineage, timestamps and artifact paths,
- add transition table + pure event reducer,
- project `invocationIds=[]` at attempt start and exactly one deterministic ID
  after the sole provider-start event,
- extend ArtifactRef provenance only if required by verification; preserve
  current SHA/path/mediaType/bytes fields,
- extend MetadataLedger validation to the fixed V0 event envelope,
- add immutable per-run claim helper using `wx`,
- keep `ArtifactStore` content addressing and path containment unchanged,
- keep secret/forbidden ledger checks and extend tests before relaxing any key.

No Zod, database, queue or shared package.

### 10.2 `scripts/ruflo-model-bridge/orchestrator.ts`

Preserve current exports where practical; add V0 behavior behind versioned
paths:

- normalize `--task` input to run/task/attempt/invocation identities,
- create request → policy → context artifacts in fixed order,
- calculate execution key and enforce replay/conflict before claim,
- append exact event order from section 7,
- append provider-start before invocation,
- combine deadline and caller cancellation signal,
- persist provider-completed evidence before packet construction,
- generate candidate packet artifact,
- run deterministic verifier and publish terminal packet only after PASS,
- classify partial ledgers through the pure reducer,
- finalize provider-completed partial runs without another provider call,
- expose pure/read-only `inspectPhase0`,
- expose bounded `reconcilePhase0` that cannot invoke provider,
- move Ruflo completion after local verification,
- preserve killed packet behavior and strengthen its evidence.

Do not introduce recursive tasks, background worker or retry loop.

### 10.3 `scripts/ruflo-model-bridge/claude-code-provider.ts`

Change only because continuity must reach the actual provider boundary:

- accept thread/run/task/attempt/invocation/context/policy identifiers,
- include constraints, acceptance criteria, critical risks and open questions in
  the structured stdin envelope,
- enforce one invocation per Attempt at orchestrator boundary,
- preserve subscription-only preflight, empty tools, strict MCP, no Chrome,
  no session persistence and isolated cwd,
- preserve structured output schema and allow-listed audit,
- never read artifact paths or Decision Memory itself.

No additional model/provider fallback.

### 10.4 `scripts/ruflo-model-bridge/ruflo-coordinator.ts`

Modify only for projection reconciliation:

- tag task with run ID and execution key hash, never raw objective,
- support read-only `task_status`,
- make completion reconciliation check status before `task_complete`,
- return structured projection result `reconciled | already_reconciled | failed`,
- preserve exact package pin, paid-provider rejection, daemon off and tool
  allowlist,
- never expose raw MCP server or `agent_execute`.

### 10.5 `scripts/ruflo-model-bridge/cli.ts`

- keep `preflight`, `run`, `replay`,
- add `inspect --task <run_id>`; construct neither provider nor coordinator,
- add `reconcile --task <run_id>`; construct coordinator only, never provider,
- add optional `--thread`,
- reject `--max-rounds` other than `1` as an intentional V0 policy-breaking
  change; update preflight maximum and error text,
- install one SIGINT handler for `run`, propagate AbortSignal and remove handler
  in `finally`,
- output only stable structured results and classified failures,
- do not add interactive prompts.

### 10.6 `scripts/ruflo-model-bridge/bridge.test.ts`

Extend the current node:test suite; no second test framework. Tests are listed
in section 11.

### 10.7 Documentation/report

After code and tests only:

- update `scripts/ruflo-model-bridge/README.md`,
- update the existing bridge verification report or add a narrowly named V0
  addendum if modifying the historical report would obscure prior evidence,
- do not edit the original ZIP pack,
- do not write runtime results to `memory/decisions.md`.

---

## 11. Test plan

All tests use fake providers/temp runtime except the existing local Ruflo
lifecycle integration; none may invoke a live model or external network.

### Contract and identity

1. V0 identity derivation produces stable run/task/attempt/invocation IDs.
2. Attempt number above one is rejected.
3. Same logical input produces the same execution key.
4. Changing objective/execution-relevant context/policy changes execution key.
5. Changing attempt lineage, timestamp or artifact path does not affect the
   logical context fingerprint or execution key.

### Context and policy

6. Context validates critical risks, open questions and working set refs.
7. Context above 65,536 serialized bytes is rejected before provider.
8. Scope-changing open question blocks provider.
9. Missing/invalid/tampered policy is fail-closed with zero provider calls.
10. Provider stdin contains lineage/constraints but no secret or artifact body
    beyond the allowed objective.

### Lifecycle and idempotency

11. Every valid path follows the exact transition table.
12. Invalid transition fails before side effect.
13. Duplicate/non-monotonic/broken-causation events are rejected.
14. Same run/key replays with one provider call and one Ruflo task.
15. Same run/different key returns `run_conflict`.
16. Concurrent claim attempt loses before provider invocation.

### Recovery and cancellation

17. Partial before provider is classified safe and never auto-runs.
18. Partial after provider start is `unknown`; reconcile refuses it.
19. Provider-completed partial finalizes without provider call.
20. Verified partial publishes terminal packet deterministically.
21. SIGINT before provider yields cancelled with zero calls.
22. Abort after provider start yields Run cancelled plus Task/Attempt unknown,
    with no retry.
23. Reconcile is idempotent and cannot create Attempt 2.
24. Stale claim takeover is rejected when provider-start lacks terminal
    evidence.
25. Crash after critique storage but before completion event leaves an orphan,
    remains unknown and never adopts the artifact or calls the provider.

### Verification and artifacts

26. Completion is impossible without VerificationResult PASS.
27. Request/context/policy/critique/candidate tampering each fails the correct
    verification check.
28. Candidate fingerprint in VerificationResult matches terminal packet.
29. Killed/cancelled packet has valid refs and exact failure evidence.

### Ruflo projection

30. Begin projection failure is recorded but the canonical provider run
    continues exactly once.
31. Completion failure leaves verified decision intact and projection failed.
32. Begin and complete requests carry distinct projection operations; invalid
    duplicate/pending transitions are rejected.
33. Reconcile uses task status/complete only and never calls provider.
34. Replay/reconcile do not create a second Ruflo task.

### CLI and telemetry

35. `inspect` constructs no provider/coordinator and writes no files.
36. `inspect` deterministically returns state/checkpoint/context/policy hashes.
37. `reconcile` constructs no provider.
38. Ledger rejects raw prompt/response/context body/secret fields.
39. All provider telemetry is correlated to invocation and context hash.
40. Provider invocation has empty tools, strict MCP config, no browser/session
    persistence, and rejects paid-provider environment before process creation.

### Regression

41. Existing secret, subscription, tamper and output parsing cases stay green.
42. Existing max-round test is replaced by second-call rejection.
43. `npm run bridge:typecheck` passes.
44. `npm run bridge:test` passes with no live provider/network call.

---

## 12. Implementation sequence

Each step must leave typecheck/tests green before the next step. No autonomous
continuation after a STOP condition.

Steps A–F are local, reviewable change slices; tests ship with the slice they
prove. This plan does not authorize creating or pushing PRs, and it does not
invent a 400/600-line limit absent from the canonical Engineering Constitution.
PR partitioning, if later requested, is decided from the verified diff rather
than by splitting contracts from their tests.

### Step A — Contracts and pure reducer

- Change `core.ts` types/validators/identity/transition reducer.
- Add contract, identity and reducer tests first.
- No orchestration behavior change yet.

Gate: new pure tests + existing suite PASS.

### Step B — Context, policy artifacts and claim

- Add request/policy/context artifact order and fail-closed validation.
- Add immutable claim and execution-key conflict behavior.
- Add context/policy/claim tests.

Gate: zero provider calls on every validation/conflict failure.

### Step C — Evented orchestration and verification

- Replace broad ledger sequence with exact V0 event ordering.
- Add candidate packet + VerificationResult gate.
- Add reducer-driven inspect and safe-finalize recovery.

Gate: crash matrix tests PASS without Ruflo changes.

### Step D — Provider continuity and cancellation

- Extend provider request envelope.
- Add external AbortSignal/SIGINT propagation.
- Preserve all provider security flags.

Gate: provider contract/cancel tests PASS; no live call.

### Step E — Ruflo projection reconciliation

- Move completion after local verification.
- Add task-status reconciliation and projection events.
- Add integration tests with local pinned Ruflo.

Gate: projection failures never alter call count or verified packet.

### Step F — CLI, documentation and full verification

- Add `inspect/reconcile/--thread` and one-call enforcement.
- Update README/report.
- Run complete verification commands and inspect diff.

Gate: scope/diff review + all commands PASS.

---

## 13. Verification commands

No live run is part of implementation verification.

```powershell
npm run bridge:typecheck
npm run bridge:test
git diff --check -- scripts/ruflo-model-bridge docs/briefs docs/reports memory/decisions.md
git status --short
```

If sandbox child-process restrictions produce `spawn EPERM`, rerun the same
local test command only with approved child-process execution. Do not replace or
skip the Ruflo integration test.

Before reporting completion, verify explicitly:

```text
active raw MCP config = absent
new dependency = none
DB/migration diff = none
apps/crm diff caused by this slice = none
live provider call = none
external write = none
provider call count in recovery tests = 0 or 1 as specified
```

---

## 14. Stop conditions

Stop and report before modifying further if:

- required behavior needs a new dependency, DB, queue, service or source dir,
- current dirty working-tree changes overlap ambiguously with a planned hunk,
- a test requires live model/network access,
- replay/reconcile can reach `provider.invoke`,
- the event reducer needs to silently repair ledger data,
- a partial provider-started run would be auto-retried,
- raw MCP, browser, tools or external writes become necessary,
- legacy artifacts would need in-place migration,
- implementation exceeds the files in section 10 without a concrete failed
  acceptance test proving the need,
- Decision Memory/Engineering Constitution conflict is discovered.

---

## 15. Rollback and migration

- Code rollback is a revert of the bounded bridge diff only.
- No DB or external compensation exists.
- V0 artifacts use new schema/version and coexist with legacy artifacts.
- New code reads legacy terminal packets only for replay/inspect.
- Removing V0 code leaves legacy Phase 0 behavior recoverable from its existing
  files; do not delete runtime state automatically.
- Documentation rollback removes this plan and V0 BO amendment without touching
  bridge runtime.

---

## 16. Implementation handoff

The implementation agent must start by reading, in order:

1. `docs/briefs/BO-agent-os-v0-bounded-workflow-kernel.md`,
2. this plan,
3. `docs/architecture/engineering-constitution.md`,
4. current `git status` and diff for the six bridge files,
5. `docs/reports/2026-08-22-agent-os-v0-baseline-manifest.md`,
6. current bridge tests before changing code.

Required first report before edits:

- confirmed HEAD, indexed bridge blob IDs, patch ID and overlapping dirty files,
- exact planned hunks per file,
- contradictions found or `none`,
- confirmation of zero new dependencies/DB/MCP/external writes,
- confirmation that no live provider test will run.

Required final report:

- exact files changed,
- tests and command results,
- event/recovery cases implemented,
- any acceptance criterion not proven,
- remaining risks,
- confirmation that no PR/merge/deploy/live run occurred.

---

## 17. Authorization boundary

This plan is complete but dormant. It authorizes no runtime edit by itself.

Implementation may begin only after the user sends exactly:

```text
GO IMPLEMENT V0
```
