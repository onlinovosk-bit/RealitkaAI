# /hladame — Máme kupca

**PR:** `feat(public): "Máme kupca" demand page with seller lead capture`

- Lists only `transaction_type = Dopyt` for explicit Smolko agency_id (fail-closed).
- Title shown as published; no city parse from title (AP-005).
- Budget only when `price > 0` (AP-001).
- Seller form → existing `/api/leads/inbound` with `note=dopyt=<id>`; auto-response via #521.
- Inherits `(public)` GA + cookie banner (#525).
