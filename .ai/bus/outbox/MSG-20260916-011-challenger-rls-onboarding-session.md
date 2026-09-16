---
id: MSG-20260916-011-challenger-rls-onboarding-session
type: result
status: done
contract: REVOLIS_AGENT_CONTRACT_v0.1
in_reply_to: MSG-20260916-001-handoff-rls-onboarding-session
role: challenger
agent: "claude-subagent (general-purpose) running the challenger role profile — NOT Grok"
created_at: 2026-09-16T20:19:00Z
base_ref: 2ca212ef40531251b33bd5dede219b5765e90285
resolution:
  task: .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md
  objective: "Overiť, čo z karty TASK-RLS-ONBOARDING-SESSION reálne platí v repe pri base.ref, oddeliť to od produkčných tvrdení (UNKNOWN) a zúžiť uzavretie P0 na jedno gated founder rozhodnutie."
  context_read:
    - docs/architecture/REVOLIS_AGENT_CONTRACT_v0.1.md
    - .ai/bus/AGENT_PROTOCOL.md
    - .ai/bus/inbox/MSG-20260904-rls-anon-nejasne.md
    - docs/reports/2026-09-04-rls-onboarding-session-api.md
    - docs/audit/2026-09-04-rls-anon-policies.md
  prior_decisions:
    - memory/decisions.md
  expected_output: .ai/bus/outbox/MSG-20260916-011-challenger-rls-onboarding-session.md
context_requests: []
inputs_read:
  # refs (read at base.ref via git show)
  - .ai/bus/inbox/MSG-20260916-001-handoff-rls-onboarding-session.md   # handoff itself (commit a5fe53d5, child of base.ref)
  - docs/architecture/REVOLIS_AGENT_CONTRACT_v0.1.md
  - .ai/bus/AGENT_PROTOCOL.md
  - .ai/bus/README.md
  - .ai/bus/message.schema.md
  - .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md
  - .ai/bus/inbox/MSG-20260904-rls-anon-nejasne.md
  - docs/reports/2026-09-04-rls-onboarding-session-api.md
  - docs/audit/2026-09-04-rls-anon-policies.md
  - memory/decisions.md
  # files cited by refs (at base.ref)
  - apps/crm/supabase/migrations/20260904220000_drop_onboarding_sessions_anon_all.sql
  - apps/crm/supabase/migrations/20260904150000_drop_open_anon_policies.sql
  - docs/runbooks/rollback-onboarding-sessions-anon.md
  - docs/runbooks/rollback-anon-policies.md
  - apps/crm/src/app/api/onboarding/session/route.ts
  - apps/crm/src/app/api/onboarding/session/__tests__/route.test.ts
  - apps/crm/src/lib/onboarding/session-api.ts
  - apps/crm/tests/verification/onboarding-sessions-api.verification.test.ts
  - apps/crm/src/app/onboarding/useOnboarding.ts
  - apps/crm/src/app/onboarding/OnboardingClient.tsx
  - apps/crm/src/app/test-db/TestDbClient.tsx
  # repo at base.ref (not cited by refs; allowed by §6.2)
  - apps/crm/src/proxy.ts
  - apps/crm/src/lib/supabase/proxy.ts
  - apps/crm/src/lib/supabase/admin.ts
  - apps/crm/src/app/test-db/page.tsx
  - apps/crm/src/app/onboarding/page.tsx
  - apps/crm/src/app/onboarding/layout.tsx
  - "apps/crm/src/app/(public)/register/actions.ts"
  - apps/crm/tests/verification/onboarding-mvp-auth.verification.test.ts
  - apps/crm/docs/audit/rls-schema-parity-matrix.json
  - apps/crm/package.json
  - docs/reports/2026-09-04-rls-anon-apply.md
  - docs/reports/2026-09-04-rls-anon-conscious-deny.md
  - docs/prompts/2026-09-04-brief18-konsolidovana-vlna.md
  - .ai/bus/decisions/DEC-20260825-002-onl-mcp-001-verdict.md
  - output/overnight/2026-09-05T2308-CEST-research/lanes/A/report.md
  - .github/workflows/*  # grep only
  - "git log / git diff / git merge-base over base.ref history (commits 9235643b, fe7ff529, 8acdfe1b, 3aed4fcf)"
  # NOT read: any .ai/bus/outbox/MSG-20260916-* (no other-role output existed at time of writing), other branches, network, GitHub, Supabase, Vercel
items:
  # ------------------------------------------------------------------ EVIDENCE
  - id: E1
    kind: EVIDENCE
    cmd: "git merge-base --is-ancestor 3aed4fcf 2ca212ef40531251b33bd5dede219b5765e90285 && echo ancestor; git log -1 --format='%h %ad %s' 3aed4fcf"
    result: |
      ancestor
      3aed4fcf Sat Sep 5 21:59:00 2026 +0200 Merge pull request #534 from onlinovosk-bit/security/rls-onboarding-session
  - id: E2
    kind: EVIDENCE
    file: ".ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md@2ca212ef:3"
    result: "**Status:** PR open (Path B) — migration PREPARED, NOT applied"
  - id: E3
    kind: EVIDENCE
    cmd: "git log --oneline 3aed4fcf..2ca212ef -- .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md docs/reports/2026-09-04-rls-onboarding-session-api.md apps/crm/supabase/migrations/20260904220000_drop_onboarding_sessions_anon_all.sql docs/runbooks/rollback-onboarding-sessions-anon.md"
    result: "(prázdny výstup, exit 0) — žiadny commit po merge #534 tieto súbory nemenil"
  - id: E4
    kind: EVIDENCE
    cmd: "git diff --stat 3aed4fcf^1 3aed4fcf"
    result: |
      .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md       |   5 +
      .../api/onboarding/session/__tests__/route.test.ts | 159 ++++
      apps/crm/src/app/api/onboarding/session/route.ts   | 164 ++++
      apps/crm/src/app/onboarding/OnboardingClient.tsx   |  25 ++--
      apps/crm/src/app/onboarding/useOnboarding.ts       |  19 +--
      apps/crm/src/app/test-db/TestDbClient.tsx          |  21 ++-
      apps/crm/src/lib/onboarding/session-api.ts         |  61 ++++
      .../20260904150000_drop_open_anon_policies.sql     |   4 +-
      ...904220000_drop_onboarding_sessions_anon_all.sql |  22 +++
      .../onboarding-sessions-api.verification.test.ts   |  53 +++
      .../2026-09-04-rls-onboarding-session-api.md       |  69 +++
      docs/runbooks/rollback-anon-policies.md            |   4 +-
      docs/runbooks/rollback-onboarding-sessions-anon.md |  49 +++
      memory/session-summary.md                          |  11 ++
      14 files changed, 626 insertions(+), 40 deletions(-)
  - id: E5
    kind: EVIDENCE
    file: "apps/crm/supabase/migrations/20260904220000_drop_onboarding_sessions_anon_all.sql@2ca212ef:2,17-18"
    result: |
      2: -- PREPARED ONLY — do NOT apply from Cursor / agent.
      17:  IF to_regclass('public.onboarding_sessions') IS NOT NULL THEN
      18:    DROP POLICY IF EXISTS "Allow anon access" ON public.onboarding_sessions;
  - id: E6
    kind: EVIDENCE
    file: "docs/runbooks/rollback-onboarding-sessions-anon.md@2ca212ef:23-28"
    result: |
      CREATE POLICY "Allow anon access"
        ON public.onboarding_sessions
        FOR ALL
        TO anon
        USING (true)
        WITH CHECK (true);
  - id: E7
    kind: EVIDENCE
    cmd: "git grep -n '\\.from(\"onboarding_sessions\")' 2ca212ef -- apps/crm/src"
    result: |
      apps/crm/src/app/api/onboarding/session/route.ts:63:      .from("onboarding_sessions")
      apps/crm/src/app/api/onboarding/session/route.ts:135:      .from("onboarding_sessions")
  - id: E8
    kind: EVIDENCE
    cmd: "git show 2ca212ef:apps/crm/src/proxy.ts | grep -c 'api/onboarding'; git show 2ca212ef:apps/crm/src/proxy.ts | sed -n '183,188p'"
    result: |
      0
        if (!user && pathname.startsWith("/api/")) {
          return NextResponse.json(
            { ok: false, error: "Unauthorized" },
            { status: 401 }
          );
        }
  - id: E9
    kind: EVIDENCE
    file: "apps/crm/package.json@2ca212ef:45 + apps/crm/tests/verification/proxy-session-gate.verification.test.ts@2ca212ef:8"
    result: |
      "next": "^16.2.4",
      it("does not ship the dead apps/crm/middleware.ts (Next 16 uses src/proxy.ts)", () => {
  - id: E10
    kind: EVIDENCE
    file: "docs/reports/2026-09-04-rls-onboarding-session-api.md@2ca212ef:11 + docs/audit/2026-09-04-rls-anon-policies.md@2ca212ef:38"
    result: |
      report:11: without breaking public onboarding progress sync.
      audit:38: ... | Áno — browser upsert/select **bez loginu** | ...
  - id: E11
    kind: EVIDENCE
    file: "apps/crm/src/app/onboarding/useOnboarding.ts@2ca212ef:6,108-113"
    result: |
      6: import { upsertOnboardingSession } from "@/lib/onboarding/session-api";
      108:    void upsertOnboardingSession({
      ...
      113:    }).catch(() => {}); // soft-fail — localStorage is SoT
  - id: E12
    kind: EVIDENCE
    cmd: "git grep -n -E 'OnboardingClient|TestDbClient' 2ca212ef -- apps/crm/src; git show 2ca212ef:apps/crm/src/app/test-db/page.tsx"
    result: |
      apps/crm/src/app/onboarding/OnboardingClient.tsx:78:export default function OnboardingClient() {
      apps/crm/src/app/test-db/TestDbClient.tsx:78:export default function TestDbClient() {
      (test-db/page.tsx) redirect("/onboarding");
  - id: E13
    kind: EVIDENCE
    cmd: "git show 2ca212ef:apps/crm/src/app/api/onboarding/session/route.ts | grep -n onConflict; git grep -n -i 'create table.*onboarding_sessions' 2ca212ef; git show 2ca212ef:apps/crm/docs/audit/rls-schema-parity-matrix.json | sed -n '2118,2123p'"
    result: |
      143:        { onConflict: "session_id" },
      (git grep: žiadny výstup, exit 1)
            "table": "onboarding_sessions",
            "rls_enabled": true,
            "has_agency_id": false,
            "on_prod": true,
            "in_allowlist": true,
            "in_repo_migrations": false,
  - id: E14
    kind: EVIDENCE
    file: "apps/crm/src/app/api/onboarding/session/__tests__/route.test.ts@2ca212ef:9-11,13,29-33"
    result: |
      9:  const mockCreateServiceRoleClient = vi.hoisted(() =>
      10:   vi.fn(() => ({ from: (...args: unknown[]) => mockFrom(...args) })),
      11: );
      13: vi.mock("@/lib/supabase/admin", () => ({
      29:     upsert: () => ({
      30:       select: () => ({
      31:         maybeSingle: async () => result,
      32:       }),
      33:     }),
  - id: E15
    kind: EVIDENCE
    cmd: "git grep -n -i -E 'onboarding_session|#534|20260904220000' 2ca212ef -- memory/decisions.md .ai/bus/decisions"
    result: "(žiadny výstup, exit 1)"
  - id: E16
    kind: EVIDENCE
    cmd: "git grep -n -i -E 'db push|apply_migration|supabase link|migration up' 2ca212ef -- .github"
    result: "(žiadny výstup, exit 1)"
  - id: E17
    kind: EVIDENCE
    file: "docs/reports/2026-09-04-rls-anon-apply.md@2ca212ef:21,44-45"
    result: |
      21: | onboarding_sessions | Allow anon access (ALL) | Zámerne nedropnuté — TASK-RLS-ONBOARDING-SESSION |
      44: Nezávislé overenie z produkcie: v celej `public` schéme ostáva **jediná** otvorená
      45: anon politika — `onboarding_sessions` / `Allow anon access`. Sedí s agentovým
  - id: E18
    kind: EVIDENCE
    file: "docs/reports/2026-09-04-rls-onboarding-session-api.md@2ca212ef:6,43,45"
    result: |
      6: **Production:** migration **PREPARED, NOT applied** (no `apply_migration` / db push from agent)
      43: 1. Confirm Preview: onboarding wizard advances; Network shows `/api/onboarding/session` (not direct PostgREST `onboarding_sessions`).
      45: 3. Apply migration SQL in prod SQL editor (or approved migrate path).
  - id: E19
    kind: EVIDENCE
    file: "apps/crm/tests/verification/onboarding-sessions-api.verification.test.ts@2ca212ef:18 + apps/crm/supabase/migrations/20260904150000_drop_open_anon_policies.sql@2ca212ef:2"
    result: |
      test:18:    expect(sql).toMatch(/PREPARED ONLY|do NOT apply/i);
      migration-150000:2: -- Applied on production 2026-09-04 — do NOT re-apply there; this file is for CI / fresh DBs only.
  - id: E20
    kind: EVIDENCE
    file: "\"apps/crm/src/app/(public)/register/actions.ts\"@2ca212ef:22,83"
    result: |
      22:  const { data: signUpData, error } = await supabase.auth.signUp({
      83:  redirect("/onboarding/step-1-vitaj");
  - id: E21
    kind: EVIDENCE
    file: "docs/architecture/REVOLIS_AGENT_CONTRACT_v0.1.md@2ca212ef:131,171"
    result: |
      131: refs:                            # úplný kontext; nič mimo nich + súbory, ktoré citujú
      171: 2. `inputs_read` musí byť podmnožina `refs` ∪ súbory, na ktoré `refs` odkazujú ∪ repo pri `base.ref`.
  - id: E22
    kind: EVIDENCE
    file: ".ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md@2ca212ef:25-28"
    result: |
      2. Preferovaná cesta (rozhodnutie foundera):
         - **A:** `TO anon` scoped na `session_id` (krehké; treba dôveryhodný viazací token)
         - **B (odporúčané):** API route `POST/GET /api/onboarding/session` so service role;

  # ------------------------------------------------------------------ FINDINGS
  - id: F1
    kind: FINDING
    claim: "Karta tvrdí „PR open“, ale PR #534 je pri base.ref zmergovaný (merge 3aed4fcf, 2026-09-05 21:59 +0200, predok base.ref) a karta, report ani migračná hlavička sa po merge nezmenili — stav karty je zastaraný o jeden krok."
    evidence: [E1, E2, E3]
  - id: F2
    kind: FINDING
    claim: "Implementácia Path B je v repe pri base.ref kompletná: service-role route GET/POST, klientsky helper, prepnuté klienty, idempotentná DROP migrácia s to_regclass guardom, rollback runbook s CREATE POLICY a unit + verification testy — všetko prišlo v tom istom merge."
    evidence: [E4, E5, E6, E7]
  - id: F3
    kind: FINDING
    claim: "V aplikačnom kóde pri base.ref už žiadny klient nečíta ani nezapisuje onboarding_sessions priamo cez PostgREST; jediný prístup je service-role route, takže main kód politiku `Allow anon access` funkčne nepotrebuje."
    evidence: [E7]
  - id: F4
    kind: FINDING
    claim: "`/api/onboarding/session` nie je v PUBLIC_PATHS v src/proxy.ts (Next 16 proxy), a proxy vracia 401 pre každé /api/* bez prihláseného usera — návštevník onboarding wizardu bez Supabase session teda po #534 dostane na sync 401, čo je v rozpore s tvrdením reportu „without breaking public onboarding progress sync“ a s auditom „bez loginu“."
    evidence: [E8, E9, E10]
  - id: F5
    kind: FINDING
    claim: "Zlyhanie syncu je neviditeľné: živý wizard (useOnboarding) volá upsert cez `void ... .catch(() => {})` a výsledok res.ok ignoruje, takže Preview kontrola z reportu („wizard advances; Network shows /api/onboarding/session“) prejde aj pri 401/503 — nerozlišuje funkčný a nefunkčný sync."
    evidence: [E11, E18]
  - id: F6
    kind: FINDING
    claim: "Živý wizard serverový sync iba zapisuje (import len upsertOnboardingSession); čítanie zo servera (getOnboardingSession) je len v OnboardingClient.tsx a TestDbClient.tsx, ktoré nikto neimportuje (test-db/page.tsx len redirectuje) — „progress sync“ je v praxi write-only záloha."
    evidence: [E11, E12]
  - id: F7
    kind: FINDING
    claim: "Route robí upsert s `onConflict: \"session_id\"`, ale DDL tabuľky onboarding_sessions v repe neexistuje (in_repo_migrations: false) a unit testy supabase klienta mockujú — z repa nie je overiteľné, že session_id má unique/PK constraint, bez ktorého upsert v Postgrese zlyhá."
    evidence: [E13, E14]
  - id: F8
    kind: FINDING
    claim: "V repe pri base.ref neexistuje žiadny artefakt, ktorý by zaznamenal aplikovanie 20260904220000 do produkcie (žiadny zápis v memory/decisions.md ani .ai/bus/decisions, žiadny apply report analogický k 2026-09-04-rls-anon-apply.md, migračná hlavička stále „PREPARED ONLY“) a CI workflowy produkčné migrácie nespúšťajú."
    evidence: [E3, E5, E15, E16, E17]
  - id: F9
    kind: FINDING
    claim: "Posledný repo-zdokumentovaný produkčný stav (2026-09-04, agent post-apply + founder re-check) je, že `Allow anon access` na onboarding_sessions EXISTUJE; novší produkčný dôkaz v repe nie je."
    evidence: [E17, E18]
  - id: F10
    kind: FINDING
    claim: "Acceptance „Rollback SQL v tom istom PR“ je splnená: runbook s rollback SQL (CREATE POLICY \"Allow anon access\" ... TO anon) bol pridaný v tom istom merge #534 ako DROP migrácia."
    evidence: [E4, E6]
  - id: F11
    kind: FINDING
    claim: "Po aplikovaní migrácie hrozí CI pasca: verification test vyžaduje v migrácii text „PREPARED ONLY|do NOT apply“; ak sa hlavička prepíše podľa vzoru 20260904150000 („Applied on production … do NOT re-apply“), test zlyhá."
    evidence: [E19]
  - id: F12
    kind: FINDING
    claim: "Voľba Path B (karta: „rozhodnutie foundera“) ani merge GO pre #534 nie sú zaznamenané ako DECISION s `source` v memory/decisions.md ani v .ai/bus/decisions — z repa je doložený len merge commit, nie founderovo rozhodnutie podľa §4."
    evidence: [E15, E22, E1]
  - id: F13
    kind: FINDING
    claim: "Kontrakt si protirečí v rozsahu povoleného vstupu: §5 komentár pri `refs` hovorí „nič mimo nich + súbory, ktoré citujú“, §6.2 povoľuje aj „repo pri base.ref“; F4 a F7 (proxy.ts, parity matrix) vznikli iba vďaka širšiemu výkladu §6.2."
    evidence: [E21, E8, E13]

  # ------------------------------------------------------------------ PROPOSALS
  - id: P1
    kind: PROPOSAL
    proposal: "JEDINÝ ĎALŠÍ KROK k uzavretiu P0: founder v jednej produkčnej SQL session (1) spustí read-only precheck `SELECT polname, polroles::regrole[], polcmd FROM pg_policy WHERE polrelid='public.onboarding_sessions'::regclass; SELECT relrowsecurity FROM pg_class WHERE oid='public.onboarding_sessions'::regclass; SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public.onboarding_sessions'::regclass;`, (2) ak `Allow anon access` existuje, spustí idempotentné SQL z 20260904220000_drop_onboarding_sessions_anon_all.sql, (3) zopakuje precheck (očakávanie: 0 politík, relrowsecurity=true), (4) výstupy doslovne uloží do repo artefaktu (napr. docs/reports/<dátum>-rls-onboarding-session-apply.md) a až potom sa zaškrtnú Acceptance 1–2. Pozn.: stav schema_migrations nie je dôkaz — report predpokladal apply cez SQL editor, ktorý históriu nezapíše; rozhoduje pg_policy."
    based_on: [F3, F8, F9, F7]
    gate: GO REQUIRED
    requires_decision: true
  - id: P2
    kind: PROPOSAL
    proposal: "Do P1 pridať pred krok (2) overenie, že Production deploy obsahuje 3aed4fcf (Vercel), a že Production má SUPABASE_SERVICE_ROLE_KEY (inak route vracia 503). Neblokuje DROP — sync je soft-fail a localStorage je SoT — ale bez toho nie je Acceptance 3 overiteľná."
    based_on: [F3, F5]
    gate: GO REQUIRED
    requires_decision: false
  - id: P3
    kind: PROPOSAL
    proposal: "Founder rozhodne (samostatne, nie je predpoklad pre P1), či onboarding sync musí fungovať aj bez prihlásenia: ak áno → samostatný PR pridá `/api/onboarding/session` do PUBLIC_PATHS (route už má UUID validáciu + rate-limit); ak nie → prepísať Acceptance 3 na „sync pre prihlásenú session“ a opraviť tvrdenie v reporte. Dovtedy Acceptance 3 nesmie byť zaškrtnutá."
    based_on: [F4, F6]
    gate: GO REQUIRED
    requires_decision: true
  - id: P4
    kind: PROPOSAL
    proposal: "Nahradiť Preview kontrolu z reportu (krok 1) kontrolou HTTP status kódu: v Network musí POST /api/onboarding/session vrátiť 200 (nie 401/503/500) pre prihláseného aj neprihláseného používateľa, inak je „wizard advances“ bez dôkaznej hodnoty."
    based_on: [F5, F4]
    gate: AUTO-SAFE
    requires_decision: false
  - id: P5
    kind: PROPOSAL
    proposal: "Po P1 v jednom repo_local PR: aktualizovať kartu (Status: merged #534; DROP applied/not applied s odkazom na apply artefakt), hlavičku migrácie a súčasne regex v onboarding-sessions-api.verification.test.ts:18, aby nový text hlavičky neshodil CI."
    based_on: [F1, F11]
    gate: GO REQUIRED
    requires_decision: false
  - id: P6
    kind: PROPOSAL
    proposal: "Overiť (hypotéza, nie nález), či 5 existujúcich riadkov a budúce zápisy nenarážajú na chýbajúci unique constraint na session_id — pokryté treťou query v P1; ak constraint chýba, API upsert zlyhá pre všetkých a Acceptance 3 je FAIL bez ohľadu na P3."
    based_on: [F7]
    gate: GO REQUIRED
    requires_decision: false
  - id: P7
    kind: PROPOSAL
    proposal: "Zapísať founderovu voľbu Path B a merge GO #534 ako DECISION so `source` (doslovná citácia alebo podpísaný artefakt), ak existuje; ak neexistuje, uviesť to v karte ako neformálny stav."
    based_on: [F12]
    gate: GO REQUIRED
    requires_decision: true
  - id: P8
    kind: PROPOSAL
    proposal: "Gate 0 nález pre kontrakt: zosúladiť §5 komentár pri `refs` s §6.2 (buď „refs + citované súbory“, alebo „+ repo pri base.ref“), inak dvaja agenti s rovnakým handoffom môžu legitímne dôjsť k rôznym záverom (tu F4/F7 existujú len pri širšom výklade)."
    based_on: [F13]
    gate: GO REQUIRED
    requires_decision: true
---

# CHALLENGER — TASK-RLS-ONBOARDING-SESSION (Gate 0)

Nezávislý výstup písaný iba z `refs` a repa pri `base.ref` = `2ca212ef`. Výstup inej roly
k tomuto handoffu som nečítal (v `outbox/` žiadny `MSG-20260916-*` neexistoval).
Na sieť, GitHub, Supabase ani Vercel som nesiahal, takže každé tvrdenie o produkcii je **UNKNOWN**.

## Q1 — skutočný stav v repe verzus karta

- **Karta je o krok pozadu.** Uvádza „PR open“, no #534 je zmergovaný (merge `3aed4fcf`,
  2026-09-05) a je predkom `base.ref`. Karta, report ani hlavička migrácie sa odvtedy nezmenili. → F1
- **Kód Path B je v repe celý:** route, helper, klienti, idempotentná DROP migrácia,
  rollback runbook a testy. → F2, F3
- **Kde nesúhlasím s kartou a reportom:**
  - Sync bez prihlásenia vracia 401. Proxy blokuje `/api/onboarding/session` pre používateľa
    bez session, takže tvrdenie „without breaking public onboarding progress sync“
    kód pri `base.ref` nepodporuje. → F4
  - Chyba syncu sa nikde neukáže (soft-fail). Kontrola Preview podľa reportu ju
    nezachytí. → F5
  - Živý wizard na server iba zapisuje. Klienti, ktorí zo servera čítajú, nie sú nikde
    zapojení. → F6
  - Upsert potrebuje unique constraint na `session_id`. Ten sa z repa overiť nedá, lebo
    DDL tabuľky v repe chýba a testy databázu mockujú. → F7

## Q2 — je DROP `Allow anon access` aplikovaný v produkcii?

**UNKNOWN.** Repo apply nijako nedokladá: chýba DEC, apply report aj zmena hlavičky,
a CI migrácie do produkcie nespúšťa. Posledný zdokumentovaný stav produkcie
(2026-09-04) hovorí, že politika **existuje**. → F8, F9
Overenie má gate GO REQUIRED → P1. Samotný záznam v `schema_migrations` nestačí,
rozhoduje `pg_policy`.

## Q3 — Acceptance

| Acceptance | Stav | Dôkaz / dôvod |
|---|---|---|
| `Allow anon access` neexistuje | **UNKNOWN** | V repe je iba pripravená migrácia (F2). Posledný stav produkcie (09-04) = politika existuje (F9). Overí P1. |
| 5 sessions nie je verejne listovateľných anon kľúčom | **UNKNOWN** | Závisí od prvého riadku a od `relrowsecurity` (P1). Počet 5 je údaj z 09-04. |
| Onboarding sync stále funguje | **NESPLNENÉ pre neprihláseného / UNKNOWN pre prihláseného** | F4: neprihlásený dostane 401. F7: constraint neoverený. F5: chyba je neviditeľná. P2, P3, P4, P6. |
| Rollback SQL v tom istom PR | **SPLNENÉ** | F10 (runbook v merge #534) |

## Q4 — jediný ďalší krok a jeho gate

**P1, gate `GO REQUIRED`, founder rozhodnutie:** jedna produkčná SQL session.
1. Read-only precheck `pg_policy`, `relrowsecurity` a `pg_constraint`.
2. Ak politika stále existuje, spustiť idempotentný SQL z `20260904220000`.
3. Zopakovať precheck.
4. Doslovný výstup commitnúť ako apply artefakt.

DROP nemá funkčnú nevýhodu, lebo kód na main politiku nepoužíva (F3).

Výhrada challengera: P1 uzavrie bezpečnostnú dieru (Acceptance 1–2), **nie celú kartu**.
Acceptance 3 zostáva otvorená, kým founder nerozhodne P3 (sync bez loginu áno/nie)
a kým neprebehne P4/P6. Tvrdiť „P0 closed, všetky boxy zaškrtnuté“ iba na základe P1
by bolo nepravdivé.
