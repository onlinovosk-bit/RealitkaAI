# Amendment — Realvia mapper depth (Launch Pack IR + #511)

**Dátum:** 2026-09-03  
**Režim:** docs-only · STOP · žiadna oprava `processQueue.ts`  
**Ingest:** `docs/prompts/task-realvia-mapper-depth-2026-09-03.md` (founder)  
**Overenie:** SELECT `ypgajkhqtbriqqmyawyv`, Smolko `11111111-…-111`, 132 riadkov  
**Parent IR:** `docs/reports/2026-09-03-property-launch-pack-integration.md`  
**#510 / #511:** už **MERGED** — toto je doplnok, nie re-open.

---

## 0. Čo sa mení voči #511

| #511 / skorší text | Po doplnení (FAKT) |
|---|---|
| Ostatné 63–65 % = neúplný `mapCategory` | Platí **a** kódy **13/14** sú mapované **nesprávne** (`Dom` na bytoch) |
| `transaction_type` všetko Predaj → „0 prenájmov“ | **Zrušené ako fakt o biznise.** Stĺpec je výstup rozbitého `mapTransaction`; Realvia `123` ≈ prenájom podľa titulov (53 ks / 40 %) |
| Predaná = 0 | Platí pre **`status`**, nie realitu: **11** titulov obsahuje `***PREDANÉ***` pri `status=Aktívna` |
| P0 len `mapCategory` | P0 aj **`mapTransaction`** (v #511 chýbal) |

---

## 1. `mapCategory` — potvrdené + hlbšie

- Re-count: **86 / 132 = 65,2 %** `Ostatné` (správny; 83/63 % bol nízky — bez stiahnutých).
- TODO nad funkciou: *Populate from Realvia číselníky documentation* — nikdy nedoplnené.
- **Horšie než chýbajúce:** kódy **13** (14 ks) a **14** (2 ks) → náš `type=Dom`, tituly hovoria o **bytoch** (prenájom aj predaj, aj dopyt). Nesprávna kategória, ktorá *vyzerá* správne, prejde do porovnateľných.

Plná tabuľka kódov: founder ingest §2 (diagnostika z titulov = **nie** produkčný číselník).

---

## 2. `mapTransaction` — P0 (v #511 chýbal)

Kód (`processQueue.ts` ~496–502):

```ts
const transactionMap = { 123: 'Predaj', 124: 'Prenájom', 125: 'Dražba' };
return transactionMap[transaction] ?? 'Predaj';
```

Prod `payload_raw->advert.transaction` (Smolko):

| Realvia kód | ks | náš `transaction_type` | title ~ prenájom |
|---:|---:|---|---:|
| 127 | 68 | Predaj | 0 |
| **123** | **53** | **Predaj** (explicitne v mape) | **44** |
| 122 | 11 | Predaj (`??` default) | 0 |

**123** je v mape ako Predaj, ale podľa titulov takmer isto **Prenájom** — rovnaký pattern ako 13/14: **zlé**, nie len chýbajúce.  
**122 / 127** mapper nepozná → default Predaj.

Tvrdenie „Smolko nemá ani jeden prenájom“ bolo **nesprávne** — čítal sa výstup mappera ako fakt.

---

## 3. Predaj v titule, nie v `status`

**11** ponúk: `title` obsahuje `***PREDANÉ***`, `status = Aktívna`.  
Nepoužívať na krivky ani backfill statusu. Signál: stav predaja Realvia niekde nesie; náš sync ho do `status` neprekladá.

---

## 4. Dôsledky pre Property Launch Pack V0

1. Launch Pack **nesmie** tvrdiť `type` ani `transaction_type` z DB bez **potvrdenia maklérom** (alebo oficiálneho číselníka + opravenej sync vrstvy).
2. Quality Guardian: mapped `type`/`transaction_type` = **neoverený fakt**, kým maklér nepotvrdí — inak „Dom na predaj“ na byt na prenájom.
3. Concierge / filtre nájom↔predaj nad týmito stĺpcami dnes **vrátili by nezmysly**.
4. **`GO IMPLEMENT PROPERTY LAUNCH PACK V0` až po:** oficiálny číselník od Realvie → oprava mapperov (samostatné GO) → backfill (samostatné GO).

### Zakázané v tomto PR / teraz

- Opravovať `mapCategory` / `mapTransaction` v kóde  
- Odvodiť číselník z titulov do produkčného mappera  
- Prepisovať `status` podľa `***PREDANÉ***`

---

## 5. Governance (doplnok k „audit kódu ≠ audit dát“)

> **Počet riadkov dokazuje, že dáta existujú. Nedokazuje, že sú správne.**  
> Pole vzniknuté mapovaním z externého zdroja sa overuje proti **nezávislému signálu** z toho istého záznamu (tu: `title` vs `type` / `transaction_type`).

Vrstva za „PRODUCTION DATA EXISTS“.
