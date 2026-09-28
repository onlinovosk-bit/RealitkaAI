# Strážca prítoku — Brief 18 V2 delivery (STOP)

**Date:** 2026-09-05  
**Branch:** `feat/b18-notification-delivery`  
**GO:** Founder „Strážca GO.“  
**Merge:** NIE (agent STOP)

## Najprv som hľadal

| Hľadané | Nález |
|---|---|
| `docs/prompts/task-strazca-pritoku.md` | **chýbal** v repe aj Downloads |
| Board 2026-09-04 | `task-strazca-pritoku napísané · nespustené` |
| Brief 18 | `Downloads/brief18konsolidovanavlna*.md` → V2 = doručenie alarmov |
| Existujúci heartbeat | `lib/infra/platform-heartbeat.ts` → zapisuje do `routine_notifications`, **bez e-mailu** |
| Existujúci digest | `guardian-digest` → e-mail z `guardian_findings` (iný kanál) |
| Customer-health L2 | už merged (#505/#507) — **iný** strážca (ticho leadov/loginov) |

Kanonický scope: Brief 18 V2 (nie inventúra novej featury).

## Constitution (skrátene)

| # | Odpoveď |
|---|---|
| 1 Zaplatí klient? | Retencia platiaceho — founder musí vidieť mŕtvy prítok skôr než klient |
| 8 Timing | **Teraz** — webhook ticho od 28.8., 143 unread, 0 answered |
| Verdikt | **BUILD** (founder GO) · max 1 PR |

**Data-sourcing:** `routine_notifications` (interné), `realvia_webhook_logs` (map: Realvia webhooky). Žiadny scrape / PII v e-maile (len title/priority/čas).

## Čo je v PR

1. Realvia prahy: **48h warning** / **7d critical**; odstránená väzba na `inboundMailboxCount`.
2. Critical heartbeat → okamžitý e-mail na `FOUNDER_EMAILS` (dedup = existujúci 24h `hasRecentHeartbeatAlert`).
3. Cron `GET /api/cron/notification-digest` (`15 7 * * *`) — digest unread → founder; po sende `read_at`.
4. Task brief + Brief 18 ingest do `docs/prompts/`.

## Overené

```
npx vitest run …platform-heartbeat …notification-delivery …notification-digest…
→ 5 files / 21 tests PASSED
```

## Pending (founder)

- [ ] Merge PR po CI
- [ ] Vercel Production: `FOUNDER_EMAILS`, `RESEND_API_KEY` (ak chýbajú)
- [ ] Voliteľné: `NOTIFICATION_DIGEST_ENABLED=false` na vypnutie
- [ ] PROD smoke: `GET /api/cron/notification-digest` + Bearer → unread klesne
- [ ] G1 správa referenčnému klientovi (webhook živý vs ticho) — mimo tohto PR

## Riziká

- Digest označí `read_at` aj staré alerty — zámer (Brief: unread musí klesnúť).
- Bez `FOUNDER_EMAILS` cron vráti `no_founder_email` a **neoznačí** read.
- Heartbeat cron ostáva denný (`0 7`); critical e-mail ide len pri novom inserti (nie spätne na 143).
