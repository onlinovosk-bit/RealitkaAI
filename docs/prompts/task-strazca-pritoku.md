# Zadanie — Strážca prítoku (doručenie alarmov)

**Autorita:** Brief 18 V2 · Founder GO „Strážca GO.“ (2026-09-05)  
**Režim:** vetva `feat/b18-notification-delivery` + PR + STOP. **ŽIADNY MERGE.**  
**Poznámka:** samostatný súbor `task-strazca-pritoku.md` v Downloads nebol nájdený;
kanonický scope = Brief 18 V2 (ingest `docs/prompts/2026-09-04-brief18-konsolidovana-vlna.md`).

## Prečo

Heartbeat **funguje** a zapisuje do `routine_notifications`
(napr. „Realvia/webhook: žiadna stopa 7+ dní"). **143 notifikácií, 0 prečítaných.**
Chýba doručovacia cesta k founderovi.

```
platform-heartbeat  →  routine_notifications  →  ✖ NIKAM
guardian digest     →  guardian_findings      →  e-mail ✓
```

## Scope (exkluzívny)

- `apps/crm/src/lib/infra/**`
- `apps/crm/src/app/api/cron/notification-digest/**`
- `apps/crm/vercel.json`
- testy + `docs/reports/` dôkaz

## Tri veci (MVP)

1. **Denný digest** neprečítaných `routine_notifications` e-mailom na `FOUNDER_EMAILS`.
   Po úspešnom sendi nastaviť `read_at` (existujúci stĺpec — **žiadny nový stĺpec**).
2. **`critical` okamžite** pri novom heartbeat critical signáli (dedup 24 h =
   existujúci `hasRecentHeartbeatAlert` pred insertom).
3. **Realvia prahy:** 48 h → warning · 7 dní → critical; **odstrániť väzbu**
   na `inboundMailboxCount`.

## Zakázané

- E-mail zákazníkovi / agency ownerom (len founder allowlist).
- Nový DB stĺpec / migrácia / `db push`.
- Merge do `main`.
- Dotyk `feat/bridge-harness`, onboarding DROP migrácie.

## Akceptácia

- Cron `/api/cron/notification-digest` za `Bearer CRON_SECRET` (401 bez).
- Unit: Realvia 48h warning / 7d critical bez mailbox gate.
- Verification: vercel.json obsahuje notification-digest.
- Po PROD smoke (founder): unread count musí vedieť klesnúť po digeste.
