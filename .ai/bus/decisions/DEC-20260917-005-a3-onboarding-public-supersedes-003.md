---
id: DEC-20260917-005-a3-onboarding-public-supersedes-003
type: decision
status: done
owner: founder
created_at: 2026-09-17T13:50:00+02:00
decided_by: founder
supersedes: DEC-20260917-003-a3-onboarding-401-intended
source: "PR #574 (commit e73ed7de), telo commitu: \"Founder GO 2026-09-17: public onboarding wizard sync must work without login. Add path to PUBLIC_PATHS so proxy no longer returns soft-failed 401; route still validates session_id UUID and rate-limits.\""
scope:
  repo_paths:
    - apps/crm/src/proxy-onboarding-session-gate.test.ts
    - .ai/bus/decisions/DEC-20260917-005-a3-onboarding-public-supersedes-003.md
    - docs/reports/2026-09-17-a3-onboarding-public-residual-risks.md
  forbidden_paths:
    - apps/crm/supabase/migrations/**
    - apps/crm/src/proxy.ts
  external_systems: []
evidence:
  commands:
    - "npx vitest run src/proxy-onboarding-session-gate.test.ts na e73ed7de PRED opravou -> Tests 2 failed | 3 passed (anon GET + anon POST)"
    - "npx vitest run src/proxy-onboarding-session-gate.test.ts PO oprave -> Tests 8 passed (8)"
    - "mutacny test: PUBLIC_PATHS.has(pathname) doplneny o pathname.startsWith(\"/api/onboarding/\") -> Tests 4 failed (sesterska route + 3 prefixove cesty); proxy.ts obnoveny, git diff prazdny"
  files:
    - apps/crm/src/proxy.ts
    - apps/crm/src/app/api/onboarding/session/route.ts
  urls:
    - https://github.com/onlinovosk-bit/RealitkaAI/pull/574
next_action:
  gate: GO REQUIRED
  description: "Dve zvyskove rizika capability-URL vzoru (session_id v query stringu, chybajuca expiracia) — viz docs/reports/2026-09-17-a3-onboarding-public-residual-risks.md. Ani jedno nie je opravene v tomto PR."
  owner: founder
---

# DEC-20260917-005 — `/api/onboarding/session` je verejná cesta (nahrádza DEC-003)

## Čo sa stalo

`DEC-20260917-003` z dnešného rána zaznamenal founderovo GO na variant **V1**:
anonymné `401` je zámer, nie regresia. Dôvodom bolo, že endpoint beží cez
service role (obchádza RLS) a `form_data` nesie osobné údaje. Súčasťou toho
rozhodnutia bol test `proxy-onboarding-session-gate.test.ts` (#566), ktorý
401 zamkol a bol mutačne overený: pridanie cesty do `PUBLIC_PATHS` ho zhodí.

O niekoľko hodín neskôr bol zmergovaný **#574**, ktorý presne to urobil.
Test zafungoval tak, ako mal — `main` sa rozsvietil na červeno.

**To nie je zlyhanie ani jednej strany.** Test svoju úlohu splnil: zachytil
zmenu bezpečnostného modelu a vyžiadal si rozhodnutie. Rozhodnutie prišlo
v tele commitu #574 a je novšie než DEC-003, preto ho nahrádza.

## Rozhodnutie

`/api/onboarding/session` je **zámerne verejná cesta**. Verejný onboarding
wizard musí synchronizovať stav bez prihlásenia.

## Čo sa tým NEzrušilo

Bezpečnostný model sa nezrušil, **presunul sa**. Prístup už nechráni session
brána, ale:

| vrstva | mechanizmus | dôkaz |
|---|---|---|
| neuhádnuteľnosť | `session_id` je `uuidv4` — 122 bitov entropie | `src/app/onboarding/useOnboarding.ts:101` |
| tvar vstupu | UUID regex, inak `400` | `src/lib/onboarding/session-api.ts:23-25` |
| objem | rate limit na IP pre GET aj POST | `src/app/api/onboarding/session/route.ts:40,90` |
| rozsah | otvorená je **presne jedna cesta**, nie prefix | `proxy.ts:92` používa `PUBLIC_PATHS.has(pathname)` |

Je to **capability-URL vzor**: držiteľ neuhádnuteľného tokenu má prístup.
Vzor je legitímny a bežný pre anonymné wizardy. Nie je to enumerovateľný
únik — 122 bitov sa neháda.

## Čo sa zmenilo v teste

Test nebol oslabený, bol **prepísaný na nový kontrakt a rozšírený**:
z 5 testov na 8. Pribudla hranica otvorenia — tri cesty pod prefixom
(`/session/list`, `/session/all`, `/sessions`) musia zostať za bránou.
Mutačne overené: otvorenie `/api/onboarding/` ako prefixu zhodí 4 testy.

## Čo zostáva otvorené

Dve zvyškové riziká vzoru, **ani jedno tu nie je opravené**:
`docs/reports/2026-09-17-a3-onboarding-public-residual-risks.md`
