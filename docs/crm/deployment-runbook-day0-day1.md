# Deployment Runbook (Day 0 + 24h Monitoring)

## Day 0: deployment commands (exact order)

Run from `apps/crm`:

1) Database sync
```bash
npx supabase migration list
npx supabase db push --yes
```

2) Build gate
```bash
npm run build
```

3) Start app (or deploy pipeline equivalent)
```bash
npm run dev
```

4) Smoke checks (minimum)
```bash
curl.exe -s -o NUL -w "login:%{http_code}\n" http://localhost:3000/login
curl.exe -s -o NUL -w "leads:%{http_code}\n" http://localhost:3000/leads
curl.exe -s -o NUL -w "pipeline:%{http_code}\n" http://localhost:3000/pipeline
curl.exe -s -o NUL -w "properties:%{http_code}\n" http://localhost:3000/properties
```

5) Assistant health + rollback alias
```powershell
$json='{"question":"Ahoj"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/leads/<leadId>/assistant" -Method POST -ContentType "application/json" -Body $json
Invoke-RestMethod -Uri "http://localhost:3000/api/leads/<leadId>/sofia" -Method POST -ContentType "application/json" -Body $json
```

6) Billing sanity
```bash
curl.exe -i -s -X POST http://localhost:3000/api/billing/portal
curl.exe -i -s -X POST http://localhost:3000/api/billing/webhook -H "Content-Type: application/json" -d "{}"
```

## ai_insight backfill trigger (post-deploy)

Batch trigger via existing workflow (PATCH -> rescore):

```powershell
$rows = npx supabase db query --linked --output csv "select id from public.leads where ai_insight is null limit 120;"
$ids = $rows | Select-Object -Skip 2 | Where-Object { $_ -and $_.Trim() -ne '' }
foreach($id in $ids){
  $body = '{"lastContact":"AI backfill trigger"}'
  Invoke-RestMethod -Uri "http://localhost:3000/api/leads/$id" -Method PATCH -ContentType "application/json" -Body $body | Out-Null
}
```

Verify:
```bash
npx supabase db query --linked "select count(*) filter (where ai_insight is not null) as ai_insight_filled, count(*) as total from public.leads;"
```

## 24h post-launch monitoring window

Check at T+15m, T+1h, T+4h, T+12h, T+24h:

1) API health
- 5xx error rate
- top failing endpoints

2) Assistant quality/performance
- `/assistant` p95 latency
- error/fallback ratio
- successful response ratio

3) Billing pipeline
- webhook failures
- checkout failures
- portal access failures

4) Data integrity
- lead updates persisted
- pipeline moves persisted
- `ai_insight` fill trend rising

5) Security
- no cross-tenant data exposure reports
- no service-role leakage in client paths

## Rollback (if severe incident)

1) Keep alias `/sofia` active (already maintained).
2) Roll back app release to previous stable version.
3) Keep DB additive changes (`ai_insight`) in place (safe, backward compatible).
4) Re-enable write path to legacy behavior only if needed.
