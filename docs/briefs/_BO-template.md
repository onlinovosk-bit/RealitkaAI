# Build Order — BO-XXX: [názov]

> Šablóna pre nové Build Orders. Kopíruj do `docs/briefs/BO-xxx-<slug>.md`.
> Plan Mode: vlož tento brief do Plan Mode (Shift+Tab) → plán ulož do `docs/briefs/plans/BO-xxx-plan.md`.

**Status:** DRAFT | INTEGRATION REPORT | GO | IN PROGRESS | SHIPPED
**Cieľ:** [jedna veta — merateľný výsledok pre klienta]

---

## 0. Gate check (Ústava + Prime Directive)

| Otázka | Odpoveď |
|--------|---------|
| Posúva ďalšieho platiaceho klienta / retenciu? | |
| Timing OK (nie „príliš skoro")? | |
| Verdikt | BUILD / VALIDATE / BACKLOG |

Zapíš do `memory/decisions.md` po founder GO.

---

## 1. Integration Report (povinné pred kódom)

| Položka | Existuje? | Cesta / rozhodnutie |
|---------|-----------|---------------------|
| Komponent | | `src/components/...` alebo `landing/sections/...` |
| API route | | `src/app/api/...` |
| DB tabuľka | | `supabase/migrations/` + allowlist |
| Hook/store | | `src/hooks/`, `src/lib/*-store.ts` |
| Pattern | | api-validate, api-response, rate-limit, usage-metrics |

**Jediná nová vec (ak vôbec):**

---

## 2. Verification map (plán → test → kód)

> Mapovanie akceptačných kritérií na živú špecifikáciu. Index: `docs/briefs/verification-index.md`.

| # | Akceptačné kritérium (merateľné) | Verification test | Playwright smoke | Vitest unit |
|---|----------------------------------|-------------------|------------------|-------------|
| 1 | | `tests/verification/....verification.test.ts` | `tests/smoke.spec.ts` / — | `lib/.../__tests__/` |
| 2 | | | | |
| 3 | | | | |

**Pravidlo:** zmena správania v stĺpci Verification = aktualizácia testu v **tom istom PR**.

---

## 3. Dátový predpoklad

- [ ] Zdroj overený (`docs/architecture/master-data-sourcing-map.md`)
- [ ] GDPR gate (ak PII): `gdpr-advisor` skill + legal basis 6(1)(f)

---

## 4. Scope

### IN
-

### OUT
-

---

## 5. Brány (GO zostáva ľudské)

| Brána | Kto | Kedy |
|-------|-----|------|
| Integration Report | Founder | pred prvým riadkom kódu |
| PR + Preview | agent | po implementácii |
| CI zelené (lint + vitest + build + **Playwright smoke**) | CI | pred merge |
| Merge do main | Founder | po zelenom CI |
| Prod migrácia | Founder | samostatný GO |

---

## 6. Acceptance = Running

1. [ ] Verification testy zo sekcie 2 prejdú: `npx vitest run tests/verification/<súbor>.verification.test.ts`
2. [ ] Playwright smoke: `npm run test:smoke`
3. [ ] [konkrétny manuálny krok — SQL / browser / API response]

---

## 7. Rollback

- PR revert / feature flag:
- DB: forward-only migrácia alebo —

---

## 8. Effort

- [ ] S (<0.5 d) · [ ] M (0.5–2 d) · [ ] L (2–5 d) · [ ] XL (>5 d)

---

## 9. Plan Mode artefakt

Po Plan Mode session ulož implementačný plán do:

`docs/briefs/plans/BO-xxx-<slug>-plan.md`

Plán sa pripája k PR ako živá spec (reviewer vidí intent pred diffom).
