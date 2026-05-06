# Oncall Runbook — revolis-realvia-ingest

**Service owner:** Backend platform team  
**Page rotation:** PagerDuty schedule `revolis-platform-primary`  
**Last drilled:** *(fill in after first tabletop)*

> **Mindset.** Stay calm. Read this page top to bottom before typing commands. Most incidents here are recoverable with no data loss because raw snapshots are immutable and the outbox is a durable queue.

---

## 0. Common knobs (memorize these)

| Action | Command |
|---|---|
| See current run status | `kubectl logs -n revolis deploy/realvia-worker --tail=200 -f` |
| Pause ingestion | `kubectl scale -n revolis deploy/realvia-worker --replicas=0` |
| Resume ingestion | `kubectl scale -n revolis deploy/realvia-worker --replicas=1` |
| Pause publisher | `kubectl scale -n revolis deploy/realvia-publisher --replicas=0` |
| Open psql | `kubectl exec -n revolis -ti sts/postgres-0 -- psql -U revolis -d revolis_realvia` |
| Latest run row | `SELECT id, status, started_at, ended_at, listings_seen, parse_failures, error_message FROM ingestion_runs ORDER BY started_at DESC LIMIT 5;` |
| Outbox lag (oldest unpublished) | `SELECT now() - MIN(created_at) FROM outbox WHERE published_at IS NULL;` |
| Replay from a snapshot | `kubectl run -n revolis -ti --rm --restart=Never replay --image=ghcr.io/.../realvia-ingest:<sha> --command -- node dist/cli/replay.js --from 2026-05-01T00:00:00Z` |
| Feature flag (downstream consumers) | `kubectl edit configmap -n revolis revolis-flags` → set `smolko.realvia_live: "false"` |

**Customer escalation:**
- **Reality Smolko (p. Smolko):** *(phone, e-mail — doplniť)* — Notify within 30 min for any Sev-1.
- **Realvia (p. Seliga):** *(e-mail — doplniť)* — Notify only if cause is on their side.

---

## 1. Severity levels

| Sev | Definition | Examples | Notify |
|---|---|---|---|
| **Sev-1** | Customer impact ongoing; data correctness or security at risk. | Wrong listings shown, leak suspected, ingestion stopped > 1 h, schema drift causing wrong prices, DB corruption. | Page primary + secondary + eng manager + customer (within 30 min). Postmortem within 5 business days. |
| **Sev-2** | Degraded service, no immediate customer impact. | Ingestion failing intermittently (success rate 95–99 %), parse DLQ growing, NATS publisher lag > 10 min. | Page primary; e-mail eng manager; postmortem within 10 business days if recurring. |
| **Sev-3** | Symptom but service is meeting SLO. | Single failed run that recovered automatically, schema drift alert with no impact. | Ticket; investigate during business hours. |

*When in doubt, declare higher severity. It's cheap to downgrade.*

---

## 2. Incident response — first 10 minutes

1. Acknowledge the page. Mute additional alerts in the same group.
2. Open the Grafana board **Realvia Ingest — overview**. Confirm the symptom.
3. Open `#incidents-active` in Slack. Post: `IC: <your name>. Investigating <alert>.`
4. Read this runbook for the matching alert. Don't ad-lib.
5. Decide severity. Update the channel topic.
6. **If Sev-1: flip the feature flag to `false`.** Customer reverts to last known good cache. This is reversible — pre-authorize yourself to do this without further approval.
7. Notify customer if Sev-1 lasted > 15 minutes.

*Only after these six steps: start digging into root cause.*

---

## 3. Playbooks by alert

### 3.1 IngestionRunFailed — single run failed

**Symptom:** PagerDuty alert from `ingestion_runs_total{status="failed"} > 0` over 5 min window.

**Likely causes (in order of frequency):**
1. Realvia 5xx — network or vendor outage.
2. Auth credential expired or rotated.
3. Bug in normalizer after recent deploy.

**Diagnose:**
```sql
SELECT id, status, error_message, started_at
  FROM ingestion_runs
 WHERE status = 'failed'
 ORDER BY started_at DESC
 LIMIT 10;
```
- If `error_message` contains `RealviaHttpError 5xx` → §3.2.
- If `error_message` contains `RealviaParseError` → §3.4.
- If `error_message` contains `connection refused` / Postgres errors → §3.7.

**Resolve:** The runner retries every 15 min by design. If two consecutive runs fail, escalate to Sev-2. If more than four consecutive runs fail, escalate to Sev-1 and start §3.2.

---

### 3.2 RealviaUnreachable — vendor outage

**Symptom:** Circuit breaker opens; `realvia_request_duration_seconds{status="error"}` spikes.

**Diagnose:**
```bash
# Check from inside the cluster (same egress path the worker uses).
kubectl run -n revolis -ti --rm --restart=Never curltest --image=curlimages/curl -- \
  curl -i -m 10 https://dev.realvia.sk/export
```

**Resolve:**
- Confirm Realvia is actually down (try from your laptop; check their status page if any).
- **Do NOT loop-bomb their endpoint.** Circuit breaker is doing its job.
- If Realvia outage > 30 min, contact p. Seliga.
- Customer impact is bounded — they see data up to last successful run. Add a banner: *"Realvia upstream temporarily unavailable; data as of \<timestamp\>."*
- Once Realvia recovers, the next scheduled run pulls everything; price/status history is preserved correctly because we diff against our own state, not theirs.

**Do NOT manually flush or wipe local state. Wait for natural recovery.**

---

### 3.3 RealviaAuthFailed — credential issue

**Symptom:** `RealviaHttpError 401` or `403` in run failures.

**Diagnose:**
```bash
# Compare with what Vault has
vault kv get -field=api_key secret/revolis/realvia
```

**Resolve:**
1. Check if Realvia rotated the key. Common cause: scheduled rotation we forgot.
2. If yes, request new credentials from p. Seliga.
3. Update Vault. Roll the deployment:
   ```bash
   kubectl rollout restart -n revolis deploy/realvia-worker
   ```
4. Confirm next run succeeds.
5. Add a calendar reminder for 30 days before next rotation.

**If credentials look correct but Realvia rejects them:** do not log the credential, even partially. Capture only the response status and body.

---

### 3.4 SchemaDrift — Realvia changed something

**Symptom:** `schema_drift_events_total` increased; `parse_failures_total` may be increasing.

**Diagnose:**
```sql
SELECT raw_payload, error_message
  FROM parse_dlq
 WHERE resolved_at IS NULL
 ORDER BY created_at DESC
 LIMIT 5;
```
Pull the latest raw snapshot:
```bash
aws s3 cp s3://realvia-snapshots/<tenant>/realvia/<yyyy>/<mm>/<dd>/<hh>/<file>.json.gz - \
  | gunzip | jq '.[0]' | head -100
```

**Resolve:**
- **Additive field** (new field, no existing field renamed): widen the Zod schema in `src/vendors/realvia/schema.ts`. Open PR. No customer impact.
- **Breaking change** (renamed/removed field, especially `cena`): check impact on stored data. If prices were showing stale values → Sev-1. Flip flag, then patch.
- Always notify p. Seliga: did this change come with a notification we missed?
- Mark DLQ rows resolved after fix lands:
  ```sql
  UPDATE parse_dlq SET resolved_at = now() WHERE id IN (...);
  ```

---

### 3.5 ParseDlqGrowing — DLQ buildup

**Symptom:** `parse_failures_total` rate > 0 for > 30 min, or `parse_dlq` row count > 100 unresolved.

**Resolve:**
- If pattern is **uniform** → schema drift, see §3.4.
- If pattern is **heterogeneous** → likely a normalizer bug. Roll back:
  ```bash
  kubectl rollout undo -n revolis deploy/realvia-worker
  ```
  Then replay:
  ```bash
  npm run ingest -- --once --replay-from <bug_introduced_ts>
  ```
- Postmortem mandatory: how did the bug pass tests?

---

### 3.6 OutboxLagHigh — events not flowing to NATS

**Symptom:** `outbox_lag_seconds > 600`.

**Diagnose:**
```sql
SELECT count(*), MIN(created_at) FROM outbox WHERE published_at IS NULL;
```

**Resolve:**
- Most common: publisher pod crashed. `kubectl describe pod <name>`.
- NATS unreachable: `kubectl get pods -n nats`.
- Backlog drains automatically once publisher resumes (at-least-once delivery).
- **Do NOT delete outbox rows.** Downstream services will miss events.

---

### 3.7 PostgresUnavailable

**Symptom:** Worker logs show pg connection errors.

**Resolve:**
- Worker retries naturally. If Postgres down > 5 min, escalate to DB team.
- If primary failed over to replica, confirm `DATABASE_URL` resolves to new primary.
- If suspected data corruption: Sev-1, switch to PITR runbook (owned by DB team).

---

### 3.8 ListingCountAnomaly — sudden drop in listings

**Symptom:** `listings_total` drops by > 20 % between two runs.

> ⚠️ This is a high-signal alert. The `markRemoved` step is the riskiest piece of code in the service — assume malice when it fires unexpectedly.

**Resolve:**
1. **Pause the worker immediately:**
   ```bash
   kubectl scale -n revolis deploy/realvia-worker --replicas=0
   ```
2. Verify if `ingestion_runs.listings_seen` also dropped. If yes → Realvia returned fewer listings.
3. If Realvia genuinely returned fewer, contact p. Seliga before resuming.
4. If `listings_seen` was normal but our parse failures spiked → see §3.5.
5. Resume **only** after root cause confirmed.

---

### 3.9 DataLeakSuspected — security incident

**Stop reading this runbook. Open `SECURITY-INCIDENT-RUNBOOK.md` and call the security oncall.**

If you can't reach security oncall in 5 min:
1. Rotate all Realvia + DB + S3 + NATS credentials immediately.
2. Pause worker and publisher.
3. Snapshot Postgres + S3 bucket inventory for forensics (do not delete anything).
4. Page Reality Smolko and p. Seliga: **GDPR notification clock starts at 72 h from awareness.**

---

## 4. Replay procedure

```bash
# 1. Check what's available to replay
kubectl exec -n revolis -ti sts/postgres-0 -- psql -U revolis -d revolis_realvia \
  -c "SELECT storage_key, stored_at, listing_count FROM raw_snapshots ORDER BY stored_at DESC LIMIT 20;"

# 2. Pause live ingestion to avoid races
kubectl scale -n revolis deploy/realvia-worker --replicas=0

# 3. Run replay
kubectl run -n revolis -ti --rm --restart=Never replay \
  --image=ghcr.io/.../realvia-ingest:<sha_with_fix> \
  --command -- node dist/cli/replay.js --from 2026-05-01T00:00:00Z

# 4. Spot-check after replay
kubectl exec -n revolis -ti sts/postgres-0 -- psql -U revolis -d revolis_realvia \
  -c "SELECT count(*), max(updated_at) FROM listings;"

# 5. Resume live ingestion
kubectl scale -n revolis deploy/realvia-worker --replicas=1
```

*Replay is idempotent — the diff engine produces no rows when nothing changed, and upsert is safe to re-run.*

---

## 5. Key rotation (planned, not incident)

Quarterly checklist:
1. Notify p. Seliga we want to rotate.
2. Receive new key.
3. Add to Vault: `vault kv put secret/revolis/realvia api_key=<new>`.
4. Roll worker: `kubectl rollout restart -n revolis deploy/realvia-worker`.
5. Confirm a run succeeds.
6. Tell p. Seliga the old key can be invalidated.
7. Remove old key from Vault after 7 days.

---

## 6. Post-incident review template

```markdown
# Incident <YYYY-MM-DD> <short title>
- Severity: <1|2|3>
- Detected at: <ts>  Resolved at: <ts>  Duration: <hh:mm>
- Customer impact: <listings affected, time visible to customers, GDPR implication?>
- Detection: who/what alerted us; could we have detected it earlier?

## Timeline
- HH:MM  …
- HH:MM  …

## Root cause
<5 whys, not who>

## What went well

## What didn't

## Action items
- [ ] owner — task — due date
```
