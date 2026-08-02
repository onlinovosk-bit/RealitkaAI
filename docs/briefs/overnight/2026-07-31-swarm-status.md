# Swarm 4-vlny — stav aktivácie

**Aktivované:** 2026-07-31 22:26 UTC+2  
**Playbook:** `docs/briefs/overnight/2026-07-31-swarm-4-vlny.md`  
**Základ (štart):** `main` @ `c82c860` (feat billing #335)  
**Retry coordinator:** 2026-07-31 ~23:03 UTC+2 (predchádzajúci beh: ENOTFOUND)  
**Wave 2 retry:** 2026-07-31 ~23:37 UTC+2 (Cursor subagent, ENOTFOUND obídené)  
**Wave 3:** 2026-08-02 ~15:00 UTC+2 — merged #343  
**Wave 4:** 2026-08-02 ~15:25 UTC+2 — verifikácia dokončená (#345)

## Vlna 1 — dokončená (merge)

| PR | Branch | Titulok | Stav | Merged (UTC) | URL |
|---|---|---|---|---|---|
| **#336** | `swarm/w1a-simireal-optout` | fix(sales): Simi Real opt-out | **MERGED** | 2026-07-31T20:56:03Z | https://github.com/onlinovosk-bit/RealitkaAI/pull/336 |
| **#337** | `swarm/w1b-identity-fix` | fix(brain): correct ONLINOVO IČO in COMPANY.md | **MERGED** | 2026-07-31T20:56:21Z | https://github.com/onlinovosk-bit/RealitkaAI/pull/337 |
| **#338** | `swarm/w1c-valuation-estimates` | feat(valuation): persist estimate previews to valuation_estimates | **MERGED** | 2026-07-31T20:56:32Z | https://github.com/onlinovosk-bit/RealitkaAI/pull/338 |

**`main` po Vlne 1:** `cf1b4ef4e`

## Vlna 2 — dokončená (merge)

| PR | Branch | Titulok | Stav | Merged (UTC) | URL |
|---|---|---|---|---|---|
| **#339** | `swarm/w2a-credit-rates` | feat(credits): credit-rates sadzobník LEAD_UNLOCK=20 (Wave 2A) | **MERGED** | 2026-07-31T21:42:57Z | https://github.com/onlinovosk-bit/RealitkaAI/pull/339 |
| **#340** | `swarm/w2b-guardian-nophone` | fix(guardian): NO_PHONE v1.2 grace window (Wave 2B) | **MERGED** | 2026-07-31T22:06:17Z | https://github.com/onlinovosk-bit/RealitkaAI/pull/340 |
| **#341** | `docs/overnight-w1-retry-status` | docs(overnight): Wave 1 retry status + swarm-status.md | **MERGED** | 2026-07-31T22:06:35Z | https://github.com/onlinovosk-bit/RealitkaAI/pull/341 |

**`main` po Vlne 2:** `b11addb78`

## Vlna 3 — dokončená (merge)

| PR | Branch | Titulok | Stav | Merged (UTC) | URL |
|---|---|---|---|---|---|
| **#343** | `swarm/w3a-system-agency` | refactor(usage): SYSTEM_USAGE_AGENCY_ID oddelené od Smolka (Wave 3A) | **MERGED** | 2026-08-02T13:20:11Z | https://github.com/onlinovosk-bit/RealitkaAI/pull/343 |
| **#344** | `docs/swarm-w3-status-update` | docs(overnight): Wave 3 merged status | **MERGED** | 2026-08-02 | https://github.com/onlinovosk-bit/RealitkaAI/pull/344 |

**`main` po Vlne 3:** `fa58a367d`

**Zmeny 3A:**
- `SYSTEM_USAGE_AGENCY_ID` default → `00000000-0000-0000-0000-000000000001` (Revolis System)
- Migrácia `20260731220000_system_usage_agency.sql` (founder apply, bez prod UPDATE)
- Audit SELECT: `apps/crm/docs/ops/system-usage-agency-audit.sql`
- Operator dashboard vylučuje system agency

**CI:** zelené (`Lint, test, build` + `Memory Engine checks`). Brain index sync commit `2ddaff721`.

## Vlna 4 — dokončená (verifikácia)

| Výstup | Stav | URL / cesta |
|---|---|---|
| Verifikácia 4A+4B | **DONE** | `docs/briefs/overnight/2026-07-31-swarm-verifikacia.md` |
| PR docs (W4) | **OPEN** | https://github.com/onlinovosk-bit/RealitkaAI/pull/345 |

**Verdikt:** PASS — kód bezpečný na deploy. Demo GO s podmienkou (2 migrácie + audit SQL founder).

**Lokálna verifikácia:** 56 testov PASS (guardian, credit-rates, usage-metrics, persist-estimate, operator, valuation-widget verification).

## Ruflo infra

| Položka | Hodnota |
|---|---|
| MCP swarm ID | `swarm-1785529408671-j4vxvt` |
| CLI swarm ID | `swarm-ms9e7sb0` |
| Session | `overnight-4-vlny-2026-07-31` |

## Agenti

| Agent ID | Vlna | Stav |
|---|---|---|
| `w1a`–`w1c` | 1 | **done** (#336–#338) |
| `w2a`–`w2b` | 2 | **done** (#339–#340) |
| `w3a-system-agency` | 3A | **done** (#343) |
| `w4a`–`w4b` | 4 | **done** (verifikácia) |

## Tasky

| Task ID | Vlna | Stav |
|---|---|---|
| `task-1785529546512-52gc2j` | 3A | **done** (#343 merged) |
| `task-1785529546987-4kxrjs` | 4A+4B | **done** (verifikacia.md) |

## Ďalší krok (founder)

1. Prečítať **`docs/briefs/overnight/2026-07-31-swarm-verifikacia.md`** — sekcia Demo blockers.
2. Apply migrácie: `20260731210000_valuation_estimates.sql` + `20260731220000_system_usage_agency.sql`.
3. Spustiť audit: `apps/crm/docs/ops/system-usage-agency-audit.sql` (read-only, priložiť výstup).
4. Widget smoke na prod: `https://app.revolis.ai/odhad/demo` + `https://app.revolis.ai/odhad/reality-smolko` (nie `www.revolis.ai` — 404). Demo sandbox submit **PASS** (2026-08-02).
5. Demo GARANT REAL pondelok 8:45.

## Pravidlá

- Žiadny deploy, prod migrácia, prod DELETE, email send (founder robí migráciu manuálne).
- Test agency only — nie Smolkov owner účet.
