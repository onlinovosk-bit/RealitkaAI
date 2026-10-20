# Realvia: 83,4 % zlyhaní a probe retry

**Stav:** report z hotového workera (#864) + oprava retry v tomto PR. PRODUCTION zápis: nie.

## Miera zlyhaní — ZMERANÉ (worker 2026-10-16, PR #864)

Tento turn dotaz na PROD **neopakoval**. Čísla sú z merania v PR #864 (draft, vetva `oprava-realvia-cisla`), SQL a výsledok:

```sql
SELECT count(*), sum(jobs_processed), sum(jobs_succeeded), sum(jobs_failed),
       sum(jobs_succeeded) + sum(jobs_failed) AS ok_plus_fail,
       round(100.0*sum(jobs_failed)/nullif(sum(jobs_processed),0), 2) AS fail_pct,
       min(recorded_at), max(recorded_at)
FROM realvia_metrics;
```

| metric_rows | processed | succeeded | failed | ok+fail | fail % | od | do |
|---|---|---|---|---|---|---|---|
| 1 077 | 1 543 | 256 | 1 287 | 1 543 | 83,41 | 2026-05-21 08:05 | 2026-10-14 18:35 |

Identita `256 + 1287 = 1543` (ZMERANÉ v tom istom výsledku): `jobs_processed` už zlyhania obsahuje. Staré „2 830 / 45 %“ bolo dvojité započítanie (`1543 + 1287`).

Rozpad, ktorý uviedol ten istý worker (ZMERANÉ v #864, tu neopakované):

| obdobie | dávok | processed | ok | fail | fail % |
|---|---|---|---|---|---|
| máj 2026 | 982 | 1 286 | 97 | 1 189 | 92,5 |
| jún – 2026-10-14 | 95 | 257 | 159 | 98 | 38,1 |

`1189 / 1287 = 92,4 %` zlyhaní padá do mája (ODVODENÉ z týchto súčtov, nie nový dotaz).

## Tri oblasti bez tabuľky na PROD

Víkendové zadanie P2 ich pomenúva: `events` / EventStore, outreach, navigačné oprávnenia. **Tento turn ich na PROD nepočítal** (žiadny `to_regclass`). Nie sú to tri zmerané mená z #864. Migrácie idú v samostatnom PR (needs-founder). Sem sa nezmiešavajú.

## Retry na `{"test": true}`

Onboarding curl v `docs/REALVIA_ONBOARDING.md` posiela `{test: true}`. To nie je advert ani delete. Worker to bral ako neznámy payload, po zlyhaní vrátil job do `pending`, a `replay_failed` vynuluje `retry_count` na 0. Slučka sa preto môže opakovať aj keď `max_retries = 3`.

Oprava v tomto PR:

- `planQueueFailure`: po `retry_count >= max_retries` ostáva `failed`, `next_retry_at` je null.
- Probe payload dostane stabilnú terminálnu hlášku.
- `enqueueReplayFailedQueueJobs` tú hlášku preskočí, takže replay ju nevráti do fronty.

## Čo ostáva

Príčina májových 1 189 zlyhaní nie je týmto PR dokázaná. Export z Realvie stále čaká na dodávateľa (text v #864).
