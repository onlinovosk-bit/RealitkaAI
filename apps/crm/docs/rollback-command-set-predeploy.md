# Rollback Command Set (Pre-Deploy Incident)

Backup points created:

- `backup/pre-deploy-web1-20260414-094513`
- `backup/pre-deploy-web2-20260414-094513`
- `backup-pre-deploy-web1-20260414-094513`
- `backup-pre-deploy-web2-20260414-094513`

Current backup commit:

- `89848f4e124c2dddb34ec292e42a06490417b40b`

## A) Git rollback to backup point

Run from repo root `C:\RealitkaAI`:

```powershell
git checkout main
git pull
git checkout -b "rollback/from-backup-20260414-094513"
git reset --hard "backup-pre-deploy-web1-20260414-094513"
git status
```

If rollback branch looks correct:

```powershell
git push -u origin "rollback/from-backup-20260414-094513"
```

Then open PR from `rollback/from-backup-20260414-094513` to `main`.

## B) Fast Vercel rollback (redeploy previous stable)

Run from `C:\RealitkaAI\apps\crm`:

```powershell
npx vercel ls --prod
```

Pick the last known stable deployment URL/id, then:

```powershell
npx vercel rollback <deployment-url-or-id> --yes
```

Verify:

```powershell
Invoke-RestMethod -Uri "https://app.revolis.ai/api/system/smoke" -Method GET
Invoke-RestMethod -Uri "https://app.revolis.ai/api/billing/plan" -Method GET
```

## C) Emergency freeze and comms template

Use this immediately after triggering rollback:

```text
[INCIDENT UPDATE]
Status: ROLLBACK IN PROGRESS
Scope: Production dashboard/landing regression
Action: Reverting to backup tag backup-pre-deploy-web1-20260414-094513
ETA: 10-20 min
Next update: +10 min
```

