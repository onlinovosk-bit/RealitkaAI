# PR #240 — Guardian CTA deep-link (schválený plán)

**Stav:** schválené na implementáciu · **1 PR** · Guardian brána: 1/5 PROD (bod 3 testom, bod 4 sa opravuje)

---

## Poradie krokov (sekvenčné závislosti)

| # | Krok | Súbory | Závisí na |
|---|------|--------|-----------|
| **3** | `source_id` → Property + SELECT + mapPropertyRow | [`properties-store.ts`](../../apps/crm/src/lib/properties-store.ts) | — |
| **2** | `buildGuardianPropertyEditHref` + unit test + vertical-pack CTA | `property-edit-href.ts`, test, [`vertical-pack/[sourceId]/page.tsx`](../../apps/crm/src/app/(dashboard)/vertical-pack/[sourceId]/page.tsx) | krok 3 (identita v inventári) |
| **4** | searchParams → auto-open **editovateľný** slide-over + not-found | [`properties/page.tsx`](../../apps/crm/src/app/(dashboard)/properties/page.tsx), [`properties-page-client.tsx`](../../apps/crm/src/components/properties/properties-page-client.tsx), [`properties-workspace.tsx`](../../apps/crm/src/components/properties/properties-workspace.tsx) | kroky 3 + 2 |
| **5** | `GuardianPanel.test.tsx` — href obsahuje `source_id`, nie bare `/properties` | [`GuardianPanel.test.tsx`](../../apps/crm/src/components/property/__tests__/GuardianPanel.test.tsx) | krok 2 |
| **1** | vitest + build + PROD re-smoke checklist | CI | všetko vyššie |

---

## Poistka A (krok 3)

- **Aditívne only:** pridať `source_id` do existujúceho SELECT, typu `Property`, `mapPropertyRow`.
- **Žiadna nová migrácia.** Stĺpec už existuje: `20260617120000_uc_export_mapper.sql` → `properties.source_id TEXT`.
- Ak by SELECT zlyhal na chýbajúcom stĺpci → **STOP**, prehodnotiť prístup (UUID fallback), nepretláčať migráciu.

---

## Poistka B (krok 4 — akceptačné kritériá)

### B1 — Identita v URL (krok 2)

CTA href = `/properties?source_id=13303557&edit=1` — **Realvia `source_id`**, nie interné DB UUID.

### B2 — Prázdny / nenájdený stav

Keď `edit=1` + `source_id` v URL, ale ponuka **nie je** v načítanom inventári (RLS, limit 500, filter, chýbajúci import):

- **NESMIE** ticho pristáť na holom `/properties` (rovnaká friction ako dnes).
- **MUSÍ** zobraziť viditeľný stav: banner „Ponuka {source_id} sa v zozname nenašla" + CTA späť / reset.
- Match hľadať v **`allInventory`** (pred client filtrami), nie len vo filtrovanom subsete.

### B3 — Editovateľný, nie read-only

- Auto-open **MUSÍ** otvoriť [`PropertyEditSlideOver`](../../apps/crm/src/components/properties/property-edit-slide-over.tsx) (formulár s cenou, typom, …).
- **NESMIE** navigovať na [`/properties/[id]`](../../apps/crm/src/app/(dashboard)/properties/[id]/page.tsx) (read-only detail).
- Overenie: slide-over má `data-testid="property-edit-slide-over"` (pridať ak chýba) + polia cena/lokalita.

---

## Implementačný detail (krok 4)

```tsx
// properties-page-client — po load inventára
const focusProperty = focusSourceId
  ? allInventory.find(p => p.sourceId === focusSourceId || p.id === focusSourceId)
  : undefined;
const focusNotFound = !loading && autoOpenEdit && focusSourceId && !focusProperty;

// Ak focusNotFound → banner (testid: property-focus-not-found)
// Inak PropertiesWorkspace s autoOpenEdit + focusProperty
```

```tsx
// properties-workspace — useEffect + ref didAutoOpen
if (autoOpenEdit && focusProperty && !didAutoOpen.current) {
  openEdit(focusProperty); // PropertyEditSlideOver, nie Link na /properties/[id]
}
```

---

## Testy

| Test | Assert |
|------|--------|
| `property-edit-href.test.ts` | href contains `source_id=13303557`, not `/properties` alone |
| `GuardianPanel.test.tsx` | `propertyEditHref` with source id in href |
| Voliteľný workspace test | auto-open sets slide-over open when match exists |

---

## Verifikácia po merge (krok 1)

1. `npm run test` (vitest) — green
2. `npm run build` v `apps/crm` — green
3. **PROD re-smoke bod 4:** `/vertical-pack/13303557` → „Upraviť ponuku" → URL má `source_id=13303557`, slide-over edit otvorený
4. **Doklepnúť body 1/2/5** manuálne na PROD
5. **Review diff:** overiť že v diffe je `source_id` (Realvia identita), **nie** zamenené za interné `id`

---

## Mimo scope

- Redesign zoznamu, `/properties/[id]/edit` route, duplicitná completeness karta, Share/Lemon Squeezy, Guardian ako predajný argument pred 5/5 PROD.
