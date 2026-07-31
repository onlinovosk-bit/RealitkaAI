# Engineering OS — register modulov

**Cieľová cesta:** `docs/architecture/engineering-os/README.md`
**Účel:** jediný prehľad architektonických modulov Revolisu — čo je špecifikované,
čo schválené, čo implementované a za akou bránou. Pravidlá formátu a životného
cyklu: `00-meta.md`. Nadradené dokumenty: `brain/identity/CONSTITUTION.md` →
platné ADR (`docs/architecture/adr-2026-07-28-memory-engine.md`).

Tento register je markdown tabuľka a markdown zostáva kanonický
(rozhodnutie zo sumáru v3). Žiadny JSON registry, generátor ani renderer —
deferred pod Bránu 3.

## Current Focus

- **Graph Engineering** — Reviewed — **Waiting for Founder Approval**
- **Hybrid Retrieval** — Reviewed — **Waiting for Founder Approval**

## Moduly

| Modul | Status | Gate | Last Review | Owner |
|---|---|---|---|---|
| [graph-engineering](graph-engineering.md) | Reviewed | Brána 2 (spúšťač v module) | 2026-07-28 | founder |
| [hybrid-retrieval](hybrid-retrieval.md) | Reviewed | Brána 1 (v1) · Brána 2 (v2) | 2026-07-28 | founder |

## Ako čítať tabuľku

- **Status** — životný cyklus podľa `00-meta.md`:
  Specified → Reviewed → Approved → Implemented → Deprecated.
  Zmena stavu len na explicitný príkaz foundera.
- **Gate** — brána, za ktorou modul smie prejsť do implementácie.
  Brány definuje `COMPANY.md` a ADR (Brána 0 = teraz · Brána 1 = po eval sete ·
  Brána 2 = 3 platiaci zákazníci alebo meratelný spúťač uvedený v module).
- **Last Review** — dátum poslednej kontroly founderom alebo poslednej
  podstatnej zmeny obsahu.
- **Owner** — kto vlastní rozhodnutia modulu. Vždy founder; AI vlastní návrh
  textu, nikdy rozhodnutie.

## Pridanie nového modulu

1. Nový súbor podľa formátu v `00-meta.md` (YAML hlavička + povinné sekcie).
2. Riadok do tabuľky vyššie so statusom `Specified`.
3. PR + GO foundera. Bez GO modul v tabuľke nie je.
