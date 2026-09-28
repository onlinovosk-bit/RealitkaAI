# Build Order — Agent OS V0: Bounded Read-only Workflow Kernel

**Status:** GO · specification/build-order only

**Kategória:** Core Platform / Founder Workflow Capability

**Founder GO:** 2026-08-22 — prepísať pôvodný Agent OS pack na jeden V0 Build Order

**Implementačný GO:** NEUDELENÝ; tento dokument neoprávňuje runtime code change, live model call, PR, merge ani deploy

**Cieľ:** Zmeniť existujúci syntetický Ruflo model bridge na prvý reprodukovateľný bounded workflow s explicitným `Run → Task → Attempt`, immutable contextom, bezpečným recovery a verifikáciou, bez busu, registry service, UI, DB a external writes.

---

## 0. Autorita a hranica dokumentu

Tento Build Order je jediný povolený návrhový vstup pre Agent OS V0.

Pôvodný `revolis-cursor-agent-os-pack.zip` zostáva auditným vstupom, nie
implementačnou špecifikáciou. Jeho poradie `Shared Message Bus → Agent Registry
→ Cost Governor → MCP → Control Plane → Orchestrator` sa pre V0 nepoužíva.

Tento BO:

- zužuje Agent OS na jeden existujúci read-only workflow,
- nepovoľuje implementáciu, kým nevznikne samostatný Plan Mode artefakt a
  Founder nedá explicitné `GO IMPLEMENT V0`,
- nemení produktový CRM runtime,
- neudeľuje agentovi žiadnu novú authority,
- nenahrádza canonical Decision Memory ani Engineering Constitution.

Ak implementačný agent nájde rozpor medzi týmto BO, `memory/decisions.md`,
`docs/architecture/engineering-constitution.md` alebo aktuálnym bridge kódom,
zastaví sa pred zmenou kódu a vráti konkrétny contradiction report.

Presný lokálny bridge vstup je zachytený v
`docs/reports/2026-08-22-agent-os-v0-baseline-manifest.md`. Implementácia musí
pred prvým editom overiť HEAD, index blob IDs, scoped patch ID a nulový unstaged
bridge diff. Externý push lokálnej feature vetvy nie je podmienka ani povolenie.

---

## 1. Gate check

| Otázka | Odpoveď |
|---|---|
| Zaplatí za to dnešný klient? | Nie priamo. Hypotéza je úspora Founder waiting/copy-paste času; preto iba VALIDATE. |
| Timing OK? | Áno iba pre zovšeobecnenie už overeného bridge invariantu; nie pre platformu. |
| Prečo nie iba existujúci bridge? | Bridge dokazuje one-shot transport a replay, ale nemá canonical Run/Task/Attempt, context lineage, stavové prechody ani recovery po provider-completed crashi. |
| Founder trap | Technology/Complexity Bias. Kill: nový deployable, DB, queue, UI, MCP server, registry alebo druhý workflow v rovnakom slice. |
| Verdikt | **VALIDATE — V0 specification only.** |

### Hypotéza

Ak jeden reálny bridge workflow nedokážeme bezpečne opísať, obnoviť a
verifikovať bez message busu, širší Agent OS by iba distribuoval nejasné
kontrakty.

---

## 2. Repo baseline a Integration Report

Auditovaný baseline pri vytvorení BO:

- branch: `feat/bridge-harness`,
- HEAD: `4a01a46a161cb68cdae50f4f58a9218aee71de56`,
- working tree je dirty; implementačný plán musí zachytiť aktuálny diff a nesmie
  predpokladať, že HEAD reprezentuje celý vstup,
- `npm run bridge:typecheck`: PASS 2026-08-22,
- `npm run bridge:test`: PASS 14/14 2026-08-22 po povolení lokálnych child
  procesov; žiadny live provider call.

| Potreba | Existuje? | Reuse / rozhodnutie |
|---|---:|---|
| Bounded provider call | Áno | `scripts/ruflo-model-bridge/orchestrator.ts`; rozšíriť, nevytvárať nový gateway package. |
| Immutable artifact store | Áno | `ArtifactStore` v `core.ts`; zachovať content-addressing a tamper check. |
| Metadata-only audit ledger | Áno | `MetadataLedger` v `core.ts`; rozšíriť event schema. |
| Replay/idempotency | Čiastočne | Rovnaký task+intent replayuje; chýba Run/Task/Attempt a recovery z partial ledgeru. |
| Hard timeout/token/round limits | Áno | Zachovať fail-safe správanie a zákaz automatic retry. |
| Context envelope | Čiastočne | `BridgeEnvelope` nemá run/thread/attempt, constraints, artifact purpose ani policy refs. |
| Verification result | Nie ako entita | Replay validuje hashes, ale terminal completion nie je viazaný na explicitný PASS. |
| Cancellation | Nie | Doplniť bounded process cancellation; bez compensation, lebo external writes sú zakázané. |
| Lifecycle source of truth | Nejasné | Lokálny ledger a Ruflo task sa tvária ako dvaja vlastníci. V0 určí lokálny ledger ako canonical. |
| Ruflo | Áno | Iba non-canonical coordination adapter/projection; raw MCP server a daemon ostávajú vypnuté. |
| Agent Registry | Nie a netreba | Model/provider je explicitná V0 konfigurácia. |
| Shared Message Bus | Nie a netreba | Single-process dispatcher + per-run exclusive claim. |
| Cost Governor | Nie ako service | V0 používa policy snapshot, output-token cap, deadline a max calls. |
| DB / Supabase | Nie a netreba | V0 je local-only; žiadna migrácia. |
| Control Plane UI | Nie a netreba | CLI packet + ledger sú dostatočný read model. |

**Jediná nová capability:** bezpečne obnoviteľný a verifikovaný lifecycle jedného
existujúceho read-only workflowu.

**Žiadna nová všeobecná abstrakcia:** kontrakty zostanú v existujúcich bridge
moduloch. Generic `workflow-kernel`, shared package alebo service môže vzniknúť
až po druhom reálnom workflowe a samostatnom GO.

### 2.1 Syntéza s nezávislým Grok 4.6 auditom

Grok 4.6 audit dodaný 2026-08-22 potvrdil hlavný nález: pôvodný pack nemá ísť
do implementácie s Message Busom a plným Orchestratorom. Jeho verdict bol
YELLOW; repo-evidence audit zostáva RED pre pôvodný pack, pretože v Revolis už
existujú konfliktné memory, cost, approval a MCP surfaces. Po redukcii na tento
V0 BO je praktický smer oboch auditov rovnaký.

| Návrh Grok 4.6 | Rozhodnutie V0 | Dôvod |
|---|---|---|
| `criticalRisks` + evidence v contexte | **PREVZIAŤ** | Zabraňuje strate konkrétneho rizika v generickom `completed_work`. |
| `openQuestions`, working set a context budget | **PREVZIAŤ** | Umožní deterministicky obmedziť relevantný vstup bez raw transcriptu. |
| Explicitný checkpoint/resume | **PREVZIAŤ S ÚPRAVOU** | Checkpoint je posledný validný lifecycle event + artifact refs, nie mutovateľný chat summary. |
| Fail-closed Cost Gate | **PREVZIAŤ S ÚPRAVOU** | V0 nemá cost service; neplatná/chýbajúca policy zastaví call pred providerom. |
| Queryable/correlatable telemetry + `context_hash` | **PREVZIAŤ** | Read-only `inspect` musí vysvetliť aktuálny stav bez model callu. |
| Review po prvých 10–20 runoch | **PREVZIAŤ AKO CHECKPOINT** | Po 10 runs vznikne review; 30-run exit gate zostáva prísnejší. |
| Agent Registry vo V0 | **NEPREVZIAŤ** | Jeden explicitný provider/model nie je registry use case. |
| DB-backed TaskQueue/EventLog vo V0 | **NEPREVZIAŤ** | Local single-process workflow nemá multi-worker alebo durability dôkaz pre DB. |
| Samostatný Cost Governor | **NEPREVZIAŤ** | V0 resource policy sa vynúti inline na jedinom entrypointe. |
| MCP Adapter + capability ACL vo V0 | **NEPREVZIAŤ** | Workflow nemá tools; bezpečnejšie je nemať capability surface vôbec. |
| Multi-provider fallback | **NEPREVZIAŤ** | Silent downgrade by zmenil kvalitu a mohol spustiť platený provider. |
| `attempt` ako súčasť idempotency key | **NEPREVZIAŤ** | Retry by dostal iný dedupe key; attempt patrí do execution identity, nie logical idempotency. |
| Planner/Executor/Verifier ako samostatné komponenty | **NEPREVZIAŤ** | Pri jednom workflowe by išlo o tri nové abstrakcie bez druhého použitia. |

Grokov `ContextEnvelope.ownership` sa nepreberá. Immutable context nemá
mutovateľného vlastníka; execution ownership patrí Attempt claimu/lease.

### 2.2 Uzavretie Fable 5 implementability review

Fable 5 vrátil `REVISE`. Nálezy boli overené proti lokálnemu repu; prijaté
opravy nemenia scope ani implementačnú autoritu.

| Nález | Uzavretie |
|---|---|
| Lokálna/dirty baseline | **PRIJATÉ S ÚPRAVOU:** exact indexed bridge blobs a patch ID sú v `docs/reports/2026-08-22-agent-os-v0-baseline-manifest.md`; externý push nie je potrebný ani autorizovaný. HEAD je lokálne validný commit a lokálny remote-tracking graph ho obsahuje. |
| BO naznačoval explicitný `attempt:2`, Plan ho zakazoval | **PRIJATÉ V PROSPECH UŽŠIEHO V0:** BO ambiguity odstránená; V0 nemá Attempt 2, retry ani druhý provider call. |
| Chýbajúci `created → killed/cancelled` | **PRIJATÉ:** transition doplnený pre recovery pred `running`. |
| Verification FAIL mapovaný na completed | **PRIJATÉ:** PASS/FAIL majú rozdielnu projekciu; FAIL finalizuje killed packet, nie success. |
| `unknown` bez eventu | **PRIJATÉ A VYSVETLENÉ:** je to konzervatívna projekcia z chýbajúceho completion evidence, nie syntetický event. |
| Ruflo begin failure zabíjal run | **PRIJATÉ:** non-canonical projection failure sa zaznamená, canonical workflow pokračuje. |
| Cancellation „podľa dôkazu“ | **PRIJATÉ KONZERVATÍVNE:** po provider-start bez completion je Run cancelled, Task/Attempt unknown. |
| Chýbajúce security/stale-claim/orphan tests | **PRIJATÉ:** test matrix rozšírená a orphan artifact sa nesmie adoptovať. |
| Nejasní producenti a dve Ruflo operácie | **PRIJATÉ:** `parentContextId=null`, `invocationIds` sú ledger projection a event nesie `projection_operation`. |
| Povinných 400/600 riadkov a každý krok = PR | **NEPREVZIAŤ:** uvedený limit nie je v canonical `docs/architecture/engineering-constitution.md`; Plan neudeľuje PR authority. Kroky ostávajú reviewable local slices s testami. |
| Duplicita Plan artefaktu | **TRANSPORT DUPLICITA:** v repe existuje jedna canonical cesta. |

---

## 3. V0 workflow a ownership

### Jediný workflow

`governance_review_v0`

```text
CLI request
→ canonical run/context creation
→ one governance-review task
→ one bounded provider attempt
→ immutable critique artifact
→ deterministic verification
→ immutable decision packet
→ optional Ruflo projection reconciliation
```

Maximálne jedno modelové volanie. Súčasná možnosť nastaviť vyšší `maxRounds`
sa vo V0 odstráni alebo odmietne validáciou. Workflow nesmie vytvoriť druhý
task, druhý provider call ani automatic retry.

### Source of truth

| Dáta | Canonical owner | Poznámka |
|---|---|---|
| Run/Task/Attempt lifecycle | lokálny append-only bridge ledger | Projekcia sa z ledgeru musí dať obnoviť. |
| Context a model output | content-addressed artifact store | Immutable SHA-256. |
| Terminal result | verified decision packet | Nevznikne bez VerificationResult PASS alebo explicitného killed packetu. |
| Ruflo task | non-canonical adapter projection | Jeho failure nesmie vyvolať druhý provider call. |
| Organizational decision | existujúce `memory/decisions.md` | Runtime tam nikdy automaticky nezapisuje. |

Ruflo už nevlastní business/lifecycle pravdu. Drží iba odvodený task status a
audit metadata. Reconciliation môže bezpečne zopakovať `task_complete`, nie
provider invocation.

---

## 4. Canonical identity semantics

| ID | Význam | Stabilita |
|---|---|---|
| `thread_id` | dlhšie trvajúci používateľský cieľ naprieč runs | Caller ho odovzdá; default pre one-shot je `run_id`. |
| `run_id` | jeden prijatý request a jeho terminal výsledok | Externý CLI `--task` zostane vo V0 backward-compatible alias. |
| `task_id` | workflow node `governance-review` v rune | `${run_id}:governance-review`. |
| `attempt_id` | jedno konkrétne vykonanie tasku | `${task_id}:attempt:<n>`. |
| `invocation_id` | jeden provider call | `${attempt_id}:provider:<n>`. |
| `context_id` | `ctx_<logical_context_fingerprint>` immutable Context Envelope | Mení sa iba pri zmene execution-relevant contextu, nie pri novom attempte. |

### Idempotency

```text
execution_key = sha256(
  canonical_json({
    workflow_version,
    task_definition_version,
    request_artifact_sha256,
    logical_context_fingerprint,
    policy_snapshot_sha256
  })
)
```

`logical_context_fingerprint` je SHA-256 canonical projection Context Envelope
bez `contextId`, `parentContextId`, `threadId`, `runId`, `taskId`, `attemptId` a
`createdAt`; artifact refs sa normalizujú na obsahový SHA-256 a media type bez
lokálnej cesty. Plný `context_sha256` ostáva integrity/audit hash uloženého
envelope, ale nevstupuje do logical idempotency key. Tým nový attempt nemení
dedupe identitu nepriamo cez lineage alebo timestamp.

Pravidlá:

1. Rovnaký `run_id` + rovnaký `execution_key` vráti verified replay bez provider
   callu a bez nového Ruflo tasku.
2. Rovnaký `run_id` + iný `execution_key` je `run_conflict`.
3. Legitímne opakovanie používa nový `run_id` pod rovnakým `thread_id`.
4. V0 nemá retry ani `attempt:2`. Opakovanie je vždy nový `run_id`; prípadný
   multi-attempt workflow je budúca verzia a vyžaduje samostatný BO/GO.
5. Provider invocation musí byť zapísaná do ledgeru pred spustením procesu.
6. Ak po štarte provider callu nie je možné dokázať výsledok, attempt je
   `unknown`, nie `failed`.

---

## 5. Minimálne kontrakty

Kontrakty sú konceptuálne záväzné pre Plan Mode. Implementácia má použiť
existujúce TypeScript conventions a runtime validation bez novej dependency.

```ts
type RunStatus =
  | "created"
  | "running"
  | "verifying"
  | "completed"
  | "killed"
  | "cancelled"

type TaskStatus =
  | "ready"
  | "running"
  | "verifying"
  | "completed"
  | "failed"
  | "unknown"
  | "cancelled"

type AttemptStatus =
  | "started"
  | "provider_in_flight"
  | "provider_completed"
  | "verifying"
  | "completed"
  | "failed"
  | "unknown"
  | "cancelled"

type WorkflowRun = {
  schemaVersion: "agent-os.v0.1"
  workflowVersion: "governance-review.v0.1"
  threadId: string
  runId: string
  taskId: string
  currentAttemptId: string
  executionKey: string
  status: RunStatus
  contextRef: ArtifactRef
  policyRef: ArtifactRef
  projectionStatus: "not_requested" | "pending" | "reconciled" | "failed"
  projectionOperation: "none" | "begin" | "complete"
  lastCheckpoint: WorkflowCheckpoint | null
  version: number
  createdAt: string
  updatedAt: string
}

type WorkflowAttempt = {
  attemptId: string
  taskId: string
  number: number
  status: AttemptStatus
  invocationIds: string[]
  startedAt: string
  completedAt: string | null
  failureCode: string | null
}

type WorkflowCheckpoint = {
  eventId: string
  eventType:
    | "task_ready"
    | "provider_invocation_completed"
    | "verification_completed"
    | "run_completed"
    | "run_killed"
    | "run_cancelled"
  runId: string
  taskId: string
  attemptId: string
  artifactRefs: ArtifactRef[]
  createdAt: string
}

type VerificationResult = {
  verificationId: string
  runId: string
  attemptId: string
  verifier: "bridge-deterministic-v0"
  checks: Array<{
    name: string
    status: "pass" | "fail"
    evidenceRef?: ArtifactRef
  }>
  verdict: "pass" | "fail"
  verifiedArtifactRefs: ArtifactRef[]
  verifiedDecisionFingerprint: string
  createdAt: string
}
```

Vo V0 má `WorkflowAttempt.number` vždy `1`. `invocationIds` vzniká ako prázdne
pole pri `attempt_started` a po validnom `provider_invocation_started` obsahuje
presne jeden deterministický `invocation_id`; nejde o mutovateľný druhý source
of truth, ale o projekciu z ledgeru.

V0 nemá `Agent`, `Agent Registry`, `Message`, `Handoff`, `Action` ani
`Approval` domain entity. Pre tento read-only one-task workflow by boli
predčasné.

---

## 6. Context Envelope

```ts
type ContextEnvelopeV0 = {
  schemaVersion: "agent-os.context.v0.1"
  contextId: string
  parentContextId: string | null
  threadId: string
  runId: string
  taskId: string
  attemptId: string

  objective: {
    artifactRef: ArtifactRef
    sha256: string
  }

  repository: {
    headCommit: string
    workingTree: "clean" | "dirty" | "not_applicable"
    statusArtifactRef: ArtifactRef | null
    diffArtifactRef: ArtifactRef | null
  }

  constraints: string[]
  acceptanceCriteria: string[]
  criticalRisks: Array<{
    risk: string
    evidenceRefs: ArtifactRef[]
  }>
  openQuestions: string[]
  workingSetRefs: ArtifactRef[]
  summaryRef: ArtifactRef | null
  decisionRefs: Array<{
    id: string
    status: "active" | "superseded" | "verification_required"
    sourceRef: string
  }>
  evidenceRefs: ArtifactRef[]
  policyRef: ArtifactRef
  contextBudget: {
    maxSerializedBytes: 65_536
    maxProviderInputTokens: number
  }
  trust: "untrusted"
  dataClassification: "synthetic"
  createdAt: string
}
```

### Context pravidlá

- Envelope je immutable artifact; zmena vytvorí nový `context_id`.
- `parentContextId` je vo V0 vždy `null`; parent chaining nemá producenta, kým
  nevznikne samostatne schválený multi-context workflow.
- V0 neukladá raw chat ani chain-of-thought.
- Repo diff artifact je voliteľný a môže vzniknúť iba z explicitne
  allow-listed paths po secret scan; inak sa uloží iba status + HEAD.
- Objective, provider output a všetok vložený dokumentový obsah sú `untrusted`.
- Context nesmie obsahovať credential, environment dump ani provider auth.
- Max serializovaná veľkosť envelope bez referencovaných artifactov: 64 KiB.
- Context assembler nesmie čítať celé `memory/`; používa iba explicitné refs.
- `criticalRisks` nesmie používať generické formulácie; každý risk má konkrétny
  failure a evidence ref, ak evidence existuje.
- `openQuestions` sa neprenáša ako implicitný súhlas. Nezodpovedaná otázka,
  ktorá mení scope alebo authority, zastaví run pred providerom.
- `workingSetRefs` je jediný artifact set povolený pre provider input assembly.
- V0 nevytvára LLM summarizer. Ak context budget nestačí, run sa fail-closed
  odmietne; `summaryRef` môže odkazovať iba na callerom dodaný, hashovaný
  artifact.

---

## 7. State vs event

Ledger events sú append-only facts. Current state je rebuildable projection; nie
je to ďalší source of truth.

### Povinné udalosti

```text
run_created
task_ready
attempt_started
provider_invocation_started
provider_invocation_completed
verification_started
verification_completed
decision_packet_created
run_completed
run_killed
cancel_requested
run_cancelled
ruflo_projection_requested
ruflo_projection_reconciled
ruflo_projection_failed
```

Každý event musí mať:

```text
event_id · schema_version · event_type · at
thread_id · run_id · task_id · attempt_id
invocation_id · causation_event_id · execution_key
context_id · context_sha256 · policy_sha256
provider · model · token_usage · latency_ms
policy_decision · verification_id
projection_operation
artifact_refs · failure_code
```

Polia, ktoré pre daný event nedávajú zmysel, sú `null`; nemení sa tvar podľa
event type. `policy_decision` má vo V0 iba `allow | stop`. Neexistuje silent
`downgrade`.

Event nesmie obsahovať prompt, provider response, secret alebo celý Context
Envelope. Iba hashes a artifact refs.

### Povolené transitions

```text
Run:
created → running | killed | cancelled
running → verifying | killed | cancelled
verifying → completed | killed | cancelled

Task:
ready → running
running → verifying | failed | unknown | cancelled
verifying → completed | failed | cancelled

Attempt:
started → provider_in_flight
provider_in_flight → provider_completed | failed | unknown | cancelled
provider_completed → verifying
verifying → completed | failed
```

Terminal stavy sa nemenia. Neplatný transition musí zlyhať pred side effectom.

`unknown` je odvodená klasifikácia projekcie, nie stav produkovaný eventom.
V ledgeri sa nikdy nevyskytuje ako event; vzniká výhradne z absencie terminal
evidence pre `provider_invocation_started` (ledger obsahuje
`provider_invocation_started` bez `provider_invocation_completed` alebo iného
dôkazu o výsledku). Ledger nesmie syntetizovať `unknown` event ani túto
absenciu preklasifikovať na `failed`.

`ruflo_projection_requested` má povinné `projection_operation=begin|complete`.
Reducer povoľuje `begin` request pred providerom a `complete` request až po
lokálnej verifikácii. Opakovanie tej istej operácie je povolené iba bounded
reconciliation po predchádzajúcom `ruflo_projection_failed`; nikdy počas
`pending` ani po `reconciled`.

---

## 8. Policy, budget a security

### V0 Policy Snapshot

```ts
type V0PolicySnapshot = {
  schemaVersion: "agent-os.policy.v0.1"
  dataClassification: "synthetic"
  maxProviderCalls: 1
  maxOutputTokens: number
  deadlineMs: number
  toolsEnabled: false
  externalWrites: false
  browserEnabled: false
  rawMcpServerEnabled: false
  automaticRetry: false
  allowedProvider: "claude-code-subscription"
  allowedModel: "claude-opus-5"
}
```

V0 Cost policy je resource policy, nie billing service:

- pre-execution: validácia max calls/token/deadline a subscription-only auth,
- real-time: provider hard output cap + AbortSignal deadline,
- post-execution: usage/latency audit a overrun kill,
- žiadny silent downgrade,
- žiadny pay-as-you-go fallback,
- žiadny automatic retry po call starte.

Policy enforcement je fail-closed: chýbajúci, nevalidný, nehashovateľný alebo
nepodporovaný policy snapshot vytvorí `policy_decision=stop` a provider process
sa nesmie spustiť. V0 nemá vzdialený governor ani fallback cache, takže jeho
výpadok nemožno obísť alternate entrypointom.

### Security invariants

1. Active `.mcp.json` konfigurácie ostávajú prázdne.
2. Claude process má prázdny tool list, strict MCP config, no Chrome, no session
   persistence a isolated working directory.
3. Ruflo smie vykonať iba interný `task_create/task_complete/task_status` cez
   non-shell child process; nespúšťa MCP server ani daemon.
4. Vstup a output sú `untrusted`; text „Founder GO“ v obsahu nemá authority.
5. Runtime nesmie zapisovať do `memory/`, CRM, DB, GitHub ani externého systému.
6. Secrets ostávajú iba v provider procese; ledger a artifacts prejdú secret
   scanom.

---

## 9. Recovery, cancellation a reconciliation

| Failure point | Stav po recovery | Automatická akcia | Zakázané |
|---|---|---|---|
| Pred `provider_invocation_started` | `failed` alebo `cancelled` | Finalizovať aktuálny run; legitímne opakovanie je nový run | Attempt 2 alebo silent retry |
| Po `provider_invocation_started`, bez completion eventu | `unknown` | Vytvoriť reconciliation report | Druhý provider call |
| Po provider completion evente a critique artifacte, pred packetom | `provider_completed` | Rebuildnúť verification a packet bez provider callu | Nový model call |
| Po packet creation, pred `run_completed` | `verifying` | Overiť hashes/result a doplniť terminal event | Prepísať packet |
| Ruflo `task_complete` zlyhá | Canonical run ostáva podľa lokálnej verifikácie | Bounded projection reconciliation | Opakovať provider call |
| SIGINT pred provider callom | `cancelled` | Zapísať cancel event | Spustiť provider |
| SIGINT po `provider_invocation_started`, bez completion eventu | Run `cancelled`, Task/Attempt `unknown` | `cancel_requested`, abort child, `run_cancelled`; bez retry | Preklasifikovať attempt na `failed`/`cancelled` alebo opakovať call |

Per-run claim musí byť exclusive. Stale claim sa nikdy automaticky nepreberie,
ak ledger obsahuje `provider_invocation_started` bez terminal evidence.

Artifact uložený po návrate providera, ale bez následného
`provider_invocation_completed`, je orphan a nie recovery evidence. `inspect`
ho môže uviesť iba vo forensic warningu; `reconcile` ho nesmie adoptovať,
pretože ledger ho neviaže na invocation. Run zostáva `unknown`, bez retry;
orphan je neskôr GC-eligible podľa samostatnej retention policy.

### Checkpoint semantics

Checkpoint nie je ľubovoľný textový save. Je to posledný validovaný lifecycle
event z allowlistu `task_ready | provider_invocation_completed |
verification_completed | terminal`, spolu s immutable artifact refs. Stavová
projekcia sa pri `inspect` vždy prepočíta z ledgeru a odmietne:

- neznámy event type alebo schema version,
- neplatný transition,
- chýbajúci/tampered artifact,
- dve provider-start udalosti pre jeden attempt,
- checkpoint, ktorého causation chain nesedí.

`inspect --task <run_id>` je read-only a nikdy nespúšťa provider ani Ruflo.
`reconcile --task <run_id>` smie iba finalizovať už existujúci
provider-completed run alebo Ruflo projection; nesmie vytvoriť nový Attempt.

---

## 10. Verification map

Všetky testy ostanú v existujúcom
`scripts/ruflo-model-bridge/bridge.test.ts`, pokiaľ veľkosť neprekročí rozumný
review limit. Rozdelenie test file vyžaduje engineering justification, nie nový
test framework.

| # | Akceptačné kritérium | Verification |
|---|---|---|
| 1 | Run/Task/Attempt IDs a execution key sú deterministické a validované | contract unit test |
| 2 | Neplatný lifecycle transition zlyhá pred provider invocation | transition table test |
| 3 | Rovnaký run+execution key replayuje bez provider/Ruflo duplicity | replay integration test |
| 4 | Rovnaký run s iným execution key skončí `run_conflict` | conflict test |
| 5 | Context Envelope je immutable, hash-valid a neobsahuje raw content v ledgeri | contract + grep assertion |
| 6 | Context prekračujúci 64 KiB sa odmietne pred providerom | boundary test |
| 7 | Crash pred provider startom je bezpečne recoverable | recovery test |
| 8 | Crash po provider start evente je `unknown` a nikdy sa auto-retryne | failure test |
| 9 | Provider-completed partial run sa finalizuje z artifactu bez druhého callu | recovery/replay test |
| 10 | Cancellation pred a počas callu vytvorí správny terminal/unknown stav | AbortSignal test |
| 11 | Run nemôže byť `completed` bez VerificationResult PASS | terminal guard test |
| 12 | Verification kontroluje request, critique, context, policy a packet hashes | tamper matrix |
| 13 | Ruflo projection failure nevytvorí druhý provider call | coordinator failure test |
| 14 | Ledger neobsahuje prompt, response, context body ani secret | allowlist test |
| 15 | Tools, raw MCP, browser, session persistence a paid env ostávajú zakázané | provider contract test |
| 16 | Existujúcich 14 Phase 0 testov ostáva zelených alebo sú explicitne superseded | regression suite |
| 17 | TypeScript strict typecheck prejde | `npm run bridge:typecheck` |
| 18 | Celý lokálny suite prejde bez live model/network callu | `npm run bridge:test` |
| 19 | `criticalRisks`, `openQuestions`, working set a context budget sa validujú a hashujú | context contract test |
| 20 | Chýbajúca/neplatná policy fail-closed zastaví provider pred invocation | policy failure test |
| 21 | `inspect` obnoví rovnaký stav/checkpoint z ledgeru a nič nemení | projection determinism test |
| 22 | `reconcile` nikdy nevytvorí druhý attempt/provider call | recovery integration test |
| 23 | Stale claim s provider-start eventom sa nikdy nepreberie | stale-claim failure test |
| 24 | Orphan critique bez completion eventu sa neadoptuje a run ostáva `unknown` | crash-injection test |

### Completion invariant

```text
run_completed
IFF
VerificationResult.verdict == pass
AND decision packet hash == verified hash
AND all required artifacts are readable and untampered
```

Killed/cancelled runs musia mať validný terminal packet a failure/cancellation
evidence; nepotrebujú success verification.

---

## 11. Scope

### IN pre budúci implementačný slice

- rozšíriť existujúce bridge contracts o Run/Task/Attempt/Context/Verification,
- explicitná state transition validácia,
- lifecycle event schema a projection/recovery,
- execution key a identity semantics,
- provider-completed recovery bez druhého callu,
- bounded cancellation,
- Ruflo projection reconciliation,
- read-only `inspect` a provider-free `reconcile` CLI paths,
- nové mock/failure tests,
- aktualizácia bridge README/reportu.

### OUT

- nový Agent OS package alebo deployable,
- Shared Message Bus, Redis, Kafka, BullMQ,
- Agent Registry alebo dynamic routing,
- Cost Governor service,
- Control Plane API/UI,
- Supabase/DB/migration,
- raw MCP server alebo nové MCP tools,
- CRM/product runtime,
- external/production writes,
- Composio, browser automation, GitHub operations,
- automatic model downgrade,
- automatic retry po provider start,
- druhý workflow,
- zapisovanie runtime výsledkov do Decision Memory,
- PR, merge, deploy alebo live provider run bez samostatného GO.

### Predpokladané repo files pre Plan Mode

Preferovaný maximum diff:

- `scripts/ruflo-model-bridge/core.ts`,
- `scripts/ruflo-model-bridge/orchestrator.ts`,
- `scripts/ruflo-model-bridge/cli.ts`,
- `scripts/ruflo-model-bridge/bridge.test.ts`,
- `scripts/ruflo-model-bridge/README.md`,
- relevantný verification report.

`ruflo-coordinator.ts` a `claude-code-provider.ts` sa menia iba ak konkrétny
acceptance test dokáže potrebu. Nový source directory alebo dependency je STOP.

---

## 12. Capability gates

### Gate A — Implementačný plán

- Plan Mode artefakt mapuje každý contract/test na exact code path.
- Obsahuje aktuálny `git status`, diff ownership a rollback.
- Neobsahuje bus/registry/UI/DB.
- Founder vydá samostatné `GO IMPLEMENT V0`.

### Gate B — Lokálna implementácia

- typecheck PASS,
- všetky mock/failure tests PASS,
- žiadny live model call,
- diff review potvrdí scope,
- raw MCP a external writes ostávajú vypnuté.

### Gate C — Jeden live synthetic run

Vyžaduje samostatný Founder GO. Run musí:

- použiť iba subscription seat,
- mať nový `run_id`,
- vrátiť exact model/usage/latency,
- prejsť replayom bez druhého provider callu,
- prejsť failure/reconciliation review.

### Gate D — V0 exit

Pred diskusiou o druhom workflowe alebo shared kernel extraction:

- po prvých 10 po sebe idúcich runoch vznikne povinný review checkpoint:
  context/recovery gaps, usage variance, projection failures a Founder time
  saving; výsledok môže byť STOP bez čakania na 30 runs,
- 30 po sebe idúcich reprodukovateľných read-only runs,
- 100 % validný replay,
- 0 duplicate provider calls,
- 0 secret/raw prompt v ledgeri,
- všetky crash/cancel/tamper scenáre PASS,
- zmeraná Founder time saving oproti copy-paste baseline,
- explicitné rozhodnutie BUILD / STOP / KEEP LOCAL.

Message bus zostáva zakázaný, kým viac execution workers alebo meraná queue
contention nevytvoria konkrétnu potrebu.

---

## 13. Stop conditions

Implementácia sa okamžite zastaví, ak:

- vyžaduje nový runtime dependency alebo service,
- mení `apps/crm`, DB, environment alebo production state,
- potrebuje raw MCP/server/daemon,
- agent navrhne generic registry/bus/governor package,
- nie je možné jednoznačne určiť repo baseline pre Context Envelope,
- provider call môže byť po failure automaticky zopakovaný,
- lifecycle state a audit event sa nedajú deterministicky zrekoncilovať,
- Context/ledger obsahuje secret, raw prompt alebo response,
- test potrebuje live provider/network na základný PASS,
- canonical Decision Memory alebo Engineering Constitution ostáva v rozpore.

---

## 14. Rollback

Dokumentačný rollback:

- odstrániť tento BO a prípadný Plan Mode artefakt,
- pôvodný Phase 0 bridge ostáva bezo zmeny.

Budúci code rollback:

- revert iba bridge contract/lifecycle diff,
- runtime files zostávajú v ignored `.ruflo/model-bridge-runtime/`,
- žiadna DB ani external compensation,
- staré runtime artifacts sa nemigrujú automaticky; V0 schema mismatch musí
  skončiť read-only legacy replayom alebo explicitným rejection.

---

## 15. Engineering justification

- **Trigger:** new-abstraction proposal z pôvodného Agent OS packu
- **Decision path:** reuse — existujúci bridge + Node stdlib; bez nového package
- **Alternatives considered:** Shared Message Bus/registry/control plane boli
  odmietnuté, pretože neexistuje druhý workflow ani distribuovaný scale dôkaz
- **Why not reuse:** N/A — reuse applied
- **Expected outcome:** prvý jednoznačný lifecycle/context/recovery kontrakt bez
  rozšírenia authority alebo infra surface
- **Related paths:** `scripts/ruflo-model-bridge/`,
  `docs/briefs/BO-ruflo-model-collaboration-bridge-phase0.md`,
  `memory/decisions.md`
- **Contradiction check:** resolved by Founder GO 2026-08-22 pre prepísanie
  Agent OS smeru; implementačný diff stále vyžaduje samostatný GO

---

## 16. Plan Mode a ďalšia brána

Pripravený Plan Mode artefakt:

`docs/briefs/plans/BO-agent-os-v0-bounded-workflow-kernel-plan.md`

Plan je menší než tento BO a uvádza exact transitions, event ordering, crash
points a test changes. Nerozširuje scope. Grok 4.6 a Fable 5 review sú
zapracované; artefakt je pripravený na explicitný implementačný GO, nie je ním
však sám osebe.

Jediná platná pokračovacia fráza je:

```text
GO IMPLEMENT V0
```

Bez nej sa runtime kód nemení.
