# Lane J — Provenance / collision / evidence review

**RUN_ID:** `20260905T2304-ruflo-overnight`  
**BASE_SHA:** `cf3604613cdbb6a7a279e175f2c792fb25591461`  
**Reviewed:** lanes A–G + `control/*` hashes + launch-record (w0 freeze vs live)  
**Reviewer role:** independent opponent (write-set `lanes/J/` only)  
**Accessed_at:** 2026-09-05

## Verdict: PASS_WITH_CONDITIONS

Research outputs A–G are usable for K/O6 **only if** the conditions below are applied.  
**Not** an implementation GO. Unamended CRITICAL items → O6 must prefer `NO_GO_IMPLEMENTATION` / `VALIDATE_FIRST`, never silent rebase onto live package docs.

---

## 1. Decisions

1. **Accept frozen lane artifacts A–G** for this RUN: all W1–W3 `control/w*-output-hashes.json` entries **match** current files (0 mismatches). Shared `base_sha` consistent. Declared write-sets pairwise disjoint.
2. **Treat `w0/input/local_draft/*` as package SSOT for this RUN.** Live `docs/overnight/2026-09-05-ruflo-swarm/*` drifted mid-run and now points launch-record at sibling RUN `2026-09-05T2308-CEST-research` — **non-authoritative** for `20260905T2304-ruflo-overnight`.
3. **Record INPUT_DRIFT (package status metadata)** between early lanes (A/D hashed w0 freeze) and Lane F (hashed live docs). Diff is status `PREPARED`→`STARTED` / `PREPARED_NOT_STARTED`→`STARTED` (line counts unchanged for START-HERE + lanes.json). Do **not** invent substantive instruction changes; do **not** ignore the process breach.
4. **Do not treat mutable `control/status.json` as a frozen worker input.** Hash changes D→F→now are expected orchestrator updates, not research content drift.
5. **Runner/budget posture OK for research scope:** W0 READY; Cursor subscription; ruflo-model-bridge V0 EXCLUDED; spend_cap/deadline ASSUMED — mark ASSUMED, do not escalate spend.
6. **Change condition for this verdict:** If K cannot publish an amendment map that (a) pins authoritative RUN root, (b) supersedes live launch-record for morning handoff, (c) forbids citing live package hashes as SSOT — escalate reviewer follow-up to **STOP** / final `NO_GO_IMPLEMENTATION`.

---

## 2. Evidence

| Check | Result | Pointer |
|---|---|---|
| Output hash integrity W1–W3 | PASS (0 mismatches) | `control/w1-output-hashes.json`, `w2-…`, `w3-…` vs lane contract files |
| BASE_SHA agreement A–G | PASS = `cf3604613cdbb6a7a279e175f2c792fb25591461` | `lanes/*/result.json` |
| Write-set pairwise | PASS declared; D `_scratch/` local only | `lanes.json` + inventory |
| Dep chain F←D+E, G←D+E | PASS (all `PASS_WITH_CONDITIONS`) | result statuses |
| Package input hashes A/D vs F | FAIL / INPUT_DRIFT | A/D `START-HERE`=`73df8d96…` (=w0); F=`a062ceda…` (=live) |
| Launch-record authority | FAIL vs this RUN | w0 `run_id=20260905T2304…`; live `run_id=2026-09-05T2308-CEST-research` |
| Dual RUN roots | Present | `…/20260905T2304-ruflo-overnight` + `…/2026-09-05T2308-CEST-research` |
| sources ledgers | Present (list vs wrapped schema) | A/B/E list; C/D/F/G wrapped |
| Prod overclaim scan | No hard false prod assertions; F mentions Stripe PROD as unverified | F report |
| Historical vs current | Generally disciplined | A late RLS; C no invented XSD; E HYPOTHESIS; G VALIDATE_FIRST |

Verification tool: `lanes/J/verify_provenance.py` → `lanes/J/verify-out.json`.

---

## 3. Findings (severity + verification)

### J-01 — CRITICAL — Package INPUT_DRIFT (START-HERE.md / lanes.json)

- **Where:** `lanes/A|D/result.json` vs `lanes/F/result.json` `input_hashes`
- **Evidence:** A/D `START-HERE`=`73df8d96…` (=w0 freeze); F=`a062ceda…` (=live). Same for `lanes.json` (`a82e0617…` vs `d60edc89…`).
- **Content check:** Only status banner / JSON `status` changed; body lengths stable (149 / 326 lines).
- **Impact:** Violates immutable-input contract; F may have treated live root as authoritative.
- **Fix (K):** Amendment: w0 freeze supersedes live package for this RUN; mark F package citations drifted-but-status-only.
- **Verify:** Re-hash w0 vs live; amendment map lists J-01.

### J-02 — HIGH — Dual RUN + live launch-record rewrite

- **Where:** live `docs/overnight/.../launch-record.md` vs w0 freeze
- **Evidence:** Live `run_id=2026-09-05T2308-CEST-research`; w0 `run_id=20260905T2304-ruflo-overnight`; sibling output tree exists.
- **Impact:** Morning handoff may bind the wrong evidence root.
- **Fix:** K/O6 pin single authoritative RUN; live launch-record must not replace 2304 provenance silently.
- **Verify:** `grep run_id` w0 vs live; `ls output/overnight`.

### J-03 — MEDIUM — Mutable control hashed as worker input

- **Where:** D/F/`now` distinct hashes of `control/status.json`
- **Impact:** False INPUT_DRIFT if treated like frozen research input.
- **Fix:** Workers hash prior lane outputs + w0 only.
- **Verify:** Exclude status.json from cross-lane equality (judgment in this review).

### J-04 — MEDIUM — sources.json schema inconsistency

- **Where:** A/B/E bare arrays; C/D/F/G wrapped `{"sources":[]}`
- **Impact:** Fragile automation / false empty-ledger alerts.
- **Fix:** O6 parser accepts both; do not rewrite frozen reports.
- **Verify:** `verify_provenance.py` unwrap path.

### J-05 — MEDIUM — Incomplete input_hashes on some lanes

- **Where:** B/E omit package hashes; C placeholder; G omits B + package docs
- **Impact:** Weaker drift detection (F’s fuller hashing exposed the issue).
- **Fix:** Future runs hash **w0 freeze** paths, never live docs.
- **Verify:** result.json checklist.

### J-06 — LOW — Lane D `_scratch/` present

- **Where:** `lanes/D/_scratch/`
- **Impact:** OK if not frozen contract; absent from W2 hash keys.
- **Fix:** Hash contract trio only.
- **Verify:** w2-output-hashes keys.

### J-07 — LOW — ASSUMED budget/deadline/provider fields

- **Where:** w0 launch-record + W0 report
- **Impact:** Research allowed; spend escalation still forbidden.
- **Fix:** Keep ASSUMED label into morning report or founder confirm.
- **Verify:** subscription_only + EXCLUDED bridge.

### Unsupported-claim posture (summary)

| Lane | Claim hygiene |
|---|---|
| A | PROD_UNKNOWN / draft C0–C2 labeling |
| B | Counter-evidence; marketing limits |
| C | Vendor gaps explicit; no invented endpoints as fact |
| D | Evolve-existing; rejects Nest/BullMQ default |
| E | Pilot price HYPOTHESIS; Stripe unverified |
| F | No outbound sends; SLA proposal_only |
| G | VALIDATE_FIRST; P5/P6 UC-blocked |

No CRITICAL fabricated primary sources found in A–G under this review.

---

## 4. Assumptions

- Scope remains `research_and_specs`.
- Sibling RUN 2308 is out of scope except as collision risk.
- Docs worktree may lack some BASE paths — absence here ≠ absence at BASE_SHA.

## 5. Unknowns

- Which RUN founder treats as morning-authoritative (2304 vs 2308).
- Intent behind live package mutation during overnight.
- Session spend (not metered in control/).
- Stripe/prod DB still PROD_UNKNOWN (inherited).

## 6. Experiments

- **EXP-J1:** After K amendment, re-run `verify_provenance.py` with package paths forced to w0 only — expect zero START-HERE/lanes.json collisions.
- **Stop rule:** If live launch-record still claims a different run_id as SSOT at O6 start → STOP follow-up file in `lanes/J/`.

## 7. Product Implications

- **Reuse:** Keep A–G research; do not rebuild for status-only package drift.
- **Change:** Enforce w0-freeze-only reads before any implementation wave.
- **Defer:** Pilot/commercial GO that depends on live launch-record until RUN authority is pinned.
- **Deps:** K ← J-01/J-02; O6 ← K; H/I independent.

## 8. Decision Memory Payload (DRAFT — not canonical memory)

- 2026-09-05 / `20260905T2304-ruflo-overnight` / Lane J: PASS_WITH_CONDITIONS — output hashes OK; package INPUT_DRIFT A/D vs F (status metadata); dual RUN + live launch-record→2308 HIGH; w0 freeze SSOT; implementation GO blocked until K/O6 pin authority.

---

## Short summary

Frozen A–G artifacts hash-check clean on one BASE_SHA, but the overnight package was mutated live and Lane F hashed the live tree while A/D hashed the w0 freeze; live launch-record now points at a sibling RUN. **PASS_WITH_CONDITIONS** for K/O6 research handoff; **not** implementation GO until provenance is amended.
