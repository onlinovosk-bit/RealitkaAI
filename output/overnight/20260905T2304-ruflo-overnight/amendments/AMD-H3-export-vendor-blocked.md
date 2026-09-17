# AMD-H3 — Portal export P5/P6 remain BLOCKED (vendor)

**Finding:** F-H3 (Lane H, HIGH; mitigated by existing G BLOCKED)
**RUN_ID:** `20260905T2304-ruflo-overnight`
**Action:** **BLOCKED** — not a fake fix
**Supersedes:** Any reading of D9 outbox/unpublish model as ready to implement

## Why BLOCKED (not amended into a buildable design)

- Lane C: UC Import public cadence is ~12h **full inventory** file; deactivate vs delete rules **missing** vendor.
- D9 models per-listing outbox / ordered_after / unpublish — mismatched until vendor confirms SSOT semantics.
- G correctly keeps BO-P5/P6 BLOCKED; K **affirms** and forbids early unblock.

## Unblock conditions (needs vendor / customer package — not spend, not runner expand)

1. UC partner docs + sandbox: auth/pull, whether full-file is authoritative, delete/deactivate codes, ack/URL semantics.
2. Then either adapt D9 to immutable full-snapshot replace **or** document true per-listing API with `FOR UPDATE SKIP LOCKED` lease + snapshot_version reject.

## Residual

P5/P6 stay BACKLOG. Commercial narrative must not imply publish is near (aligns I condition 7 / G).
