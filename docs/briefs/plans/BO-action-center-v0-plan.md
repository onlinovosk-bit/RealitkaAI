# Plan — Action Center V0

**Status:** READY FOR EXPLICIT IMPLEMENTATION GO · runtime not authorized  
**Build Order:** `docs/briefs/BO-action-center-v0.md`  
**Required phrase:** `GO IMPLEMENT ACTION CENTER V0`  
**Baseline this plan was written against:** `origin/main` `47ec485275166f00671945ed3fd928fac5271508` (fresh fetch 2026-08-24)

Pred prvým editom znovu `git fetch origin main` a porovnaj SHA. Ak sa main posunul, zopakuj D1–D6 proti novému HEAD.

**Zákaz:** checkout / switch / reset / clean / stash / restore na `feat/bridge-harness`. Žiadny import `scripts/ruflo-model-bridge`.

---

## 1. Outcome

Jeden maklér vie schváliť jednu akciu tak, že:

- vidí zmrazený payload,
- server odmietne iný payload než schválený hash,
- dvojklik a HTTP retry nepošlú druhý e-mail,
- timeout ostane `unknown` a nevyvolá automatický retry.

## 2. Design locked

- Tabuľky `action_runs` + `action_events`; `ai_action_audit` sa nemení.
- Flag `ACTION_CENTER_ENABLED` default off.
- `POST /api/outreach/send` ostáva; brána sa obalí, uzavretie je ďalší PR.
- Outbox = Postgres, existujúci cron/route vzor. Nie nový deployable.
- `CREDITS_ENFORCEMENT` sa v tomto slice **nezapína**.

## 3. Implementation slices (až po GO)

1. Migrácia + RLS + allowlist.  
2. Store: freeze payload, unique idempotency, stavový automat.  
3. Route brána pre individuálny e-mail (existujúci Resend send až po `approved`).  
4. Úloha + interná notifikácia (bez e-mailu tretej strane).  
5. UI copy: Navrhnuté kroky / Skontrolovať a vykonať / Centrum akcií.  
6. Verification + RLS testy v tom istom PR ako kód.

1 PR ≠ celý BO, ak by migrácia + UI + send brána boli neseparovateľné — vtedy jeden PR s Tier 3, founder merge. Inak: migrácia PR, potom runtime PR. **Nespájať s Pricing v2.**

## 4. Verification commands

```bash
npx vitest run tests/verification/action-center-v0.verification.test.ts
npx vitest run tests/rls/
npm run test:smoke
```

## 5. Rollback

Flag off. Tabuľky ostávajú. Stará send cesta žije.

## 6. Stop

Pozri BO § Stop. Contradiction report namiesto tichého pokračovania.
