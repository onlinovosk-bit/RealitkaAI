# TypeScript Strict Audit

**Dátum:** 2026-06-05  
**Príkaz:** `npx tsc --noEmit --strict` (v `apps/crm`)  
**Počiatočný počet chýb:** 51 riadkov výstupu  
**Po top-5 fixoch:** 36 riadkov (−15)

---

## Celkový počet chýb

| Stav | Počet error riadkov |
|------|---------------------|
| Pred fixom | 51 |
| Po fixe | 36 |

---

## Top 10 súborov (pred fixom)

| # | Súbor | Počet chýb | Kategória |
|---|-------|------------|-----------|
| 1 | `src/lib/profiles/resolve-profile-for-auth.ts` | 5 | null safety / unsafe cast |
| 2 | `src/lib/__tests__/smart-active-program-features.test.ts` | 4 | implicit any / missing export |
| 3 | `src/lib/__tests__/reality-monopol-program-features.test.ts` | 3 | implicit any / missing export |
| 4 | `src/lib/__tests__/market-vision-features.test.ts` | 2 | missing export |
| 5 | `.next/types/...` (Next generated) | 4 | framework / route exports |
| 6 | `src/components/sales-funnel/saas-leads-table.tsx` | 2 | missing Record keys |
| 7 | `src/components/marketing/stealth-funnel/StealthFunnelClient.tsx` | 2 | union property access |
| 8 | `src/lib/billing-store.ts` | 1 | wrong argument type |
| 9 | `src/lib/properties-store.ts` | 1 | GenericStringError cast |
| 10 | `src/types/intelligence-hub.ts` | 1 | impossible union comparison |

---

## Kategórie

| Kategória | Počet (odhad) | Príklady |
|-----------|---------------|----------|
| **Unsafe cast / null safety** | ~8 | `resolve-profile-for-auth.ts`, `properties-store.ts` |
| **Missing export / implicit any** | ~12 | `LicenseCapability` v testoch |
| **Next.js generated types** | ~4 | `.next/types/...` route/page exports |
| **Record completeness** | ~2 | `saas-leads-table` `nda_accepted` |
| **Union narrowing** | ~3 | `StealthFunnelClient`, `intelligence-hub` |
| **Test RequestInit** | ~2 | cron route tests `signal: null` |
| **Billing (out of scope)** | ~1 | `billing-store.ts` |

---

## Opravené — top 5 kritických (type-safety only)

| # | Súbor | Zmena | Blast radius |
|---|-------|-------|--------------|
| 1 | `capability-registry.ts` | Re-export `LicenseCapability` | 12 test chýb |
| 2 | `saas-leads-table.tsx` | Pridaný `nda_accepted` do label/color maps | Sales funnel UI |
| 3 | `intelligence-hub.ts` | Pridaný tier `command` do `AccountTier` | Permissions gating |
| 4 | `properties-store.ts` | Safe cast `data as unknown as Record<...>[]` | Property listing |
| 5 | `StealthFunnelClient.tsx` | Explicitný `StealthProgram` typ s `featured?` | Marketing funnel |

**Neopravené (zámer — DO NOT TOUCH):**
- `resolve-profile-for-auth.ts` — auth
- `billing-store.ts` — billing

---

## Odporúčanie — čo opraviť ďalej

1. **`resolve-profile-for-auth.ts`** — najvyšší blast radius (auth), ale vyžaduje samostatný PR mimo billing/auth zákazu.
2. **Next route export leaks** — presunúť `STEALTH_SCAN_PAYLOAD`, `ARBITRAGE_EMPTY_MESSAGE` mimo route module scope.
3. **Cron test `RequestInit`** — odstrániť `signal: null` v test helpers.
4. **`billing-store.ts`** — samostatný billing PR.

---

## Verifikácia

```bash
cd apps/crm && npx tsc --noEmit --strict 2>&1 | wc -l
# Očakávané: 36 (Windows: Measure-Object -Line)
```
