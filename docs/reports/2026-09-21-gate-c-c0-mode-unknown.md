# Gate C / C-0 — MODE riadok: EVIDENCE INSUFFICIENT

**Dátum:** 2026-09-21  
**Otázka:** Aký bol prvý riadok výstupu behu C-0 (`MODE: local` vs `MODE: remote`)?

## Verdikt

**`unknown`** — v tejto session ani v dohľadateľných lokálnych artefaktoch (terminals, `docs/reports`, agent transcripts mimo aktuálnej otázky, `git grep` na `origin/main`) **neexistuje uložený stdout C-0** s riadkom `MODE:`.

Táto session produkovala len: open-PR repro stack (#576) a CI investigator pre #374 Memory Engine. **C-0 sa tu nespúšťal.**

## Čo je overené z kódu (`origin/main:scripts/bus/handshake.ts`)

| Tvrdenie | Dôkaz |
|---|---|
| Bez `--url` → local temp `FileBusStore` + loopback | `startLocalServer` + `else` vetva v `main()` |
| S `--url` bez `REVOLIS_BUS_TOKEN` → `exit 1` | riadky okolo token check |
| Prvý log riadok je `MODE: local …` alebo `MODE: remote …` | `record(ctx, "MODE: …")` pred testami |
| Koncový `COPY_PASTE_REQUIRED:` rozlišuje režimy | `record(ctx, \`COPY_PASTE_REQUIRED: ${remoteUrl ? …}\`)` |

Identifikačná tabuľka (vetva A vs B/C podľa `MODE:`) je teda **platná voči implementácii**. Chýba len **skutočný výstup behu**.

## Čo agent neurobil

- Nespúšťal `bus:handshake` (ani local, ani remote) — remote by vyžadoval token/tunnel a founder GO; local by nedokázal, aký bol *predchádzajúci* C-0.
- Nedomýšľal `MODE: local` ani `MODE: remote`.

## Požadovaný vstup od foundera / behu

Doslovný **prvý riadok** stdout C-0, alebo celý log súbor. Bez neho:

```
GATE C: BLOCKED / EVIDENCE INSUFFICIENT
C-0  čaká na MODE: riadok
C-1..C-3  NEODBLOKOVANÉ
```
