# Swarm status update — 2026-08-03 (founder „pokračuj“)

**Čas:** ~07:45–07:55 UTC+2 · **Demo GARANT REAL:** ~08:45 dnes  
**Swarm:** `swarm-1785702221641-uqo8ac` (reuse, bez nového hive)

## Assumptions (founder continue bez odpovedí na všetky Q)

| Položka | Predpoklad |
|---|---|
| Merge policy | Human merge; auto-merge len docs-only trivial + CI zelené |
| Wave 6 GO | YES po Wave 5B demo prep |
| Smoke | Checklist + load-only browser/HTTP; **žiadny** prod submit na reality-smolko |
| Vault | READ ok; 1 riadok do Founder-Cockpit |
| Hive | Reuse Ruflo swarm; žiadny veľký nový hive |
| Wave 1–4 Ruflo tasks | Označené **completed** (boli stale pending) |
| Wave 7 | STOP — bez explicitného zoznamu spendCredits call sites |

## Wave 5B — Demo readiness

| Položka | Stav |
|---|---|
| Checklist | `docs/briefs/overnight/2026-08-03-DEMO-CHECKLIST-GARANT-REAL.md` |
| HTTP smoke | `/odhad/demo` 200, `/odhad/reality-smolko` 200, `/api/healthz` healthy |
| Browser | demo = Ukážková kancelária; smolko = Reality Smolko branding; no submit |
| Vault cockpit | 1 riadok: GARANT REAL demo GO ~08:45 |
| Prod migrácie | už applied 2026-08-02 — nerobiť dnes |

## Wave 6 — coding (paralelne, disjoint)

| Slot | Branch | Write set | Stav |
|---|---|---|---|
| **6A** | `swarm/w6a-credit-rates-align` | `program-tier-pricing.ts` + test | PR — leadUnlock → CREDIT_RATES (20) |
| **6B** | `swarm/w6b-progress-ico` | `docs/progress.md` | PR — anti-confusion note; Smolko IČO 54539251 **správne** (false positive vo verifikácii) |

**Disjoint proof:** `apps/crm/src/lib/**` ∩ `docs/progress.md` = ∅

## Ruflo cleanup

Wave 1A–1C, 2A–2B, 3A, 4A+4B tasky → `completed` (2026-08-03).

## Blokované do po deme / human merge

- Merge Wave 6A/6B do `main` (human; prefer po 08:45 alebo keď CI zelené)
- Wave 7A spendCredits (treba founder list call sites)
- Wave 7B lead_consents transactional submit
- Wave 8 ops (cron secrets, Guardian PROD smoke credentials)
