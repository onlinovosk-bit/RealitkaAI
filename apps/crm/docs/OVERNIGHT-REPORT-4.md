# Overnight Report 4.0 — 2026-06-09

Generovaný: Ruflo mesh swarm + Cursor agent | Brief 4.0 | Agenti P–T  
Brief: `overnight-master-brief-4.md` | Vault: `C:\RealitkaAI-Memory\AGENTS-CONTEXT.md`

---

## Súhrn

| Agent | Scope | Status | PR |
|-------|--------|--------|-----|
| **S** | Obsidian vault + AGENTS-CONTEXT | DONE | — (RealitkaAI-Memory repo) |
| **P** | TRACK-D /forecast gating | DONE | [#150](https://github.com/onlinovosk-bit/RealitkaAI/pull/150) **MERGED** |
| **Q** | TRACK-E /team gating | DONE | [#151](https://github.com/onlinovosk-bit/RealitkaAI/pull/151) **MERGED** |
| **R** | `manual_plan` billing | DONE | [#152](https://github.com/onlinovosk-bit/RealitkaAI/pull/152) **MERGED** |
| **T** | PR matrix + tento report | DONE | [#153](https://github.com/onlinovosk-bit/RealitkaAI/pull/153) **MERGED** |

**Main po Brief 4.0:** `275509f` (fast-forward po #150–#153)

---

## AGENT-S — Obsidian Vault Integration

**Status:** DONE

| Položka | Stav |
|---------|------|
| Vault cesta | `C:\RealitkaAI-Memory\` |
| Git repo | https://github.com/onlinovosk-bit/RealitkaAI-Memory |
| `AGENTS-CONTEXT.md` | vytvorený |
| Capabilities sync | `03-PRODUCT/market-vision-capabilities.json` |
| Posledný vault commit | `8bb7548` (Obsidian auto-backup) |

**Blokery:** —

---

## AGENT-P — Phase 5 Forecast Gating (TRACK-D)

**Status:** DONE  
**PR:** https://github.com/onlinovosk-bit/RealitkaAI/pull/150 — **MERGED** 2026-06-09

| Kontrola | Výsledok |
|----------|----------|
| `useLicenseCapabilities` | existoval (`hooks/useLicenseCapabilities.ts`) |
| Server gate | `getFeatureGateState("forecasting")` v `forecasting/page.tsx` |
| Client gate | `can("canViewForecast")` + `PremiumLockedOverlay` v `ForecastPageClient.tsx` |
| Docs | `apps/crm/docs/TRACK-D-forecast-gating.md` |
| Build | zelený |

**Poznámka:** Gating kód bol na `main` pred PR; PR pridal TRACK-D dokumentáciu.

---

## AGENT-Q — Phase 5 Team Gating (TRACK-E)

**Status:** DONE  
**PR:** https://github.com/onlinovosk-bit/RealitkaAI/pull/151 — **MERGED** 2026-06-09

| Kontrola | Výsledok |
|----------|----------|
| Server gate | `getFeatureGateState("teamManagement")` v `team/page.tsx` |
| Client gate | `TeamPressureGate` + `canAccessTeamPressure` |
| Docs | `apps/crm/docs/TRACK-E-team-gating.md` |
| Build | zelený |

---

## AGENT-R — Manual Plan Billing

**Status:** DONE (kód merged) — **prod SQL čaká na Andy**  
**PR:** https://github.com/onlinovosk-bit/RealitkaAI/pull/152 — **MERGED** 2026-06-09

| Položka | Stav |
|---------|------|
| `saas-ops.ts` | číta `fetchAgencyManualPlan` pred Stripe `price_id` |
| `canUseFullApp` | **nezmenené** (zámerný override) |
| Migrácia stĺpec | `20260607210500_agencies_manual_plan.sql` — na `main` |
| Migrácia CHECK | `20260609130000_agencies_manual_plan_check.sql` — na `main` po #152 |

### Andy — Supabase SQL Editor (prod)

**1. CHECK constraint** (ak ešte nebežalo):

Súbor: `apps/crm/supabase/migrations/20260609130000_agencies_manual_plan_check.sql`

```sql
ALTER TABLE public.agencies
  DROP CONSTRAINT IF EXISTS agencies_manual_plan_check;

ALTER TABLE public.agencies
  ADD CONSTRAINT agencies_manual_plan_check
  CHECK (
    manual_plan IS NULL
    OR manual_plan IN (
      'free', 'starter', 'pro', 'scale',
      'market_vision', 'protocol_authority',
      'active_force', 'enterprise'
    )
  );
```

**2. Nastaviť plán pre Smolka:**

```sql
UPDATE public.agencies
SET manual_plan = 'market_vision'
WHERE id = '11111111-1111-1111-1111-111111111111';
```

**3. Overenie:**

```sql
SELECT id, name, manual_plan
FROM public.agencies
WHERE id = '11111111-1111-1111-1111-111111111111';
-- Očakávané: manual_plan = market_vision
```

**Blokery:** Kód je na prod po Vercel deploy; `manual_plan` hodnota v DB musí byť nastavená ručne.

---

## AGENT-T — PR Cleanup

**Status:** DONE  
**PR:** https://github.com/onlinovosk-bit/RealitkaAI/pull/153 — **MERGED** 2026-06-09

| Metrika | Počet |
|---------|-------|
| Brief 4.0 PRs merged | 4 (#150–#153) |
| Otvorené PRs | **1** (#72 Stealth Recruiter) |
| Na merge okamžite | 0 |
| HOLD | 1 (#72 — legal) |

Matrix: `apps/crm/docs/PR-FINAL-MATRIX.md` (aktualizovať po merge #150–#153)

---

## Ruflo swarm

```
Swarm ID: swarm-mq6hihaw
Topology: mesh, max 5 agents
Objective: REVOLIS OVERNIGHT v4.0 (P–T)
Brief: overnight-master-brief-4.md (repo root)
```

---

## Prod kontext — Reality Smolko

| Položka | Hodnota |
|---------|---------|
| agency_id | `11111111-1111-1111-1111-111111111111` |
| Leadov | 439 |
| Billing | faktúra (Stripe 0 subscriptions) |
| Login (prod) | `rastislav.smolko@gmail.com` — owner, `ui_role: owner_vision`, `auth_user_id` OK |
| `office@realitysmolko.sk` | **žiadny** profil v DB |

---

## Pre orchestrátora / Andy ráno

### Hotové (nemergovať znova)

- #150 TRACK-D forecast docs
- #151 TRACK-E team docs
- #152 manual_plan saas-ops + CHECK migrácia (súbor)
- #153 overnight report + PR matrix

### Andy musí urobiť manuálne

1. **Supabase prod:** spustiť CHECK SQL + `UPDATE manual_plan` (sekcia Agent-R vyššie)
2. **Vercel:** overiť deploy `main` po #152 (saas-ops číta `manual_plan`)
3. **Smoke:** login ako `rastislav.smolko@gmail.com` → billing/plán zobrazuje Market Vision
4. **#72 Stealth Recruiter** — HOLD, nemergovať (legal)

### Ďalší logický krok (mimo Brief 4.0)

- PR na odstránenie `canUseFullApp` override — **až po** `manual_plan` na prod + smoke
- Brief 3.0 PRs (#145–#149) už na `main`

### Obsidian

- Otvoriť `C:\RealitkaAI-Memory\` v Obsidiane
- Skontrolovať `AGENTS-CONTEXT.md`
- Git plugin: auto-backup na `origin/master`

---

## Zakázané akcie (stále platí)

- Nemeň `saas-ops.ts` → `canUseFullApp` bez samostatného PR a smoke
- Nespúšťaj stealth-recruiter cron
- Nemergi #72 bez legal OK
- Neaplikuj nové migrácie na prod bez review
