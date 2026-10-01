# ZISTI — smolko-a7f2@revolis.ai + feat/inbound-triage-signal

**Dátum merania:** 2026-08-15 (súbor podľa zadania 2026-08-17)

## Jedna veta

**`smolko-a7f2@revolis.ai` routuje do Reality Smolko** (`agency_id=11111111-1111-1111-1111-111111111111`) cez Cloudflare Email Routing → Worker `email-gateway` → tabuľku `inbound_mailboxes` → `POST /api/acquire/email` s `mailbox.agencyId`.

## Dôkaz

| Vrstva | Nález |
|---|---|
| Prod SQL `inbound_mailboxes` | `email=smolko-a7f2@revolis.ai`, `active=true`, `agency_id=11111111-…-111`, `last_received_at=2026-07-14 20:53:09+00` |
| Worker (untracked worktree `codex-email-gateway-worker`) | lookup `inbound_mailboxes?email=eq.{recipient}` → `POST https://app.revolis.ai/api/acquire/email` |
| CRM `origin/main` route | berie `payload.mailbox.agencyId`, nie statickú mapu |
| `agency-map.ts` (main aj inbound vetva) | stále len mŕtvy kľúč `smolko@inbound.revolis.ai` — kódová mapa nie je live router |
| `feat/inbound-triage-signal` | **0 výskytov** `smolko-a7f2` |

Ďalšie mailboxy: `demo-3f7a@revolis.ai` → Revolis Demo; `aa-reality-kosice-s-r-o-6461@revolis.ai` → AA REALITY Košice.

## Čo obsahuje `feat/inbound-triage-signal`

- 1 commit `cb4559b98`, **žiadny PR**, nie je v `main`.
- 5 súborov vs merge-base: `inbound-lead-triage.ts` + test, hook v `api/acquire/email/route.ts`, typ notifikácie `new_lead`, fallback `SUPABASE_URL` v `admin.ts`.
- Best-effort AI triáž + `new_lead` notifikácia po inserte. **Nerieši alias, DMARC ani `agency-map`.**
- Na Verceli má 39 dní starý Preview-only `SUPABASE_SERVICE_ROLE_KEY` scoped na túto vetvu.

## DMARC riziko (mimo tejto vetvy)

`resolveInboundFromEmail`: ak je `replyTo` na `*.revolis.ai` (vrátane inbound aliasu), stane sa From. `agencies.email` u Smolka je teraz `null` — fallback owner/outreach. Rozbije sa, keď niekto dá do `agencies.email` hodnotu `smolko-a7f2@revolis.ai`.
