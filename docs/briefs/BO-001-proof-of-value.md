# BO-001 — Proof of Value Engine (/proof)

> Build Order podľa Revolis Builder Protocol (`.cursor/rules/revolis-builder.mdc`)
> Status: **T5 — PR otvorený · founder GO na merge (2026-07-06)**
> Cieľ: majiteľ RK za <5 min od prvej návštevy k rezervácii dema.

---

## 0. Gate check (CLAUDE.md #7 + #8)

**Ústava 12Q (skrátene):** Q1 — feature slúži priamo získaniu ďalšieho
platiaceho klienta (Prime Directive, distribúcia = súčasné úzke hrdlo);
Q8 timing — správny čas (Segment A/B/C outreach aktívny, demo funnel v P3
čaká); Q9 — MVP < 2 týždne: áno, pri reuse nižšie reálne dni. Verdikt:
**BUILD (podmienené founder GO)** → po GO zapísať do `memory/decisions.md`.

**Canon/ADL mapping (AD-019):**
(a) Kanonická entita: **Lead** — Revolisov vlastný saas lead; /proof je nový
Acquire kanál Revolisu. Nedotýka sa tenant dát (verejná route, žiadne agency_id).
(b) ADL: rešpektuje AD-001 (žiadna nová vrstva), AD-007 (honest UI — viď §2),
AD-002 (nulový dosah na tenant izoláciu), AP-019 (žiadna nová tabuľka).

## 1. Integration Report (z reálneho repa, nie z predstáv)

**Existujúce komponenty (REUSE):**

| Potreba BO | Existuje | Cesta |
|---|---|---|
| Leak/ROI výpočet | ✅ hotový model | `app/(marketing)/landing/sections/RoiCalculatorHero.tsx` (monthlyLeakEur: responsePenalty, lostShare, avgRevenuePerDeal) |
| Loading animácia | ✅ | `landing/sections/AiLoading.tsx` (framer-motion, progress, správy) |
| CTA sekcia | ✅ | `landing/sections/FinalCTA.tsx`, `components/landing/CTASection.tsx` |
| Demo form | ✅ | `components/demo/demo-request-form.tsx` |
| Footer/legal | ✅ | `components/marketing/LegalFooter.tsx` |
| Dizajn tokeny | ✅ | `lib/slate-horizon-theme.ts` (SLATE_HORIZON, WORKDESK_CARD) |
| Ikony/sprite | ✅ | `components/shared/radiant-sprite-icon.tsx` |

⚠️ Generický pokyn „použi Button/Card z components/ui" by zlyhal —
`components/ui` obsahuje len NavIcon a Toast. Marketing UI žije v sekciách.

**Existujúce API + patterny (REUSE):**
`POST /api/demo/request` → **`createSaasLead()`** (`lib/sales-funnel-store.ts`,
insert do `saas_leads`) — kanonický pattern pre /api/proof; insert logiku
NEduplikovať, volať ten istý helper. Ďalej: `validateBody` (`lib/api-validate`) ·
`okResponse/errorResponse` (`lib/api-response`) · `incrementUsageMetric`
(`lib/usage-metrics`) · `lib/rate-limit` · `auto-error-capture`.
*(Korekcia po verifikácii 2026-07-06: `capture-lead` píše do `leads_demo`,
nie `saas_leads` — pre BO-001 sa nepoužíva; jeho GDPR-consent vzor však áno.)*

**Existujúca tabuľka (REUSE):** `saas_leads` (name, email, phone, company,
agents_count, city, note, source, status). Odpovede dotazníka →
`note` (JSON) + `source='proof'` + `agents_count`. **Žiadna nová tabuľka,
žiadna migrácia, žiadne AP-019 konanie.**

**Existujúce routes:** `(marketing)` layout, `/demo` (CTA cieľ), `/landing`.

**Vzniká nanovo (jediné):**

1. `app/(marketing)/proof/page.tsx` — kompozícia
2. `components/proof/` — Hero, QuestionStepper, ProgressBar, LoadingAnalysis,
   RevenueScore, MetricCard, RiskCard, CallToAction, ReportLayout
   (tenké obaly nad SLATE_HORIZON tokenmi + vzormi z landing sections)
3. `lib/proof/` — types.ts, schema.ts (zod), engine.ts — **extrakcia a
   rozšírenie** leak modelu z RoiCalculatorHero na Revenue Health 0–100
   (zdieľaný medzi /landing a /proof — odstráni budúcu duplicitu výpočtu)
4. `app/api/proof/route.ts` — tenká route: zod validate → engine →
   `createSaasLead()` (source='proof', odpovede v note JSON) → telemetry.
   (Nerozširujeme capture-lead: iný kontrakt, x-api-key, píše do `leads_demo`;
   zásah doň = riziko regresie demo funnelu, porušenie 1 PR = 1 zmena.)
5. Testy: `lib/proof/__tests__/engine.test.ts` (vitest) + `tests/proof-funnel.spec.ts`
   (Playwright, vzor `landing-roi-mobile.spec.ts`)

## 2. Povinná odchýlka od pôvodného BO — AP-001 (honest copy)

Pôvodný mock: „AI analyzuje…" + „Leady bez follow-up: 41". Bez klientových
dát sú to fake metriky (AP-001, AD-007). Fix so zachovaním persuázie:

- Loading: „Počítame váš odhad z trhových benchmarkov…" (AiLoading vzor).
- Čísla: rovnaká vizuálna váha + label „Odhad z vašich odpovedí × benchmarky
  slovenského trhu" + „Presné čísla uvidíte na vlastných dátach v deme."
- „Leady bez follow-up" → „Leady bez follow-up (odhad pri vašom objeme)".
- CTA nezmenené: „Chcem vidieť analýzu na vlastných dátach → Rezervovať demo."

Poznámka: benchmark konštanty (avgRevenuePerDeal 2400 €, lostShare…) už
v produkcii používa RoiCalculatorHero — /proof ich len zdieľa cez lib/proof.

## 3. Exekučné tasky + brány

| Task | Obsah | Brána |
|---|---|---|
| T1 | `lib/proof/` engine (extrakcia z RoiCalculatorHero) + vitest | AUTO-SAFE |
| T2 | `components/proof/*` + `page.tsx` (SLATE_HORIZON, mobile, dark-safe) | AUTO-SAFE (lokálne) |
| T3 | `api/proof/route.ts` + saas_leads insert + telemetry + rate-limit | AUTO-SAFE (kód), merge = GO |
| T4 | Playwright e2e + landing regresia (RoiCalculatorHero po extrakcii) | AUTO-SAFE |
| T5 | 1 PR + Vercel Preview + zelené CI → founder GO na merge | **GO REQUIRED** |

**Pri otvorení PR (T5):** `memory/decisions.md` záznam sprav podľa šablóny v reporte nižšie — v tom istom PR ako kód, nie skôr.

### Šablóna `decisions.md` (BO-001)

```markdown
## [YYYY-MM-DD] - BO-001 Proof of Value Engine (/proof) — BUILD

- **Rozhodnutie:** Verejná route `/proof` + `lib/proof` engine (extrakcia ROI z landing), `POST /api/proof` → `saas_leads` (`source=proof`, answers v `note` JSON). Žiadna migrácia (AP-019). Honest benchmark copy (AP-001).
- **Brief:** `docs/briefs/BO-001-proof-of-value.md`
- **PR / vetva:** `#___` · `feat/bo-001-proof`
- **Reuse:** `createSaasLead`, `RoiCalculatorHero` leak model → `lib/proof/engine`, `SLATE_HORIZON`, `LegalFooter`
- **Preview smoke:** `/proof` mobile, 6 krokov, lead v `saas_leads` so `source=proof`
- **Merge:** founder GO; nie auto-merge (AP-012)
```

Definícia hotovo (AP-009): PR + zelené CI + preview deploy funkčný na mobile.
