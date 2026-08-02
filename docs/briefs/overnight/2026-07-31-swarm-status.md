# Swarm 4-vlny — stav aktivácie

**Aktivované:** 2026-07-31 22:26 UTC+2  
**Playbook:** `docs/briefs/overnight/2026-07-31-swarm-4-vlny.md`  
**Základ (štart):** `main` @ `c82c860` (feat billing #335)  
**Retry coordinator:** 2026-07-31 ~23:03 UTC+2 (predchádzajúci beh: ENOTFOUND)  
**Wave 2 retry:** 2026-07-31 ~23:37 UTC+2 (Cursor subagent, ENOTFOUND obídené)  
**Wave 3 start:** 2026-08-02 ~15:00 UTC+2 (Cursor subagent)

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

**`main` po Vlne 2:** `b11addb78` — obsahuje #341 (status doc + #340 guardian)

**CI:** Všetky tri PR zelené (`Lint, test, build` + `Memory Engine checks`). PR #340 vyžadoval rebase na #339 + `brain:ingest` sync commit `84c853215`.

**Lokálna verifikácia:** guardian tests 22/22 pass, credit-rates tests 2/2 pass.

## Vlna 3 — v PR (3A)

| PR | Branch | Titulok | Stav | URL |
|---|---|---|---|---|
| **#342** | `swarm/w3a-system-agency` | refactor(usage): SYSTEM_USAGE_AGENCY_ID oddelené od Smolka (Wave 3A) | **OPEN** | https://github.com/onlinovosk-bit/RealitkaAI/pull/342 |

**Zmeny 3A:**
- `SYSTEM_USAGE_AGENCY_ID` default → `00000000-0000-0000-0000-000000000001` (Revolis System), nie Smolko UUID
- Migrácia `20260731220000_system_usage_agency.sql` (founder apply, bez prod UPDATE)
- Audit SELECT: `apps/crm/docs/ops/system-usage-agency-audit.sql`
- Operator dashboard vylučuje system agency z metrik

**Lokálna verifikácia:** usage-metrics tests 2/2, operator tests 9/9, `npm run build` OK.

## Ruflo infra

| Položka | Hodnota |
|---|---|
| MCP swarm ID | `swarm-1785529408671-j4vxvt` |
| CLI swarm ID | `swarm-ms9e7sb0` |
| Topológia | hierarchical, max 8 agentov |
| Session | `overnight-4-vlny-2026-07-31` |
| Hooks | `.claude/settings.json` + 9 hookov (standard template) |
| Write-probe | commit `b1a999c86` na `test/write-probe-swarm4vlny` |

## Agenti

| Agent ID | Branch | Vlna | Vlastnené cesty | Stav |
|---|---|---|---|---|
| `w1a-simireal-optout` | `swarm/w1a-simireal-optout` | 1A | automation/n8n, call-list | **done** (#336) |
| `w1b-identity-fix` | `swarm/w1b-identity-fix` | 1B | brain/identity/ | **done** (#337) |
| `w1c-valuation-estimates` | `swarm/w1c-valuation-estimates` | 1C | migrations, estimate route | **done** (#338) |
| `w2a-credit-rates` | `swarm/w2a-credit-rates` | 2A | apps/crm/src/lib/credits/ | **done** (#339) |
| `w2b-guardian-nophone` | `swarm/w2b-guardian-nophone` | 2B | apps/crm/src/lib/guardian/ | **done** (#340) |
| `w3a-system-agency` | `swarm/w3a-system-agency` | 3A | usage-metrics + call sites | **in PR** (#342) |

## Tasky

| Task ID | Vlna | Stav |
|---|---|---|
| `task-1785529541571-0g159y` | 1A | **done** (#336 merged) |
| `task-1785529540815-ebh73a` | 1B | **done** (#337 merged) |
| `task-1785529541208-n6bn7t` | 1C | **done** (#338 merged) |
| `task-1785529545862-9ilte6` | 2A | **done** (#339 merged) |
| `task-1785529545852-qcr48p` | 2B | **done** (#340 merged) |
| `task-1785529546512-52gc2j` | 3A | **in PR** (#342) |
| `task-1785529546987-4kxrjs` | 4A+4B | blocked (DAG — čaká merge Vlny 3) |

## Vlna 4

Blocked na merge Vlny 3 (#342). Po merge spusti 4A (regresie) + 4B (demo readiness).

## Hive-mind

Hive ID `hive-1785529619368` — historický bloker: Claude Code CLI not in PATH. Vlny 1–2 doručené cez PR #336–#340. Vlna 3 cez PR #342.

## Ďalší krok

1. Merge **#342** po zelenom CI.
2. Spusti **Vlnu 4** (read-only verifikácia).
3. Ráno: `docs/briefs/overnight/2026-07-31-swarm-verifikacia.md`.

## Pravidlá

- Žiadny deploy, prod migrácia, prod DELETE, email send.
- Test agency only — nie Smolkov owner účet.
- Jeden agent = jedna branch = vlastnené adresáre.
