# Architecture audit — workdesk search

**Date:** 2026-08-24  
**Trigger:** Founder pipeline + `GO FÁZA A` s dvoma povinnými bodmi.  
**Scope:** search/workdesk after #461.  
**Branch:** `cursor/search-architecture-audit-db1f` (súbor **nie je** na `origin/main` `47ec4852` kým sa tento PR nezmerguje).

---

## 1. Evidence catalog

| Surface | Path | Mechanism | Live on `/leads`? |
|---|---|---|---|
| Workdesk topbar | `WorkdeskTopbar.tsx` | `router.push(/leads?q=)` → LeadFilters `q` | Áno |
| Lead filter `q` | `lead-filters.tsx` | Client substring over **loaded** `Lead[]` | Áno |
| Semantic bar | `SemanticSearchBar.tsx` | `POST /api/search/semantic` | Áno |
| SlackLayout header | `SlackLayout.tsx` | Decorative ⌘K, not an input | Nie na workdesk |

Filter fields (verbatim join in `lead-filters.tsx`):  
`name, email, phone, location, budget, status, assignedAgent, source`.

`budget` = rozpočet klienta, **nie** provízia. Provízia v tom zozname nie je.

Page size: `LEADS_PAGE_SIZE = 50` (`leads-store.ts`). `/leads` inventory: `limit=${LEADS_PAGE_SIZE}&offset=0` + load-more (`leads-page-client.tsx`). Legacy cap `LEADS_LIST_MAX = 500` ostáva defaultom, keď page nie je zadaná (`list-pagination.test.ts`).

---

## 2. Conflict / duplication map

| Pair | Same mechanism? | Verdict |
|---|---|---|
| Topbar ↔ LeadFilters `q` | Áno — substring na načítaných riadkoch | Duplikát intentu, zdieľajú `?q=` |
| Topbar ↔ SemanticSearchBar | Nie | Filter zobrazeného vs hľadanie v API |
| SlackLayout ↔ Topbar | Nie na workdesk | Fake ⌘K len mimo workdesk prefixov; stále dekoratívne „Hľadať … províziu“ — mimo Fázy A |

---

## 3. Nález PAGING (vlastné GO — **neopravovať vo fáze A**)

**ID:** `SEARCH-PAGING-CLIENT-FILTER`  
**Závažnosť:** vyššia než copy.

Topbar aj LeadFilters filtrujú **len už načítané riadky**. Zoznam je stránkovaný po 50 (`LEADS_PAGE_SIZE`). Pri agentúre s ~480 leadmi meno mimo aktuálnej stránky vráti prázdny filter pri leade, ktorý v DB je.

To **nie je vyhľadávanie**. Je to filter zobrazeného. Jediné hľadanie na stránke je semantic box (`/api/search/semantic`).

**OUT pre fázu A:** server-side `q`, zväčšenie page size, zlučovanie do jedného inputu, API refactor.

**Odomknutie:** samostatné `GO SEARCH-PAGING` (názov voľný; nie `GO FÁZA A`).

---

## 4. Fáza A — GO prijaté (copy / rola)

Founder GO 2026-08-24, dve povinné podmienky:

1. Z placeholderu topbaru von **„províziu“** — overené poliami filtra.
2. Copy rozlíši **ROLU**: topbar + filtre = filter nad zobrazenými; semantic = hľadanie. Nesmie prekryť paging dieru lepším textom „Hľadať“.

Implementácia v tomto PR (copy only):

- Topbar: „Filtrovať zobrazené — meno, lokalita, maklér…“, tlačidlo **Filtrovať**, bez `role="search"`.
- LeadFilters label: **Filtrovať zobrazené**.
- Semantic: viditeľný nadpis **Hľadať** + „V databáze príležitostí — nielen na tejto stránke.“

---

## 5. Kontrolór

| Tvrdenie | Nálepka | Verdikt |
|---|---|---|
| Report nebol na `origin/main` `47ec4852` | FAKT | PASS — founder; súbor ide týmto PR |
| Filter nehľadá províziu | FAKT | PASS — 8 polí v `lead-filters.tsx` |
| `budget` ≠ provízia | FAKT | PASS |
| Client filter vidí len načítanú stránku | FAKT | PASS — `LEADS_PAGE_SIZE=50` + inventory offset |
| 480 leadov na Smolko PROD | PREDPOKLAD / founder | FLAG — diera platí aj pri >50 |
| Fáza A opraví paging | zakázané | STOP ak by PR menil inventory query |

---

## 6. Ďalšie GO (nenahradené)

- `GO SEARCH-PAGING` — server-side hľadanie / filter cez celý tenant
- `GO IMPLEMENT V0` — blocked (`feat/bridge-harness`)
- Smolko Gmail dual-run
- Close #371 / #374
