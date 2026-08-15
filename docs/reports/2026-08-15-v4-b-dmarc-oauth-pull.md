# V4-B DMARC — inbound OAuth pull (one-pager)

**Dátum:** 2026-08-15
**Lane:** Vlna 4 / V4-B
**Stav:** DESIGN ONLY · **STOP pred implementáciou — GO dá founder**
**PR účel:** dokument, nie kód. Nemergovať ako implementáciu.

Kanonický návrh: [`docs/architecture/inbound-oauth-pull-design.md`](../architecture/inbound-oauth-pull-design.md)

## Čo je rozbité

Meranie ZISTI 2026-08-15 (súbor na `docs/reports-2026-08-17` / PR #402, nie na `main`):

- Alias `smolko-a7f2@revolis.ai` → Reality Smolko cez Cloudflare Email Routing → Worker `email-gateway` → `inbound_mailboxes` → `POST /api/acquire/email` (`mailbox.agencyId`).
- Prod `last_received_at=2026-07-14 20:53:09+00`.
- Implikovaný workaround: Gmail auto-forward na Revolis alias → **DMARC/alignment riziko**.
- `resolveInboundFromEmail` použije `replyTo` ako From, ak je `*.revolis.ai`. `agencies.email` meraného tenanta je `null`; rozbije sa, ak niekto dá do `agencies.email` inbound alias.
- `agency-map.ts` má mŕtvy kľúč `smolko@inbound.revolis.ai`. `feat/inbound-triage-signal` @ `cb4559b98` nemá PR a alias nerieši.

Interný dôkaz aliasu **nie je** marketing case study.

## Čo sa navrhuje (po GO)

1. Zákazník udelí OAuth **read-only Gmail** + čítanie **iba označeného štítku** (nie `gmail.send`, nie celá schránka).
2. Cron job stiahne označené správy a zavolá **existujúci** `POST /api/acquire/email` (`x-shared-secret` / `ACQUIRE_SHARED_SECRET`). Druhý ingest sa nestavia.
3. Zákazník vypne Gmail forward až po 24–48 h dual-run. Alias ostáva fallback.

Ústava: ~8–9 VALIDATE. BUILD kódu až po GO.

## Fázy (každá vlastný PR)

S tento dokument → A Google test OAuth client → B token storage + revoke UI → C pull cron → D 1-tenant pilot → E vypnúť forward → F Google restricted-scope verification.

## Riziká (skrátene)

Google verification/CASA · šifrované tenant tokeny · GDPR **6(1)(a)** súhlas · least privilege · revoke in-app + Google účet.

## Tento PR nemenil

`apps/` · workers · migrations · `lib/acquisition/sync/`.
