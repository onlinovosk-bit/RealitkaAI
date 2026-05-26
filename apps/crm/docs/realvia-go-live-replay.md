# Realvia — GO LIVE: replay neúspešných webhookov

Po deployi opravy **resolvera** (normalizácia `[identifikátor]`, late-resolve v workerovi) treba znovu spracovať joby, ktoré skončili ako `failed` alebo mali `agency_id = null`.

## 1) Automatický replay cez worker cron (odporúčané)

Štandardný externý cron ostáva ten istý „drain“ request. Pridaj query parametre:

```
GET https://app.revolis.ai/api/cron/realvia-process?replay_failed=1&replay_limit=80
Authorization: Bearer <CRON_SECRET>
```

| Parameter | Význam |
|-----------|--------|
| `replay_failed=1` alebo `true` | Pred `processRealviaQueue()` zavolá `enqueueReplayFailedQueueJobs` na riadky vo fronte so `status = failed` |
| `replay_limit` | Max počet **queue** riadkov (default 50, strop 500) |

Odpoveď obsahuje navyše `replay_failed_jobs: { replayedCount, errors[] }` ak bol replay zapnutý.

Následný bežný cron (bez parametrov) už len vysáva `pending` joby ako doteraz.

## 2) Replay jedného uloženého webhooku (manuál)

V kóde alebo skripte použite `enqueueReplayForWebhookLog(webhook_log_id)` (`webhookStore`). Nastaví log späť na `processed=false` a queue job na `pending`.

## 3) Nový export od Realvie (alternatíva)

Ak Realvia vie zopakovať doručenie rovnakých udalostí, stačí ich znovu poslať na `POST /api/webhooks/realvia` — webhook stále platí pravidlo „validuj → ulož → zarad“.

## Poznámky

- Ak po late-resolve worker doplní `agency_id` na `realvia_webhook_logs`, nasledujúce behy už čítajú UUID priamo z riadku.
- Presná správa observability pri chýbajúcej agentúre: **`Agency resolution failed`** (`REALVIA_PROCESSING_ERROR_AGENCY_RESOLUTION_FAILED`).
