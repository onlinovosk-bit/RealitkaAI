# Session 2026-08-15 (Stage 0 smoke + inbound ZISTI)

### Dokončené
- Stage 0 Preview smoke PASS: POST /connect 200 PENDING, GET /accounts len Revolis Demo; Smolko payload ignorovaný.
- SQL riadok `acquisition_accounts` `40a02a8e-7e31-439e-aecd-11aec040b2a2` status PENDING, customer_id 7024414113.
- Migrácia `20260811220000_acquisition_core` aplikovaná na prod; tabuľka existuje.
- `GOOGLE_ADS_*` na Verceli Preview-only (Production scope preč).
- Supabase Preview env scoped na `chore/stage0-smoke`, nie plošne.
- ZISTI: `smolko-a7f2@revolis.ai` → Reality Smolko cez Worker + `inbound_mailboxes`.
- Pravidlo: chat ≠ SoT; výstup ide do `docs/reports/` + push.

### Rozpracované / Pending
- Vlna 3B L13/L14 (PR-S0.4 / S0.5) — žiadna vetva, žiadny PR.
- Vlna 4 L15–L18 — STOP, chýba `docs/prompts/ruflo-swarm-vlna4-5-2026-08.md`.
- Dummy kampane v test RK A/B (372-637-0609 / 227-278-1649) — founder v Test MCC.
- Draft PR #400 `chore/stage0-smoke` — nemergovať.

### Kľúčové súbory
- `docs/reports/2026-08-17-stage0-smoke.md`
- `docs/reports/2026-08-17-inbound-zisti.md`
- `docs/reports/2026-08-17-vlna3b-vlna4-status.md`
- `.cursor/rules/l99-repo-is-comms-channel.mdc`

### Ďalší krok
Founder: vložiť prompt Vlny 4 do repa, alebo GO na Vlnu 3B (L13+L14). Dummy kampane v RK A/B medzitým.
