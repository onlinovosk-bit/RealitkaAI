# Changelog: CI/CD + Dashboard stabilita + Billing UX

**Dátum:** 2026-04-14  
**Typ:** bugfix + stabilita + CI/CD

---

## Zistené chyby

### CI/CD (GitHub Actions)

1. **Node.js 20 deprecation** — Oba workflow súbory (`.github/workflows/saas-grade-pipeline.yml` a `apps/crm/.github/workflows/ci.yml`) používali `node-version: 20`, čo generovalo varovanie: *"Node.js 20 actions are deprecated"*.

2. **Artifact path "No files found"** — Workflow `saas-grade-pipeline.yml`:
   - Build step nemal nastavené env premenné (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`), čo mohlo spôsobiť zlyhanie buildu.
   - Upload artifact step nemal `if-no-files-found: warn`, takže pri neúspešnom builde vyhodil chybu.
   - Nebol nastavený npm cache, čo spomaľovalo build.

### Dashboard (app.revolis.ai/dashboard)

3. **Chýbajúce error boundaries** — Aplikácia nemala žiadne `error.tsx` ani `global-error.tsx` súbory. Akýkoľvek uncaught error v renderovaní spôsobil bielu obrazovku bez recovery možnosti.

4. **Dashboard page — nekontrolované zlyhanie API** — `getLeads()` volanie nebolo obalené try/catch, takže ak Supabase vrátil chybu, celý dashboard spadol.

5. **`.env.local` preklep** — `next_PUBLIC_APP_URL` (malé písmená) na riadku 4 — Next.js ignoruje env premenné, ktoré nezačínajú presne `NEXT_PUBLIC_`.

### Billing / Stripe portal

6. **Stripe portal — generický alert()** — Keď užívateľ na free pláne klikol "Spravovať predplatné", zobrazil sa surový `alert()` s textom "Stripe portal URL nebola vrátená." Toto bola zlá UX bez kontextu.

7. **Checkout API — null result neošetrený** — `createBillingCheckoutSession()` vracia `null` keď Stripe nie je nakonfigurovaný, ale API route to nevalidoval a vrátil `{ result: null }`, čo spôsobilo pad na frontende.

---

## Vykonané zmeny

### CI/CD

| Súbor | Zmena |
|-------|-------|
| `.github/workflows/saas-grade-pipeline.yml` | Node 20 → 22 LTS, pridané `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`, pridaný npm cache, pridané env premenné pre build, `if-no-files-found: warn`, `retention-days: 7`, komentár s odkazom na deprecáciu |
| `apps/crm/.github/workflows/ci.yml` | Node 20 → 22 LTS, pridané `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`, pridané `NEXT_PUBLIC_APP_URL` env, `if-no-files-found: warn` |

### Error boundaries (nové súbory)

| Súbor | Účel |
|-------|------|
| `src/app/global-error.tsx` | Globálny error boundary — zachytí akýkoľvek neošetrený error v celej aplikácii |
| `src/app/(dashboard)/error.tsx` | Error boundary pre (dashboard) route group |
| `src/app/dashboard/error.tsx` | Error boundary pre /dashboard segment |

### Dashboard stabilita

| Súbor | Zmena |
|-------|-------|
| `src/app/(dashboard)/DashboardClientShell.tsx` | Pridaný React class-based ErrorBoundary obaľujúci všetky children |
| `src/app/(dashboard)/dashboard/page.tsx` | `getLeads()` obalené try/catch, pridaný `loadError` state s fallback UI |

### Billing UX

| Súbor | Zmena |
|-------|-------|
| `src/app/api/billing/portal/route.ts` | Validácia `hasStripeConfigured`, `hasCustomer`, `url` s konkrétnymi HTTP kódmi a chybovými správami |
| `src/app/api/billing/checkout/route.ts` | Ošetrenie `null` výsledku z `createBillingCheckoutSession`, ošetrenie chýbajúcej URL |
| `src/components/billing/manage-subscription-button.tsx` | Nahradený `alert()` za inline error message; redirect na `/billing` pre užívateľov bez predplatného |
| `src/components/billing/pricing-cards.tsx` | Nahradený `alert()` za inline error banner; pridaný `checkoutError` state |

### Konfigurácia

| Súbor | Zmena |
|-------|-------|
| `.env.local` | Opravený preklep `next_PUBLIC_APP_URL` → `NEXT_PUBLIC_APP_URL_LEGACY` |

---

## Reprodukcia pôvodného problému (pred fixom)

1. **CI varovanie:** Push na `main` branch → GitHub Actions → Annotations sekcia zobrazí "Node.js 20 actions are deprecated" a "No files were found with the provided path".

2. **Dashboard pád:** Prihlásiť sa → navigovať na `/dashboard` → ak Supabase vráti chybu (napr. sieťový problém, neplatný token), stránka zobrazí biely screen bez možnosti recovery.

3. **Stripe portal chyba:** Prihlásiť sa ako free user → Nastavenia → kliknúť "Spravovať predplatné" → zobrazí sa `alert("Stripe portal URL nebola vrátená.")`.

---

## Verifikácia po fixe

1. **CI:** Push zmeny → GitHub Actions → overiť:
   - Žiadne "Node.js 20 deprecated" varovanie
   - Artifact upload prebehne bez "No files found" chyby
   - Build úspešne vytvorí `.next` priečinok

2. **Dashboard:** Prihlásiť sa → `/dashboard` → stránka sa načíta bez chýb. Ak API zlyhá, zobrazí sa "Chyba pri načítaní" s tlačidlom "Obnoviť stránku".

3. **Billing:** Free user → Nastavenia → "Spravovať predplatné" → presmeruje na `/billing` bez alert(). Na `/billing` stránke → klik na plán → ak Stripe nie je aktívny, zobrazí sa inline chybová správa.

---

## Rollback plán

**Posledný stabilný stav:** Commit pred týmito zmenami (aktuálny `HEAD~1`).

**Postup rollbacku:**
```bash
git revert HEAD
git push origin main
```

Vercel automaticky nasadí predchádzajúcu verziu po push na main.

**Ak je potrebný okamžitý rollback bez nového deploy:**
V Vercel dashboarde → Deployments → nájsť posledný úspešný deployment pred touto zmenou → "Promote to Production".
