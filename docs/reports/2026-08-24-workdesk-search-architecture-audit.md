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

## 3b. Nález TOPBAR GLOBAL (vlastné GO — **neopravovať vo fáze A**)

**ID:** `SEARCH-TOPBAR-GLOBAL-VS-LOCAL`  
**Závažnosť:** architektonická; copy Fázy A ju nespraví.

`WorkdeskTopbar` je v `(dashboard)/layout.tsx` — globálna lišta nad celým workdeskom, nie len nad `/leads`. Rail má aj **Obrat** (`/forecast`) a ďalšie stránky bez leadového zoznamu. Copy „Filtrovať zobrazené“ je lokálny filter; submit aj tak robí `router.push(/leads?q=)`. Na stránke, kde nie je čo zobrazené filtrovať, je to globálny vstupný bod pomenovaný ako lokálny filter.

Poctivé riešenie (rozhodnúť v `GO SEARCH-PAGING`, nie tu):

1. **Preferované:** lišta = hľadanie v databáze (server-side `q` / semantic); klientsky filter ostane na stránke leadov pri ostatných filtroch. Lišta je miesto, kde maklér hľadá „nájdi mi Šimkovú“, nie „zúž zoznam“.
2. **Alternatíva:** v lište ostane filter, ale renderuje sa len na stránkach, kde má čo filtrovať (`/leads` a prípadne ďalší paged list).

**OUT pre fázu A:** presun inputu, podmienený render, zlučovanie so semantic boxom.

**Odomknutie:** to isté `GO SEARCH-PAGING` — paging diera a globál vs lokál sa rozhodujú naraz, lebo obe stoja na serverovom `q`.

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
| Topbar je globálny vstup pomenovaný ako lokálny filter | FAKT | PASS — `WorkdeskTopbar` v dashboard layoute; submit vždy `/leads?q=` |
| Fáza A schová topbar mimo `/leads` | zakázané | STOP — patrí k `GO SEARCH-PAGING` |

---

## 6. Ďalšie GO (nenahradené)

- `GO SEARCH-PAGING` — server-side `q` cez celý tenant **a** rozhodnutie globálna lišta vs lokálny filter (`SEARCH-PAGING-CLIENT-FILTER` + `SEARCH-TOPBAR-GLOBAL-VS-LOCAL`)
- `GO IMPLEMENT V0` — blocked (`feat/bridge-harness`)
- Smolko Gmail dual-run
- Close #371 / #374
