# Agent OS V0 — local baseline manifest

**Captured:** 2026-08-22

**Purpose:** Freeze the exact local Phase 0 bridge input that the dormant V0
plan was reviewed against. This is evidence, not implementation authorization.

## Git anchor

```text
local branch: feat/bridge-harness
HEAD: 4a01a46a161cb68cdae50f4f58a9218aee71de56
HEAD object type: commit
local remote-tracking ref containing HEAD:
  origin/chore/ci-vlna2-c1-brain-check
```

The feature branch itself is local. No push is required or authorized for V0
preparation. The implementation agent runs in this workspace and must stop if
HEAD or any indexed bridge blob below differs before its first edit.

## Canonical scoped input

All Phase 0 bridge files are additions in the Git index and have no unstaged
delta. The index is the reviewed runtime baseline:

| Path | Indexed Git blob | Lines added |
|---|---|---:|
| `scripts/ruflo-model-bridge/README.md` | `6f06023060ac383a628e8fab375d8cc2bf0cb622` | 25 |
| `scripts/ruflo-model-bridge/bridge.test.ts` | `1518f0f019e2c1164b7d4508fe454632356f7741` | 431 |
| `scripts/ruflo-model-bridge/claude-code-provider.ts` | `b34c619e2ce7669af7ae3c7f81af8d434229b806` | 412 |
| `scripts/ruflo-model-bridge/cli.ts` | `a3ec5b2f9937cdfb9630043c04f193a55b22326b` | 123 |
| `scripts/ruflo-model-bridge/core.ts` | `0c30f8a16875da11b5d9bc9f97fe443a32890163` | 300 |
| `scripts/ruflo-model-bridge/fixtures/phase0-synthetic.md` | `e2000e4bffe821a457bce40c404e1a719c4e4c2c` | 8 |
| `scripts/ruflo-model-bridge/orchestrator.ts` | `3aaa7cd537f5c7f564d72aa21a38fc509a4c1228` | 302 |
| `scripts/ruflo-model-bridge/ruflo-coordinator.ts` | `997660c0621db3ae29a9cfbed1cc75a87aa1d51c` | 219 |
| `scripts/ruflo-model-bridge/tsconfig.json` | `76852b1cc2cd2b407e81bac19a25ab8a71f77858` | 13 |

Scoped staged bridge patch ID:

```text
a414e018d6050df3c4de41b2e755dd21165ec8a4
```

## Dirty-tree ownership boundary

At capture time these companion paths were already modified outside the V0
runtime implementation slice:

```text
 M .cursor/mcp.json
 M .gitignore
 M .mcp.json
 M memory/decisions.md
 M package-lock.json
 M package.json
```

The V0 Build Order and Plan are untracked preparation artifacts. The wider tree
also contains unrelated staged/untracked user work. V0 implementation must not
normalize, restage, revert or absorb it.

`package.json`, `package-lock.json`, MCP configs and `.gitignore` are read-only
inputs for V0 unless a concrete acceptance test proves a required change and
the Founder separately approves the scope expansion. No new dependency is
planned.

## Revalidation commands

```powershell
git rev-parse HEAD
git ls-files --stage -- scripts/ruflo-model-bridge
git diff --cached -- scripts/ruflo-model-bridge | git patch-id --stable
git diff --name-status -- scripts/ruflo-model-bridge
git status --short -- scripts/ruflo-model-bridge package.json package-lock.json .mcp.json .cursor/mcp.json .gitignore
```

Expected before implementation edits: the HEAD, nine blob IDs and patch ID
above match; the last bridge command emits no unstaged paths. Any mismatch is a
STOP and requires a fresh baseline review.

## Revalidation note 2026-08-22

Revalidation against the capture-PC index (not a new baseline, not a GO):

- Nine blob IDs re-checked; **all match** the table above.
- Patch-id on the capture PC recomputed to
  `b08ee977beecfc44612ba8cd6b3f4273ab8cefd8`
  (this manifest originally recorded `a414e018d6050df3c4de41b2e755dd21165ec8a4`).
  Cause: `core.autocrlf = true`, i.e. a diff-render difference, **not content
  drift** — evidence is the blob-id match on all nine files.
- The claim *„no unstaged delta"* **no longer holds**: at revalidation time
  `core.ts` had an unstaged change +656/−66 (V0 Step A), captured in a separate
  commit `wip(bridge): V0 Step A contracts written before GO IMPLEMENT V0`.

This note does not authorize `GO IMPLEMENT V0`. The feature branch still must
exist on `origin` before any implementation agent edits `scripts/`.
