---
id: MSG-20260916-010-executor-rls-onboarding-session
type: result
contract: REVOLIS_AGENT_CONTRACT_v0.1
status: open
in_reply_to: MSG-20260916-001-handoff-rls-onboarding-session
role: executor
agent: "Claude Opus 5 (claude-opus-5) ako Claude Code subagent (general-purpose), rola executor; lokálny git worktree, bez siete"
created_at: 2026-09-16T20:30:00Z
base:
  repo: onlinovosk-bit/RealitkaAI
  ref: 2ca212ef40531251b33bd5dede219b5765e90285
resolution:
  task: .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md
  objective: "Zistiť, čo z Path B pre onboarding_sessions je naozaj v repe pri base.ref, oddeliť to od nedokázateľného stavu produkcie a pomenovať jeden gated krok, ktorý founderovi umožní uzavrieť P0."
  context_read:
    - docs/architecture/REVOLIS_AGENT_CONTRACT_v0.1.md
    - .ai/bus/AGENT_PROTOCOL.md
    - .ai/bus/inbox/MSG-20260904-rls-anon-nejasne.md
    - docs/reports/2026-09-04-rls-onboarding-session-api.md
    - docs/audit/2026-09-04-rls-anon-policies.md
  prior_decisions:
    - memory/decisions.md   # grep na onboarding|rls|anon|534|Path B: žiadny záznam k tomuto tasku (E17)
  expected_output: .ai/bus/outbox/MSG-20260916-010-executor-rls-onboarding-session.md
context_requests: []
inputs_read:
  # handoff + refs
  - .ai/bus/inbox/MSG-20260916-001-handoff-rls-onboarding-session.md
  - docs/architecture/REVOLIS_AGENT_CONTRACT_v0.1.md
  - .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md
  - .ai/bus/AGENT_PROTOCOL.md
  - .ai/bus/inbox/MSG-20260904-rls-anon-nejasne.md
  - docs/reports/2026-09-04-rls-onboarding-session-api.md
  - docs/audit/2026-09-04-rls-anon-policies.md
  - memory/decisions.md                     # iba grep
  # súbory citované v refs / repo pri base.ref
  - apps/crm/src/app/api/onboarding/session/route.ts
  - apps/crm/src/lib/onboarding/session-api.ts
  - apps/crm/supabase/migrations/20260904220000_drop_onboarding_sessions_anon_all.sql
  - apps/crm/supabase/migrations/20260904150000_drop_open_anon_policies.sql   # r. 108-113
  - docs/runbooks/rollback-onboarding-sessions-anon.md
  - docs/runbooks/rollback-anon-policies.md                                   # iba grep
  - docs/reports/2026-09-04-rls-anon-apply.md
  - apps/crm/tests/verification/onboarding-sessions-api.verification.test.ts
  - apps/crm/src/app/api/onboarding/session/__tests__/route.test.ts           # iba grep/počet it()
  - apps/crm/src/app/onboarding/useOnboarding.ts                              # výrez
  - apps/crm/src/app/onboarding/OnboardingClient.tsx                          # výrez
  - apps/crm/src/app/test-db/TestDbClient.tsx                                 # iba grep
  - apps/crm/src/lib/rate-limit.ts                                            # hlavička
  - apps/crm/docs/audit/rls-schema-parity-matrix.json                         # výrez
  - apps/crm/docs/audit/rls-schema-parity-matrix.md                           # hlavička
  - output/overnight/2026-09-05T2308-CEST-research/lanes/A/report.md          # výrez
  - memory/session-summary.md                                                 # grep + git show 8acdfe1b
  - .github/workflows/                                                        # iba grep
  - "git metadata: log/show/merge-base nad lokálnym repom"
items:
  # ---------------------------------------------------------------- EVIDENCE
  - id: E1
    kind: EVIDENCE
    file: ".ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md@2ca212ef:3-4"
    result: "**Status:** PR open (Path B) — migration PREPARED, NOT applied / **PR:** https://github.com/onlinovosk-bit/RealitkaAI/pull/534"
  - id: E2
    kind: EVIDENCE
    cmd: "git show -s --format='%H %ad %an %s%n%P' 3aed4fcf && git merge-base --is-ancestor 3aed4fcf 2ca212ef && echo ANCESTOR"
    result: "3aed4fcf74db4c157360a3539d4fe248a5c1017e Sat Sep 5 21:59:00 2026 +0200 onlinovosk-bit Merge pull request #534 from onlinovosk-bit/security/rls-onboarding-session / parents 2a851a6c 8acdfe1b / ANCESTOR"
  - id: E3
    kind: EVIDENCE
    cmd: "for p in apps/crm/src/app/api/onboarding/session/route.ts apps/crm/src/lib/onboarding/session-api.ts apps/crm/supabase/migrations/20260904220000_drop_onboarding_sessions_anon_all.sql docs/runbooks/rollback-onboarding-sessions-anon.md apps/crm/src/app/api/onboarding/session/__tests__/route.test.ts apps/crm/tests/verification/onboarding-sessions-api.verification.test.ts; do git cat-file -e 2ca212ef:$p && echo \"$p EXISTS\"; done"
    result: "všetkých 6 ciest: EXISTS"
  - id: E4
    kind: EVIDENCE
    cmd: "git diff 3aed4fcf 2ca212ef --stat -- apps/crm/src/app/api/onboarding apps/crm/src/lib/onboarding apps/crm/src/app/onboarding apps/crm/src/app/test-db apps/crm/supabase/migrations/20260904220000_drop_onboarding_sessions_anon_all.sql docs/runbooks/rollback-onboarding-sessions-anon.md apps/crm/tests/verification/onboarding-sessions-api.verification.test.ts"
    result: "apps/crm/src/app/api/onboarding/session/route.ts | 2 ++  (1 file changed, 2 insertions) — z cf360461 (#535): importy validateBody + incrementUsageMetric"
  - id: E5
    kind: EVIDENCE
    cmd: "git grep -n 'onboarding_sessions' 2ca212ef -- apps/crm/src"
    result: "zásahy iba v api/onboarding/session/route.ts:63,135 (service role), __tests__/route.test.ts:95,118 a lib/onboarding/session-api.ts:2 (komentár); useOnboarding.ts / OnboardingClient.tsx / TestDbClient.tsx importujú getOnboardingSession|upsertOnboardingSession z @/lib/onboarding/session-api"
  - id: E6
    kind: EVIDENCE
    file: "apps/crm/src/app/api/onboarding/session/route.ts@2ca212ef:57-66,129-146,163-166"
    result: "createServiceRoleClient(); .from(\"onboarding_sessions\").select(\"session_id, step, form_data, updated_at\").eq(\"session_id\", sessionId).maybeSingle() / .upsert({...}, { onConflict: \"session_id\" }) / export async function PUT() { ... status: 405 }"
  - id: E7
    kind: EVIDENCE
    file: "apps/crm/supabase/migrations/20260904220000_drop_onboarding_sessions_anon_all.sql@2ca212ef:2,17-18"
    result: "-- PREPARED ONLY — do NOT apply from Cursor / agent. / IF to_regclass('public.onboarding_sessions') IS NOT NULL THEN DROP POLICY IF EXISTS \"Allow anon access\" ON public.onboarding_sessions;"
  - id: E8
    kind: EVIDENCE
    file: "apps/crm/tests/verification/onboarding-sessions-api.verification.test.ts@2ca212ef:18"
    result: "expect(sql).toMatch(/PREPARED ONLY|do NOT apply/i);"
  - id: E9
    kind: EVIDENCE
    file: "docs/reports/2026-09-04-rls-anon-apply.md@2ca212ef:21,44-45"
    result: "| onboarding_sessions | Allow anon access (ALL) | Zámerne nedropnuté — TASK-RLS-ONBOARDING-SESSION | / Nezávislé overenie z produkcie: v celej `public` schéme ostáva **jediná** otvorená anon politika — `onboarding_sessions` / `Allow anon access`."
  - id: E10
    kind: EVIDENCE
    file: "docs/reports/2026-09-04-rls-onboarding-session-api.md@2ca212ef:6,36-37,55"
    result: "**Production:** migration **PREPARED, NOT applied** / - **Migration not applied to production** / - **PR not merged** / - [ ] Founder applies migration after GO"
  - id: E11
    kind: EVIDENCE
    cmd: "git grep -n -E '20260904220000|Allow anon access|drop_onboarding_sessions' 2ca212ef   # mimo samotnej migrácie, runbooku, testu, karty, reportu a auditu"
    result: "iba MSG-20260904-rls-anon-nejasne.md, 20260904150000_drop_open_anon_policies.sql:111-112 (deferred), docs/prompts/2026-09-04-brief18-konsolidovana-vlna.md, docs/reports/2026-09-04-rls-anon-apply.md (stav pred Path B), docs/reports/2026-09-04-rls-anon-conscious-deny.md, docs/runbooks/rollback-anon-policies.md:85, output/overnight/2026-09-05T2308-CEST-research/* (zoznam súborov). Žiadny záznam o aplikovaní 20260904220000 do produkcie."
  - id: E12
    kind: EVIDENCE
    cmd: "git grep -n -E 'db push|migration up|apply_migration|supabase link|db reset' 2ca212ef -- .github/"
    result: ".github/workflows/nightly-playwright.yml:50: run: supabase db reset / .github/workflows/saas-grade-pipeline.yml:131: run: supabase db reset  (lokálna test DB s allowlist guardom r. 125-127; žiadny krok, ktorý by aplikoval migrácie do produkcie)"
  - id: E13
    kind: EVIDENCE
    cmd: "git merge-base --is-ancestor 9235643b 3aed4fcf^2 && echo in-PR-branch; git merge-base --is-ancestor 9235643b 3aed4fcf^1 || echo not-in-first-parent; git show --stat 9235643b | grep -E 'rollback-onboarding|20260904220000'"
    result: "in-PR-branch / not-in-first-parent / docs/runbooks/rollback-onboarding-sessions-anon.md | 49 ++++++ / ...904220000_drop_onboarding_sessions_anon_all.sql | 22 +++"
  - id: E14
    kind: EVIDENCE
    file: "docs/runbooks/rollback-onboarding-sessions-anon.md@2ca212ef:23-28"
    result: "CREATE POLICY \"Allow anon access\" ON public.onboarding_sessions FOR ALL TO anon USING (true) WITH CHECK (true);"
  - id: E15
    kind: EVIDENCE
    cmd: "ls node_modules apps/crm/node_modules"
    result: "ls: cannot access 'node_modules': No such file or directory / ls: cannot access 'apps/crm/node_modules': No such file or directory"
  - id: E16
    kind: EVIDENCE
    cmd: "git grep -c 'it(' 2ca212ef -- apps/crm/src/app/api/onboarding/session/__tests__/route.test.ts apps/crm/tests/verification/onboarding-sessions-api.verification.test.ts; git show 2ca212ef:docs/reports/2026-09-04-rls-onboarding-session-api.md | grep -n 'passed'"
    result: "route.test.ts:8 / onboarding-sessions-api.verification.test.ts:4 / report r. 64-65: 'Test Files  2 passed (2)' 'Tests       11 passed (11)'"
  - id: E17
    kind: EVIDENCE
    cmd: "git show 2ca212ef:memory/decisions.md | grep -n -i -E 'onboarding.session|Path B|#534|anon ALL|TASK-RLS'; git ls-tree --name-only 2ca212ef .ai/bus/decisions/"
    result: "memory/decisions.md: 0 zásahov / .ai/bus/decisions/: .gitkeep, DEC-20260825-002-onl-mcp-001-verdict.md"
  - id: E18
    kind: EVIDENCE
    cmd: "git show 2ca212ef:apps/crm/src/app/api/onboarding/session/route.ts | grep -n -E 'validateBody|incrementUsageMetric'"
    result: "3:import { validateBody } from \"@/lib/api-validate\"; / 7:import { incrementUsageMetric } from \"@/lib/usage-metrics\";  (žiadne ďalšie použitie v súbore)"
  - id: E19
    kind: EVIDENCE
    file: "apps/crm/src/lib/rate-limit.ts@2ca212ef:2,21"
    result: "Distributed rate limiter — sliding window cez Supabase `rate_limit_buckets`. / import { createServiceRoleClient } from \"@/lib/supabase/admin\";"
  - id: E20
    kind: EVIDENCE
    cmd: "git log --oneline -1 && git diff --stat 2ca212ef HEAD"
    result: "a5fe53d5 bus(handoff): Gate 0 handoff for TASK-RLS-ONBOARDING-SESSION / .ai/bus/inbox/MSG-20260916-001-handoff-rls-onboarding-session.md | 61 +++  (handoff je v potomkovi base.ref, nie v base.ref)"

  # ---------------------------------------------------------------- FINDINGS
  # Q1 — skutočný stav repa vs karta
  - id: F1
    kind: FINDING
    claim: "Karta tvrdí 'PR open', ale kód vetvy security/rls-onboarding-session je v histórii base.ref cez merge commit 3aed4fcf 'Merge pull request #534' z 2026-09-05; stav PR na GitHube som nedotazoval."
    evidence: [E1, E2]
  - id: F2
    kind: FINDING
    claim: "Path B je pri base.ref implementovaná v repe: service-role route GET|POST /api/onboarding/session (get-by-id, upsert-by-id, PUT 405, bez list-all), klientsky helper, prepnuté tri browser klienty, pripravená DROP migrácia, rollback runbook a 12 testov (8 unit + 4 verification)."
    evidence: [E3, E5, E6, E7, E13, E16]
  - id: F3
    kind: FINDING
    claim: "Od merge #534 po base.ref sa v implementačných súboroch zmenili iba 2 riadky importov v route.ts (#535) a tieto importy (validateBody, incrementUsageMetric) sa v route nepoužívajú — kontraktová zhoda je iba formálna."
    evidence: [E4, E18]
  - id: F4
    kind: FINDING
    claim: "Report aj karta (stav 2026-09-04) sú zastarané voči repu: report uvádza 'PR not merged', hoci merge je v histórii; tvrdenie 'migration NOT applied' z repa nemožno potvrdiť ani vyvrátiť."
    evidence: [E2, E10, E11]
  - id: F5
    kind: FINDING
    claim: "Pre Path B neexistuje v memory/decisions.md ani v .ai/bus/decisions/ founderov DECISION artefakt; karta ho označuje ako 'odporúčané' a merge #534 urobil účet onlinovosk-bit."
    evidence: [E17, E1, E2]
  # Q2 — DROP v produkcii
  - id: F6
    kind: FINDING
    claim: "Posledný stav produkcie zdokumentovaný v repe (2026-09-04) je, že `Allow anon access` na onboarding_sessions EXISTUJE; v repe pri base.ref nie je žiadny neskorší záznam o aplikovaní 20260904220000."
    evidence: [E9, E11]
  - id: F7
    kind: FINDING
    claim: "Repo nemá mechanizmus, ktorý by migráciu 20260904220000 aplikoval do produkcie automaticky pri merge (CI robí iba lokálne `supabase db reset`), takže samotný merge #534 nie je dôkazom DROP-u v produkcii."
    evidence: [E12]
  - id: F8
    kind: FINDING
    claim: "Migračný súbor aj verification test natrvalo nesú značku 'PREPARED ONLY — do NOT apply', takže obsah repa sa po aplikovaní nezmení a stav produkcie z repa principiálne vyčítať nejde. Q2 = UNKNOWN."
    evidence: [E7, E8]
  # Q3 — Acceptance
  - id: F9
    kind: FINDING
    claim: "Acceptance 4 'Rollback SQL v tom istom PR' je SPLNENÉ: runbook s CREATE POLICY prišiel v 9235643b spolu s migráciou, na PR vetve a nie na main pred merge."
    evidence: [E13, E14]
  - id: F10
    kind: FINDING
    claim: "Acceptance 1 '`Allow anon access` neexistuje' je UNKNOWN: v repe je DROP iba pripravený a posledný zdokumentovaný stav produkcie je, že politika existuje."
    evidence: [E6, E7, E9, E11]
  - id: F11
    kind: FINDING
    claim: "Acceptance 2 'sessions nie sú verejne listovateľné anon kľúčom' je UNKNOWN pre produkciu. V repe je splnená iba aplikačná časť (API nemá list cestu), ale kým politika v produkcii existuje, anon kľúč cez PostgREST list obíde API."
    evidence: [E6, E9]
  - id: F12
    kind: FINDING
    claim: "Acceptance 3 'sync stále funguje' je UNKNOWN. Kód a testy existujú a report tvrdí 11/11 passed, ale testy som nespustil (bez node_modules a bez siete) a či produkčný deploy obsluhuje /api/onboarding/session, som neoveroval."
    evidence: [E5, E15, E16]
  - id: F13
    kind: FINDING
    claim: "Poradie krokov je bezpečnostne podstatné: rollback runbook ako forward-fix výslovne predpokladá nasadenú route. DROP bez nasadenej route by sync ticho vypol (klient ho iba soft-failuje), preto overenie deployu patrí pred apply."
    evidence: [E5, E14]
  - id: F14
    kind: FINDING
    claim: "HTTP sonda GET /api/onboarding/session proti produkcii nie je čisto read-only, lebo rateLimit pri každom volaní zapisuje cez service role do Supabase tabuľky rate_limit_buckets."
    evidence: [E19, E6]
  - id: F15
    kind: FINDING
    claim: "Protokol: handoff je v commite a5fe53d5, ktorý je potomkom base.ref, takže sám handoff nie je dosiahnuteľný z base.ref. Všetky ním citované refs však pri base.ref existujú a context_requests netreba."
    evidence: [E20, E3]

  # ---------------------------------------------------------------- PROPOSALS
  # Q4 — jediný ďalší krok
  - id: P1
    kind: PROPOSAL
    proposal: >-
      JEDINÝ ĎALŠÍ KROK: founder (alebo agent s DEC) spustí v produkčnom Supabase SQL editore
      read-only overenie a výsledok doslovne zapíše do repa (report/outbox):
      V1 `select policyname, roles, cmd, qual, with_check from pg_policies where schemaname='public' and tablename='onboarding_sessions';`
      V2 `select version, name from supabase_migrations.schema_migrations where version='20260904220000' or name ilike '%onboarding_sessions%';`
      V3 `begin; set local role anon; select count(*) from public.onboarding_sessions; rollback;`
      V4 (Vercel, read-only) overiť, že produkčný deployment CRM je z commitu, ktorý obsahuje 3aed4fcf
      (bez HTTP sondy na route, lebo tá zapisuje do rate_limit_buckets, viď F14).
      Výsledok rozhodne: ak V1 = 0 riadkov a V3 = 0, P0 sa uzatvára bez ďalšieho zásahu do produkcie (zostáva P3).
      Ak V1 ukáže `Allow anon access`, nasleduje P2.
    based_on: [F6, F7, F8, F10, F11, F12, F14]
    gate: GO REQUIRED
    requires_decision: true
  - id: P2
    kind: PROPOSAL
    proposal: >-
      PODMIENENÝ krok, iba ak P1/V1 ukáže, že `Allow anon access` existuje, a P1/V4 potvrdí deploy s route:
      aplikovať apps/crm/supabase/migrations/20260904220000_drop_onboarding_sessions_anon_all.sql do produkcie
      a zopakovať V1 a V3 (očakávanie: 0 politík, anon count = 0). Potom smoke onboarding wizard, v Network musí byť /api/onboarding/session.
      Rollback: docs/runbooks/rollback-onboarding-sessions-anon.md, pripravený 24 h.
      Ak V4 neprejde, najprv deploy a až potom apply (F13).
    based_on: [F2, F9, F13, F10]
    gate: GO REQUIRED
    requires_decision: true
  - id: P3
    kind: PROPOSAL
    proposal: >-
      Po P1 (a prípadne P2) zosúladiť task kartu a report s realitou: Status 'PR open' → 'merged 3aed4fcf (2026-09-05)',
      zaškrtnúť Acceptance 4 s odkazom na 9235643b a Acceptance 1–3 podľa doslovných výsledkov V1–V4.
      Ide o repo-lokálnu zmenu mimo write_set tohto behu, preto na ňu treba nový handoff s write_set na kartu.
    based_on: [F1, F4, F9]
    gate: AUTO-SAFE
    requires_decision: false
  - id: P4
    kind: PROPOSAL
    proposal: >-
      Overiť, či nepoužité importy validateBody/incrementUsageMetric v route.ts len obchádzajú Code Contract ratchet;
      ak áno, buď route skutočne napojiť (validácia tela + usage metric), alebo zúžiť pravidlo. Rieši sa samostatne, nie ako súčasť P0.
    based_on: [F3]
    gate: GO REQUIRED
    requires_decision: true

  # ---------------------------------------------------------------- ACTIONS
  - id: A1
    kind: ACTION
    action: "Read-only git príkazy nad lokálnym worktree (show, log, grep, merge-base, cat-file, diff) a zápis tohto výstupného súboru. Bez siete, bez GitHub API, bez Supabase a Vercel, bez spúšťania testov."
    side_effects: repo_local
    authorized_by: null
    evidence: [E2, E3, E4, E15]
---

# Executor výstup — TASK-RLS-ONBOARDING-SESSION (Gate 0)

## Q1 — Skutočný stav repa pri `2ca212ef` vs karta

- **Karta tvrdí:** „PR open, migration PREPARED, NOT applied“.
- **V repe je:** PR #534 zamergovaný cez `3aed4fcf` (2026-09-05). Pozri F1 a E2.
- **Hotové v kóde:**
  - service-role API bez list cesty,
  - prepnuté klienty,
  - DROP migrácia,
  - rollback runbook,
  - 12 testov.

  Pozri F2.
- **Zmeny po merge:** iba 2 nepoužité importy v route. Pozri F3.
- **Zastarané:** karta aj report. Pozri F4.
- **Founderov DECISION k Path B:** v repe nie je. Pozri F5.

## Q2 — Je DROP `Allow anon access` aplikovaný v produkcii?

**UNKNOWN.**

- Posledný zdokumentovaný stav (2026-09-04) hovorí, že politika existuje. Pozri F6.
- Merge sa sám do produkcie neaplikuje. Pozri F7.
- Súbor v repe sa po aplikovaní nemení. Pozri F8.
- Overiť sa to dá krokom **P1** (read-only, `GO REQUIRED`).

## Q3 — Acceptance

| # | Bod | Stav | Položka |
|---|---|---|---|
| 1 | `Allow anon access` neexistuje | UNKNOWN (posledný známy stav: existuje) | F10 |
| 2 | 5 sessions nie je verejne listovateľných | UNKNOWN (API časť v repe OK, v produkcii rozhoduje politika) | F11 |
| 3 | Sync stále funguje | UNKNOWN (kód a testy existujú, nespustené, deploy neoverený) | F12 |
| 4 | Rollback SQL v tom istom PR | **SPLNENÉ** | F9 |

## Q4 — Jediný ďalší krok a gate

**P1: read-only overenie produkcie, `gate: GO REQUIRED`.** Obsahuje V1–V4:

- **V1:** `pg_policies`
- **V2:** `schema_migrations`
- **V3:** `count(*)` ako `anon`
- **V4:** produkčný deploy obsahuje `3aed4fcf`

Rozhodnutie pre foundera stačí jednou vetou, napríklad „GO P1“. Čo nasleduje, závisí od výsledku:

- **Ak politika v produkcii už neexistuje:** P0 sa uzatvorí aktualizáciou karty (P3).
- **Ak politika existuje:** treba ešte **P2**, teda apply `20260904220000`. Má samostatný `GO REQUIRED` a podmienku, že V4 potvrdí nasadenú route.

Z repa nevieme, ktorá z týchto dvoch vetiev platí.
