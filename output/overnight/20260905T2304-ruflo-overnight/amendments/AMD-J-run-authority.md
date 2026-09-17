# AMD-J — RUN authority / package SSOT (supersedes live docs for this RUN)

**Findings:** J-01 (CRITICAL), J-02 (HIGH)
**RUN_ID:** `20260905T2304-ruflo-overnight`
**Action:** AMEND_PROVENANCE
**Source:** `lanes/J/report.md`, `lanes/J/verify-out.json`

## Binding pins

1. **Authoritative RUN root:** `output/overnight/20260905T2304-ruflo-overnight/`
2. **Authoritative overnight package (inputs):** `output/overnight/20260905T2304-ruflo-overnight/w0/input/local_draft/`
   (START-HERE / lanes.json / launch-record / seed-evidence as frozen at W0)
3. **Live** `docs/overnight/2026-09-05-ruflo-swarm/*` is **NON-AUTHORITATIVE** for this RUN (INPUT_DRIFT: status metadata only on equal line counts for START-HERE/lanes.json; launch-record rewritten to sibling RUN).
4. Lane F package `input_hashes` that cite live docs are recorded as **drifted-but-status-only**; do **not** cite live package hashes as SSOT.
5. Sibling tree `output/overnight/2026-09-05T2308-CEST-research/` is a **separate RUN** — must not silently replace 2304 evidence at morning handoff.
6. W1-W3 `control/w*-output-hashes.json` remain freeze evidence for A-G (J verified 0 mismatches).
7. Mutable `control/status.json` is orchestrator state — not a frozen research input.

## Residual

- Founder still chooses whether morning briefing treats 2304 or 2308 as primary if both packs stay visible.
- Unamended would have forced STOP / NO_GO; with this pin, provenance condition for research handoff is **met**.
- Implementation GO still forbidden on H/I grounds (see AMD-H*).
