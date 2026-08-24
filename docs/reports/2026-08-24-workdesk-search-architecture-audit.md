# Architecture audit — workdesk search (read-only)

**Date:** 2026-08-24  
**Trigger:** Founder pipeline (evidence → duplication → delta → plan → Kontrolór → GO fázy).  
**Scope:** search/workdesk after #461. Not Agent OS V0, not billing, not Gmail.  
**Runtime change:** none.

`origin/main` at audit: `47ec4852` (`fix(ui): make topbar search functional, add Hľadať button (#461)`).

---

## 1. Evidence catalog

| Surface | Path | Mechanism | Live on `/leads`? |
|---|---|---|---|
| Workdesk topbar | `apps/crm/src/components/layout/WorkdeskTopbar.tsx` | Form submit → `router.push(/leads?q=)` | **Áno** — dashboard layout always mounts it |
| Lead filter `q` | `apps/crm/src/components/leads/lead-filters.tsx` | Client substring over loaded `Lead[]` (`name/email/phone/location/…`) | **Áno** — hydratuje `?q=` |
| Semantic bar | `apps/crm/src/components/search/SemanticSearchBar.tsx` | `POST /api/search/semantic` → dropdown, link `/leads/:id` | **Áno** — `leads-module.tsx` |
| SlackLayout header | `apps/crm/src/components/navigation/SlackLayout.tsx` | Decorative `<span>` + fake ⌘K, **not an input** | **Nie** na workdesk: `isWorkdeskRoute` skips this header (`apps/crm/src/lib/workdesk-routes.ts`) |
| Properties semantic | `properties-page-client.tsx` | Same SemanticSearchBar `type="properties"` | N/A (`/properties`) |

Dôkaz workdesk skip: `SlackLayout` `if (workdesk) return children-only shell` — žiadny druhý topbar na `/leads`.

Dôkaz dual chrome na `/leads`: `(dashboard)/layout.tsx` renderuje `WorkdeskTopbar`; `leads-module.tsx` renderuje `SemanticSearchBar` + `LeadFilters`.

---

## 2. Conflict / duplication map

| Pair | Same thing? | Verdict |
|---|---|---|
| Topbar ↔ LeadFilters `q` | **Áno** — obe substring filter na zozname leadov | Duplikát **intentu**. Topbar je globálny vstup; filter je lokálny. Po #461 zdieľajú `?q=`. |
| Topbar ↔ SemanticSearchBar | **Nie** — filter vs API lookup + similarity dropdown | Zámena pojmov, ak sa zlejú do jedného poľa |
| SemanticSearchBar ↔ LeadFilters | **Nie** — entity jump vs tabuľkový filter | Koexistujú zámerne |
| SlackLayout „search“ ↔ Topbar | Vizuálny cousin, iný strom | Na workdesk sa Slack header **nerenderuje**. Na `/admin` atď. ostáva mŕtvy ⌘K |

**Konflikt po #461:** maklér na `/leads` vidí tri boxy, ktoré vyzerajú ako „hľadať“, ale robia dve mechaniky.

---

## 3. Architecture delta

**Teraz**

```text
WorkdeskTopbar ──push──► /leads?q= ──hydrate──► LeadFilters.q ──filter──► loaded rows
LeadsModule ──type──► SemanticSearchBar ──POST /api/search/semantic──► /leads/:id
SlackLayout fake search ──only non-workdesk prefixes──► no-op
```

**Cieľ (návrh, nie BUILD)**

```text
Jedno globálne pole (topbar) = „nájdi a skoč“ (semantic + fallback)
Jedno page pole (filtre) = „zúž tabuľku“
Žiadny dekoratívny ⌘K
```

To **nie je** V0 Agent OS a **nie je** zlučovanie do jedného inputu v jednom PR.

---

## 4. Phased program

| Fáza | Čo | IN | OUT | Verdikt |
|---|---|---|---|---|
| **A** | UX honesty na `/leads` | Copy/placeholder: topbar = „Filtrovať leady…“; semantic = ostane AI lookup. Žiadne mazanie API. | Zlučovať mechaniky, SlackLayout | VALIDATE, 1 PR |
| **B** | Topbar → semantic command (global jump) | reuse `SemanticSearchBar` / `/api/search/semantic` | Nový search engine | VALIDATE až po A + dôkaz, že Smolko semantic používa |
| **C** | SlackLayout decorative header | odstrániť fake ⌘K na non-workdesk | Nový command palette | BACKLOG — nízka retencia |

Kill: ak A mení kontrakt `?q=` bez verification testu; ak B ticho zmení topbar z filtra na API bez fallbacku.

---

## 5. Kontrolór

| Tvrdenie | Nálepka | Verdikt |
|---|---|---|
| #461 je na `main` `47ec4852` | FAKT (`gh pr view 461` mergedAt 2026-08-24T06:12:59Z) | PASS |
| Na `/leads` sú 3 search UI | FAKT (layout + leads-module) | PASS |
| Všetky tri robia to isté | PREDPOKLAD — vyvrátené kódom | FLAG / zámena pojmov |
| SlackLayout search mätie workdesk | PREDPOKLAD — na workdesk sa nerenderuje | FAIL ako blocker; platí len mimo workdesk |
| Klient dnes zaplatí za zjednotenie search | NEZNÁME | FLAG — max VALIDATE |
| Semantic API je spoľahlivé na PROD | NEZNÁME (iba kód, žiadny PROD log) | STOP pre fázu B |
| Tento audit nahrádza Agent OS V0 / Gmail dual-run | PREDPOKLAD | STOP — P0 zákazník ostáva Gmail; V0 ostáva blocked na `feat/bridge-harness` |

**Verdikt:** PASS ako read-only mapa. **STOP implementácia** kým founder nepovie `GO FÁZA A` (alebo iná fáza).

---

## 6. Explicit GO — fáza A

**Navrhovaná A:** iba copy/aria, aby topbar a semantic neklamali že sú to isté pole. Žiadny API/layout refactor.

**Nepúšťať A autonómne.** Čaká:

```text
GO FÁZA A
```

Iné GO, ktoré tento audit **nenahrádza**:

- `GO IMPLEMENT V0` — stále blocked (chýba `feat/bridge-harness`)
- Smolko Gmail dual-run — Preview secrets + send draft
- Close #371 / #374 — superseded billing, stále OPEN
