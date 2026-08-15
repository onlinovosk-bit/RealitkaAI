# Seed evidence — paused test campaigns (RK A / RK B)

**Dátum:** 2026-08-15
**Commit:** `69dc7fdcb` (`fix(acquisition): bump Google Ads API v18 to v25` #410)
**Príkaz:** `npx tsx scripts/seed-test-campaigns.ts` (cwd `C:\RealitkaAI`, script z `origin/main`)
**MCC guard:** `GOOGLE_ADS_LOGIN_CUSTOMER_ID` = `7024414113` (test MCC only)

## Výstup (bez secrets)

```text
OK test MCC 7024414113. Seeding 2 accounts (dryRun=false).
SKIP RKA-test-byty on 3726370609: already exists (campaign id 24134657673)
CREATED RKB-test-domy on 2272781649: campaign=24134894838 adGroup=198541378959 keywords=4 rsa=1 (all PAUSED)
```

## Verdikt

**PASS (seed).** API v25 žije. RK A kampaň už existovala (idempotent SKIP). RK B kampaň vytvorená, všetko PAUSED.

| Účet | customer_id | Kampaň | Výsledok |
|---|---|---|---|
| RK A | 3726370609 | RKA-test-byty | SKIP already exists `24134657673` |
| RK B | 2272781649 | RKB-test-domy | CREATED campaign `24134894838`, adGroup `198541378959`, 4 keywords, 1 RSA |

Žiadny write mimo whitelist test účtov. Žiadny ENABLED serving.