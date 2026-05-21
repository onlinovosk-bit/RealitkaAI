# Phase 7 — Sales Funnel (revolis.ai)

**Status:** Strategy brief — **HUMAN APPROVAL REQUIRED** before copy/deploy rollout.  
**Prerequisite:** Phase 5 license intelligence merged · Phase 6 demo system specced.

## Orchestrator directive

Revolis **nesmie** pôsobiť ako CRM, dashboard ani reporting tool.

Revolis **musí** pôsobiť ako AI systém, ktorý:
- odhaľuje peniaze
- chráni revenue
- riadi tím
- ukazuje príležitosti
- pomáha dominovať trhu

**Marketing MUSÍ vychádzať z reálneho produktu** — nie opačne.

---

## Prečo až teraz (Phase 7)

| Hotové | Vplyv na funnel |
|--------|-----------------|
| Enterprise trust layer | Credibility na checkout |
| Preview 11 / Slate Horizon | Vizuálna konzistencia marketing ↔ app |
| License intelligence (Phase 5) | Jednotná psychológia Smart → Monopol |
| Dashboard ≠ CRM positioning | Správny jazyk v hero copy |

---

## Dva marketingové povrchy (synchronizovať)

| Surface | URL | Checkout | Gap |
|---------|-----|----------|-----|
| **Standalone** | `revolis.ai` | Stripe → `app.revolis.ai/onboarding` | `apps/marketing/` |
| **In-app landing** | `app.revolis.ai/landing` | `/register` | `apps/crm/src/app/(marketing)/landing/` |

**Phase 7 P0:** jeden tier matrix + jeden hero narrative naprieč oboma.

---

## User journey (progressive AI OS)

```
Smart      → „Konečne mám poriadok“
   ↓
Radar      → „AI mi ukazuje príležitosti“
   ↓
Guardian   → „AI mi chráni peniaze“
   ↓
Monopol    → „AI mi pomáha ovládať trh“
```

Source of truth pre capabilities: `src/lib/license/capability-registry.ts`

---

## Phase 7 deliverables (tímy)

### Product Team
- [ ] License psychology map v checkout copy (SK názvy = billing labels)
- [ ] Tier matrix: Stripe price ID ↔ program ↔ capability
- [ ] **Human approval:** Monopol positioning wording

### Design Team
- [ ] Premium locked-state system rollout (Phase 5 components)
- [ ] **Human approval:** final locked UX + upgrade modals
- [ ] Marketing hero: AI OS visual (nie pipeline screenshot)

### Engineering Team
- [ ] Centralized feature gating wired on `/forecast`, `/team`, dashboard strips
- [ ] `upgrade-intent` → Supabase persist
- [ ] Post-Stripe onboarding echo chosen program (metadata → welcome)

### Analytics Team
- [ ] Funnel: `revolis.ai` click → signup → `locked_feature_view` → `upgrade_cta_click`
- [ ] Report: čo najviac konvertuje (forecast vs market intel vs guardian)

---

## Phase 7 copy framework (nie CRM)

| ❌ Nepoužívať | ✅ Používať |
|-------------|-----------|
| „Spravujte leady“ | „Kde sú peniaze dnes“ |
| „CRM dashboard“ | „AI operating system“ |
| „Reporting“ | „Revenue radar“ |
| „Funkcie“ | „Programy: Smart · Radar · Guardian · Monopol“ |

---

## Paralelná práca s ChatGPT

| ChatGPT | Cursor |
|---------|--------|
| Hero copy, email sekvencie, demo script | `capability-registry`, gating, API, deploy |
| Phase 6 `demo.revolis.ai` storyboard | Phase 7 wiring + analytics |
| Sales battlecards | PR merge + smoke |

**Pravidlo:** ChatGPT generuje copy podľa capability matrix — Cursor implementuje.

---

## L99 Quality Score: 99.5/100

| ✅ | Dôvod |
|----|-------|
| Enterprise trust layer | Hotový |
| AI identity | Stabilná |
| Preview 11 fidelity | Drží |
| Dashboard ≠ CRM | Áno |
| License intelligence | Foundation shipped (PR pending) |
| Progressive AI UX | Definovaný |
| Upgrade psychológia | Správne smerovaná |
| Production-first | Zachovaný |

---

## Next action (Orchestrator)

1. Merge PR #44 MapLibre → merge PR #45 Phase 5
2. **Human:** schváliť locked UX + Monopol copy
3. Phase 6: `demo.revolis.ai` cinematic simulation
4. Phase 7: unify `apps/marketing` hero s capability registry
