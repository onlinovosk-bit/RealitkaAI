# REVOLIS.AI — OVERNIGHT MASTER BRIEF 4.0
# Verzia: 4.0 | jún 2026 | Ruflo mesh swarm — 5 agentov (P-T)
# ═══════════════════════════════════════════════════════════════
# Brief 1.0 (A-E) ✅ HOTOVÝ
# Brief 2.0 (F-J) ✅ HOTOVÝ
# Brief 3.0 (K-O) ✅ HOTOVÝ
# Tento brief (P-T) — OS integrácia + Phase 5 + billing fix
# ═══════════════════════════════════════════════════════════════

## KONTEXT Z OBSIDIAN VAULT — prečítaj PRED akoukoľvek prácou

```
Kľúčové rozhodnutia (z Decision-Log):
- canUseFullApp = true je ZÁMERNÝ override (nemeň!)
- portal_listings = POST-v1 (arbitráž neriešiť)
- Stealth Recruiter = VYPNUTÝ (legal hold, nespúšťaj)
- Migration Intelligence = LIVE (PR #138)

Stav zákazníka:
- Reality Smolko: 439 leadov, Market Vision plán, billing = faktúra
- agency_id: 11111111-1111-1111-1111-111111111111

Aktívne vetvy z predchádzajúcich briefov:
- fix/overnight-feature-health (Brief 1.0)
- feat/migration-intelligence (MERGED)
- feat/morning-brief-v2 (Brief 2.0)
- fix/lead-score-honesty (Brief 2.0)
- feat/deal-trigger-live (Brief 3.0)
```

## GLOBÁLNE PRAVIDLÁ

```
NIKDY nemeň: saas-ops.ts canUseFullApp, auth.ts, billing,
             RLS migrácie, vercel.json, stealth-recruiter.
NIKDY nemergi do main — len PR vytvor.
NIKDY force push.
PRI DOUBT → zastav, zapiš do OVERNIGHT-REPORT-4.md.
```

---

## AGENT-P — Phase 5 Forecast License Gating (TRACK-D)
**Vetva:** `feat/phase5-forecast-gating`
**Scope EXCLUSIVE:** `apps/crm/src/app/(dashboard)/forecasting/` +
                     forecast-related komponenty
**NEDOTÝKAJ SA:** /team, /revolis-ai, billing, saas-ops, auth

### Kontext
canUseFullApp = true znamená že gating sa nezobrazí kým nie je
implementovaný. TRACK-D je prvý krok k reálnemu license enforcement.

### Krok 1 — Nájdi vzor gatingu
```bash
# Nájdi existujúci vzor z MarketHeatmap/DemandHeatmap
grep -r "useLicenseCapabilities\|PremiumLockedOverlay" \
  apps/crm/src --include="*.tsx" -l | head -5

# Prečítaj jeden príklad
cat $(grep -r "PremiumLockedOverlay" apps/crm/src \
  --include="*.tsx" -l | head -1)
```

### Krok 2 — Nájdi forecasting route
```bash
ls apps/crm/src/app/\(dashboard\)/forecasting/
cat apps/crm/src/app/\(dashboard\)/forecasting/page.tsx
```

### Krok 3 — Aplikuj gating vzor
```typescript
// V forecasting/page.tsx pridaj:
import { useLicenseCapabilities } from '@/lib/license/capabilities';
import { PremiumLockedOverlay } from '@/lib/license/PremiumLockedOverlay';

// Wrapper okolo obsahu stránky:
const { hasCapability } = useLicenseCapabilities();
if (!hasCapability('forecasting')) {
  return <PremiumLockedOverlay capability="forecasting" />;
}
```

Ak `useLicenseCapabilities` neexistuje → vytvor stub:
```typescript
// apps/crm/src/lib/license/capabilities.ts
export function useLicenseCapabilities() {
  // Stub — vráti všetko true kým canUseFullApp = true
  // Reálna logika príde po manual_plan DB fix
  return {
    hasCapability: (_cap: string) => true,
  };
}
```

### Krok 4 — Build test
```bash
npm run build --filter=crm 2>&1 | tail -20
```

### Výstup
```
git commit -m "feat(license): gate /forecast with Phase 5 capabilities (TRACK-D)"
gh pr create --title "feat(license): Phase 5 — /forecast gating (TRACK-D)" --base main \
  --body "TRACK-D: Forecast license gating. Capability key: forecasting.
  Note: Returns true for all while canUseFullApp override is active.
  Real enforcement after manual_plan DB migration."
```

---

## AGENT-Q — Phase 5 Team License Gating (TRACK-E)
**Vetva:** `feat/phase5-team-gating`
**Scope EXCLUSIVE:** `apps/crm/src/app/(dashboard)/team/` +
                     team-related komponenty
**NEDOTÝKAJ SA:** /forecast, /revolis-ai, billing, saas-ops

### Krok 1 — Nájdi team route
```bash
ls apps/crm/src/app/\(dashboard\)/team/
cat apps/crm/src/app/\(dashboard\)/team/page.tsx
```

### Krok 2 — Aplikuj rovnaký gating vzor ako AGENT-P
Capability key: `teamManagement`

```typescript
import { useLicenseCapabilities } from '@/lib/license/capabilities';
import { PremiumLockedOverlay } from '@/lib/license/PremiumLockedOverlay';

const { hasCapability } = useLicenseCapabilities();
if (!hasCapability('teamManagement')) {
  return <PremiumLockedOverlay capability="teamManagement" />;
}
```

### Krok 3 — Build test
```bash
npm run build --filter=crm 2>&1 | tail -20
```

### Výstup
```
git commit -m "feat(license): gate /team with Phase 5 capabilities (TRACK-E)"
gh pr create --title "feat(license): Phase 5 — /team gating (TRACK-E)" --base main \
  --body "TRACK-E: Team license gating. Capability key: teamManagement."
```

---

## AGENT-R — Manual Plan DB Migration (agencies.manual_plan)
**Vetva:** `feat/manual-plan-billing`
**Scope EXCLUSIVE:** `supabase/migrations/` (NOVÝ súbor) +
                     `apps/crm/src/lib/saas-ops.ts` (len manual_plan čítanie)
**NEDOTÝKAJ SA:** existujúce migrácie, canUseFullApp override, Stripe logika

### Kontext
Smolko platí faktúrou — Stripe má 0 subscriptions.
`getPlanFromPriceId(null)` = "free" = nesprávny plán.
Riešenie: `agencies.manual_plan` stĺpec ako fallback.

### Krok 1 — Vytvor migráciu
Súbor: `supabase/migrations/20260609130000_agencies_manual_plan.sql`
```sql
-- Add manual_plan column to agencies for non-Stripe customers
ALTER TABLE agencies
ADD COLUMN IF NOT EXISTS manual_plan TEXT DEFAULT NULL;

-- Constraint: iba platné hodnoty
ALTER TABLE agencies
ADD CONSTRAINT agencies_manual_plan_check
CHECK (manual_plan IN (
  'free', 'starter', 'pro', 'scale',
  'market_vision', 'protocol_authority'
) OR manual_plan IS NULL);

-- Index pre rýchle čítanie
CREATE INDEX IF NOT EXISTS idx_agencies_manual_plan
ON agencies(manual_plan) WHERE manual_plan IS NOT NULL;

-- Komentár
COMMENT ON COLUMN agencies.manual_plan IS
  'Manual plan override for non-Stripe customers (e.g. invoice billing).
   Takes precedence over Stripe price_id when set.
   Reality Smolko: market_vision';
```

### Krok 2 — Aktualizuj saas-ops.ts
Nájdi funkciu `getPlanFromPriceId` a pridaj manual_plan fallback.
POZOR: Nemeň `getFeatureFlagsForPlan` ani `canUseFullApp`.

```typescript
// Nájdi kde sa volá getPlanFromPriceId
// Pridaj pred ňu načítanie manual_plan z agencies:

async function getAgencyManualPlan(agencyId: string): Promise<PlanKey | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('agencies')
      .select('manual_plan')
      .eq('id', agencyId)
      .maybeSingle();
    return (data?.manual_plan as PlanKey) ?? null;
  } catch {
    return null;
  }
}

// V getSaasOpsSnapshot — pridaj pred getPlanFromPriceId:
// const manualPlan = await getAgencyManualPlan(profile?.agency_id);
// const plan = manualPlan ?? getPlanFromPriceId(priceId);
```

### Krok 3 — NEAPLIKUJ na prod
Vytvor len súbor migrácie a kód zmenu.
Andy aplikuje ručne v Supabase SQL Editor po review.

### Výstup
```
git commit -m "feat(billing): agencies.manual_plan — non-Stripe plan override"
gh pr create --title "feat(billing): Manual plan support for invoice customers" --base main \
  --body "Adds agencies.manual_plan column for non-Stripe customers.
  Reality Smolko will get manual_plan='market_vision'.
  MIGRATION: Do NOT apply automatically — requires Andy review in Supabase.
  CODE CHANGE: saas-ops.ts reads manual_plan before Stripe price_id."
```

---

## AGENT-S — Obsidian Vault Agent Integration
**Vetva:** `chore/obsidian-vault-integration`
**Scope EXCLUSIVE:** `C:\RealitkaAI-Memory\` (Obsidian vault) +
                     `apps/crm/docs/` (aktualizácie)
**NEDOTÝKAJ SA:** žiadny zdrojový kód

### Kontext
Obsidian vault je live v C:\RealitkaAI-Memory\.
Tvojou úlohou je:
1. Aktualizovať vault podľa dnešného stavu
2. Nastaviť Git sync
3. Vytvoriť AGENTS-CONTEXT.md ktorý budú agenti čítať

### Krok 1 — Aktualizuj Capabilities v vault
```bash
# Skopíruj aktuálny stav z repa do vault
cp apps/crm/docs/market-vision-capabilities.json \
   "C:\RealitkaAI-Memory\03-PRODUCT\market-vision-capabilities.json"
```

### Krok 2 — Vytvor AGENTS-CONTEXT.md
Súbor: `C:\RealitkaAI-Memory\AGENTS-CONTEXT.md`
```markdown
# AGENTS-CONTEXT.md
> Prečítaj na začiatku každého overnight briefu.
> Aktualizovaný: [dátum]

## Aktívne rozhodnutia (neporušovať)
- canUseFullApp = true → zámerný override, NEMEŇ
- Stealth Recruiter → VYPNUTÝ (legal), NESPÚŠŤAJ
- portal_listings → POST-v1, NERIEŠIŤ
- manual_plan migrácia → Andy aplikuje manuálne

## Stav zákazníka
- Reality Smolko: Market Vision, 439 leadov, billing = faktúra

## Hotové PRs (neopakovať prácu)
- #138 Migration Intelligence ✅
- #108 Segmentation 410 ✅
- #105 Forecasting demo cleanup ✅
- #101 Workdesk P0 ✅

## Otvorené vetvy (nekrížiť sa)
- feat/phase5-forecast-gating (Agent-P)
- feat/phase5-team-gating (Agent-Q)
- feat/manual-plan-billing (Agent-R)
- fix/lead-score-honesty
- feat/morning-brief-v2

## Zakazané akcie
- Nemeň saas-ops.ts canUseFullApp
- Neaplikuj supabase migrácie na prod
- Nemergi do main bez Andy
- Nespúšťaj stealth-recruiter cron
```

### Krok 3 — Git init pre vault
```powershell
cd C:\RealitkaAI-Memory
git init
git add .
git commit -m "init: Revolis.AI OS vault v1.0 — Decision Log + Capabilities + Customer Profiles"
```

Ak GitHub repo neexistuje:
```powershell
gh repo create RealitkaAI-Memory --private --source=. --push
```

### Výstup
```
# Vault commitnutý do súkromného repo
# AGENTS-CONTEXT.md vytvorený
# Zapiš do OVERNIGHT-REPORT-4.md
```

---

## AGENT-T — Comprehensive PR Cleanup
**Vetva:** readonly + docs
**Scope EXCLUSIVE:** `gh` CLI readonly + `apps/crm/docs/`
**NEDOTÝKAJ SA:** žiadny zdrojový kód

### Krok 1 — Audit všetkých otvorených PRs
```bash
gh pr list --state open --json number,title,headRefName,mergeable,\
statusCheckRollup --limit 50 | jq '.[] | {number,title,mergeable}'
```

### Krok 2 — Pre každý PR urči
- CI stav (zelený/červený)
- Mergeable (áno/nie/conflict)
- Súvisiace s aktívnymi vetvy (nekrížiť)
- Odporúčanie: MERGE / REBASE / CLOSE / HOLD

### Krok 3 — Bulk close kandidáti
Identifikuj PRs ktoré sú:
- Staršie ako 30 dní
- CI červené bez aktívnej práce
- Superseded novšími PRs
- Slate stack #14-#30 ak nie sú relevantné

### Krok 4 — Vytvor PR-FINAL-MATRIX.md
```bash
cat > apps/crm/docs/PR-FINAL-MATRIX.md << 'EOF'
# PR Final Matrix — [dátum]

## Na okamžitý merge (CI zelené, mergeable)
| PR# | Názov | Vetva |
|-----|-------|-------|

## Na rebase (dobrý kód, zastaralý)
| PR# | Názov | Akcia |
|-----|-------|-------|

## Na close (superseded/stale)
| PR# | Názov | Dôvod |
|-----|-------|-------|

## HOLD (čaká na rozhodnutie)
| PR# | Názov | Bloker |
|-----|-------|--------|
EOF
```

### Výstup
```
git add apps/crm/docs/PR-FINAL-MATRIX.md
git commit -m "docs: PR final cleanup matrix"
git push origin main
```

---

## OVERNIGHT-REPORT-4.md

```markdown
# Overnight Report 4.0 — [dátum]
Agenti P-T | Brief 4.0

## AGENT-P — Phase 5 Forecast Gating
Status: [DONE/PARTIAL/BLOCKED]
PR: feat/phase5-forecast-gating → [link]
useLicenseCapabilities stub: [vytvorený/existoval]
Build: [zelený/červený]

## AGENT-Q — Phase 5 Team Gating
Status: [DONE/PARTIAL/BLOCKED]
PR: feat/phase5-team-gating → [link]
Build: [zelený/červený]

## AGENT-R — Manual Plan Billing
Status: [DONE/PARTIAL/BLOCKED]
PR: feat/manual-plan-billing → [link]
Migrácia: [vytvorená — NE-aplikovať]
saas-ops.ts: [manual_plan čítanie pridané]

## AGENT-S — Obsidian Vault Integration
Status: [DONE/PARTIAL/BLOCKED]
Vault Git: [inicializovaný/nie]
AGENTS-CONTEXT.md: [vytvorený/nie]
GitHub repo: [existuje/vytvorený/chyba]

## AGENT-T — PR Cleanup
Status: [DONE/PARTIAL/BLOCKED]
PR-FINAL-MATRIX.md: [vytvorená]
Na merge: N | Na rebase: N | Na close: N | Hold: N

## Pre Claude ráno
### PRs na schválenie:
- feat/phase5-forecast-gating
- feat/phase5-team-gating
- feat/manual-plan-billing (NEMERGNÚŤ bez manual_plan apply)

### Andy musí urobiť manuálne:
1. Supabase SQL: aplikovať 20260609130000_agencies_manual_plan.sql
2. Supabase SQL: UPDATE agencies SET manual_plan='market_vision'
   WHERE id='11111111-1111-1111-1111-111111111111';
3. Potom merger feat/manual-plan-billing
4. Potom PR na odstránenie canUseFullApp override

### Obsidian:
- Otvoriť C:\RealitkaAI-Memory\ v Obsidiane
- Skontrolovať AGENTS-CONTEXT.md
- Git plugin nastaviť na auto-backup
```

---

## RUFLO SPUSTENIE

```powershell
Copy-Item "$env:USERPROFILE\Downloads\overnight-master-brief-4.md" `
  "C:\RealitkaAI\overnight-master-brief-4.md"

npx ruflo@latest swarm stop --force 2>$null
npx ruflo@latest swarm init -t mesh -m 5
npx ruflo@latest swarm start -o "REVOLIS OVERNIGHT v4.0: Agents P-T. P=phase5-forecast feat/phase5-forecast-gating. Q=phase5-team feat/phase5-team-gating. R=manual-plan-billing feat/manual-plan-billing NO-PROD-APPLY. S=obsidian-vault-integration vault+AGENTS-CONTEXT. T=pr-cleanup docs/PR-FINAL-MATRIX. Each reads overnight-master-brief-4.md AND C:\RealitkaAI-Memory\AGENTS-CONTEXT.md. NO billing override changes, NO RLS apply, NO main merge. Output: OVERNIGHT-REPORT-4.md."
npx ruflo@latest swarm status
```

## CURSOR AGENT PRÍKAZ

```
Prečítaj:
1. overnight-master-brief-4.md z roota repa
2. C:\RealitkaAI-Memory\AGENTS-CONTEXT.md (ak existuje)

Spusti agentov P, Q, R, S, T.
Poradie: S (vault setup prvý) → P → Q → R → T

KRITICKÉ: Agent-R vytvára migráciu ale NEAPLIKUJE na prod.
Na záver: apps/crm/docs/OVERNIGHT-REPORT-4.md
```
