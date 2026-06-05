# Production smoke — Smolko triáž + /leads UI + Vercel deploy

**Dátum:** 2026-06-05  
**Session:** AI production reliability (nadväzuje na `AI-HANDOFF-2026-06-04.md`)

---

## Súhrn

| Oblasť | Stav | Dôkaz |
|--------|------|-------|
| Vercel Production deploy #107 | PASS | `dpl_GLs4DBR6Sb4bJbUyYCheR6yw5AXb` Ready, alias `app.revolis.ai`, 5s po merge fefef7f |
| DB Smolko triáž | PASS | leads_total=439, status_imported=0, untriaged_open=0 |
| Infra smoke (no auth) | PASS | /login 200, /status 200, /leads 307, /forecasting 307 |
| Cron no Bearer | PASS | 401 |
| Cron fake Bearer | PASS | 401 + {"error":"Unauthorized"} |
| PR #105 CI | PASS | workflow #26947324100, success |
| **PR #105 merge bezpečnosť** | **BLOCKER** | 23 files / 1020 deletions (stale base) |
| Auth UI smoke | NEPREBEHOL | user v prehliadači |
| Vercel env overenie | NEPREBEHOL | user vo Vercel dashboard |

## Vercel Production

`dpl_GLs4DBR6Sb4bJbUyYCheR6yw5AXb` · target=production · status=● Ready  
created 2026-06-04 14:38:23 CEST (= +5s po merge fefef7f, 12:38:18Z)  
aliases: app.revolis.ai (primary), realitka-ai.vercel.app, ...

## DB resolve (apps/crm/.env.local service role)

TRIAGE_AGENCY_ID=11111111-1111-1111-1111-111111111111  
leads_total=439  status_imported=0  untriaged_open=0

## PR #105 — STALE BRANCH (STOP na merge)

Branch vytvorený 10:53:31Z. PR #107 mergnutý 12:38:18Z (1h 45m neskôr).  
Diff main..branch = 23 files, +140/-1020. Revertuje:
- lead-display-score.ts (PR #107 helper)
- LeadsHotStrip.tsx (false-urgency späť)
- lead-triage-batch.ts (stará heuristika)
- 20260604120000_leads_imported_to_novy.sql (migrácia)
- resolve-smolko-agency-id.ts (P0 diagnostika)
- všetky triáž testy a handoff docs

Akcia: rebase (A) / cherry-pick (B) / GitHub UI (C) — user rozhodne.

## Uzávierka

P0 dátová + kódová vrstva PASS. Produkcia servíruje fefef7f. Maklér uvidí
korektné dáta hneď po UI smoke. Zostáva: user UI smoke + Vercel env + secret rotácia
+ PR #105 rebase.  Aktualizácie memory (odporúčané — urobím po tvojom PASS, alebo rovno teraz ak dáš súhlas)
memory/open-tasks.md — close out P0/P1:

 Vercel Production deploy #107 Ready (alias app.revolis.ai)
 DB Smolko: 439 leadov, untriaged_open=0
 Infra smoke: cron 401, login 200
 Smolko UI smoke (user v prehliadači) ← blocker
 CRON_SECRET rotácia na Vercel (user)
 PR #105 rebase (user rozhodne stratégiu)
 Cron sanity s novým secretom (po rotácii)
memory/decisions.md — pridať:

[2026-06-05] PR #105 vetva fix/forecasting-remove-demo-risk-strip je stale (vytvorená 1h45m pred PR #107 merge). CI zelený na starom base, ale git diff main..branch ukazuje 23 files / 1020 deletions → blokovaný merge. L99: rebase pred merge.
memory/session-summary.md — pridať session 2026-06-05 s P0 PASS dôkazmi a PR #105 BLOCKER.

Tak, máš to celé v ruke. P0 dáta a kód sú PASS, ja blokujem PR #105 merge kým nedá rebase. Tri veci, ktoré potrebujem od teba: (1) Smolko UI smoke (3 min, najkritickejšie), (2) Vercel env + CRON_SECRET rotácia, (3) rebase stratégiu pre #105 + prípadne GH_TOKEN.

Ak chceš, môžem ti rovno navrhnúť konkrétny git rebase príkaz na PR #105 — alebo to môžeš urobiť ty. Čo preferuješ?

