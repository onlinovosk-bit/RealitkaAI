# Žiadosť o oficiálny číselník Realvia (kategória + transakcia)

**Dátum:** 2026-09-03  
**Prečo:** CRM mapper nepozná väčšinu kódov a nesmie ich odvodiť z titulov.  
**Kód:** `apps/crm/src/lib/realvia/map-taxonomy.ts` (P0 honest unknown → `Neznáme`)

## Čo potrebujeme od Realvie

Oficiálny číselník (PDF / xls / API docs) s významom:

1. **`advert.category`** — všetky kódy, ktoré posielajú (u Smolka mimo 11–20 najmä 9, 13, 14, 27, 28, 30, 34, 35, 37, 41, 46, 47, 48, 57, 60, 61, 65).
2. **`advert.transaction`** — kódy **122, 123, 124, 125, 127** (a ďalšie, ak existujú).

Bez toho ostáva 13/14 a 123 zámerne `Neznáme` — nehádame Byt/Prenájom z titulov.

## Draft (skopírovať)

Predmet: Realvia číselník category + transaction pre integráciu

Dobrý deň,

integrujeme Realvia webhook do CRM. V payloade `advert.category` a `advert.transaction` dostávame číselné kódy. Máme mapovanie len pre časť kategórií (11–20) a transakcií (124, 125). Ostatné kódy evidujeme ako neznáme, kým nemáme oficiálny číselník.

Prosím o aktuálnu dokumentáciu / číselník:

- význam `advert.category`
- význam `advert.transaction`

Ďakujeme.

## STOP

Neplniť `map-taxonomy.ts` z tohto draftu. Až príde oficiálny dokument: samostatné GO (mapper + backfill).
