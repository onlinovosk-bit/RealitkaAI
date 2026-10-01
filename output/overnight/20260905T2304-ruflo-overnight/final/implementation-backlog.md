# Implementation backlog (consolidated pointers)

Source of task detail: `lanes/G/report.md` superseded where noted by `amendments/`.

## P0 — must clear before any multi-tenant GO
1. **AMD-H1 / BO-P2 rewrite:** strip `owner_phone`/`broker_phone` from non-audit selects; DB-enforced reveal + `phone_value_releases` (or equiv); fail-closed. Acceptance: inventory API returns no raw phone; reveal path audited; bypass tests fail closed.
2. **AMD-H2 / BO-P1 widen:** tenant freeze covers **leads + properties** NULL `agency_id` WITH CHECK; cross-tenant JWT sees 0 NULL rows.

## P1 — pilot cut-scope (after P0)
3. Design-partner onboarding per F (no portal publish promise).
4. Instrument attempt→response latency metric (F8 learning-only per AMD-I).
5. Keep BO-P5/P6 portal outbound **BLOCKED** until UC package (AMD-H3).

## P2 — later waves
6. Contact≠Deal model evolution (D) after tenant contract freeze.
7. Storage signed-URL isolation tests when media in scope (H F-H5).
8. Pricing experiment only after AMD-I interviews.

## Collision / ownership
- Single owner for schema/tenant migrations.
- No parallel SQL on same objects.
- Adapter lanes own isolated modules only (G matrix).
