# North-star backfill — čo 31 dní ukázalo

**Repo install:** 2026-09-15 · **PR:** #558 (`docs/2026-09-17-north-star-w2`)  
**Rozsah:** 2026-08-17 → 2026-09-16 · **Zdroj:** backfill z produkcie  
**Doplnené overenie:** rozpad `leads.source` za ten istý rozsah (spustené 15. 9.)  
**Founder GO / originál:** `north-star-backfill-nalezy.md` (inštalované do tohto reportu)

---

## 1. Hlavný nález: z 28 nových leadov sú 24 seed dáta

Tabuľka hovorí `leads_total 480 → 508`, čiže **+28**. Vyzerá to ako rast.
Doplnil som k tomu rozpad podľa `source`:

| zdroj | počet | prvý | posledný |
|---|---:|---|---|
| Google Ads | 4 | 23. 8. | 30. 8. |
| Portál | 4 | 24. 8. | 30. 8. |
| Odporúčanie | 4 | 24. 8. | 30. 8. |
| Facebook Ads | 4 | 23. 8. | 30. 8. |
| Chatbot | 4 | 24. 8. | 30. 8. |
| Web formulár | 4 | 23. 8. | 30. 8. |
| **`portal:Reality.sk`** | **2** | 7. 9. | 15. 9. |
| **`portal:Nehnuteľnosti.sk`** | **1** | 8. 9. | 8. 9. |
| **`portal:Bazoš.sk`** | **1** | 15. 9. | 15. 9. |

**Šesť zdrojov, každý presne po štyroch, všetky v okne 23.–30. 8.**
Reálna návštevnosť takto rovnomerná nikdy nie je. To je seed dataset.

Skutočné inbound leady sú tie s prefixom `portal:` — **4 za 31 dní**, nepravidelne
rozložené od 7. 9.

> **Z 28 nových leadov sú 24 demo dáta a 4 skutočné.**

Včera som na základe dvoch leadov napísal, že Lead Factory prijíma živé leady
z portálov. Bolo to pravdivé, ale neúplné. Presné číslo je **4 za mesiac** —
a zvyšok by inak nafúkol každé budúce porovnanie.

### Dôsledok pre SQL slučky

`north-star-day.sql` musí `leads_new` rozdeliť:

```sql
count(*) filter (where source like 'portal:%')     as leads_new_real,
count(*) filter (where source not like 'portal:%'
                 or source is null)                as leads_new_seed,
```

Bez toho je každé ďalšie meranie znečistené a trend sa nedá čítať.

### Stav implementácie (2026-09-15)

- SQL definície doplnené v `scripts/sql/north-star-day.sql` a
  `output/overnight/2026-09-15T1955-CEST-north-star/control/queries-to-run.sql`
  (`leads_new` zostáva total; pribudli `leads_new_real` / `leads_new_seed`).
- Historické jsonl riadky **neprepisujeme** (append-only) a **nevymýšľame**
  per-day seed/real split podľa zdrojov — founder dodal agregát, nie denný
  rozpad po šiestich seed zdrojoch.
- Agregát za okno (founder, nie inventované): **seed = 24**, **real (`portal:`) = 4**,
  total new = 28.
- **Re-batch:** founder spustí aktualizovaný `control/queries-to-run.sql` v
  Supabase SQL editore (SELECT only), uloží nový `control/results.json`, potom
  agent (alebo W1) znovu zostaví jsonl s `lead.new_real` / `lead.new_seed`.
  Bez tohto re-batchu historické riadky majú len `lead.new` + `signal.portal_leads`.

---

## 2. Päť krokov loopu je plochá nula 31 dní po sebe

| krok | hodnota za celých 31 dní |
|---|---|
| INTENT | `intents_total` = **3** každý jeden deň, `intents_new` = 0 |
| QUALIFICATION | `matches_total` = **0** každý deň |
| OUTREACH | `auto_responses_sent` = **0** každý deň |
| APPOINTMENT | `viewings` = **0** každý deň |
| MANDATE | `closed_won` = **0** každý deň |

`activities` za celý mesiac: **3** (2 dňa 23. 8., 1 dňa 6. 9.).

Toto je ten istý pomer, ktorý som ukazoval z 30-dňového okna PR, len teraz
deň po dni a s dátumami. **88 zmergovaných PR a 3 aktivity** nie je výkyv
jedného týždňa — je to tvar celého mesiaca.

---

## 3. Jediná vec, ktorá sa v celom datasete viditeľne pohla

```
unread_at_eod
17. 8.  94
        ...  rastie ~3/deň, každý deň
10. 9. 165
11. 9.   1     ← tu
12. 9.   1
13. 9.   0
14. 9.   2
15. 9.   1
16. 9.   1
```

Dvadsaťpäť dní rastúca kopa, potom jeden deň a je preč. **To je nastavenie
`FOUNDER_EMAILS` vo Verceli 10. 9. večer** a prvý beh cronu `notification-digest`
o 07:15 nasledujúce ráno.

Je to **prvá merateľná produkčná zmena pripísateľná konkrétnemu zásahu** v celom
datasete. A stála päť minút.

### A práve ona odhalila dieru v návrhu ledgeru

`merged_prs_that_day` túto zmenu **nezachytí**. Nebol to merge. Bola to zmena
premennej vo Verceli — žiadny commit, žiadny PR.

Čiže: **jediná zmena za mesiac, ktorá naozaj zabrala, je pre atribúciu podľa
PR neviditeľná.** Ak to nedoplníme, ledger bude merať presne ten druh zmien,
ktorý zatiaľ nepohol ničím, a ignorovať ten, ktorý pohol.

**Doplniť do riadku merania:**

```json
"config_changes_that_day": [
  { "kind": "vercel_env", "key": "FOUNDER_EMAILS", "at": "2026-09-10T20:xx" }
]
```

Zdroj sa nedá vytiahnuť z gitu — musí ho zapisovať človek alebo Vercel API.
Minimálne verzia: `docs/ops/config-changelog.md`, jeden riadok na zmenu,
a slučka ho číta. Bez dátumu a kľúča je atribúcia dohad.

### Stav implementácie (2026-09-15)

- Vytvorené `docs/ops/config-changelog.md` s riadkom FOUNDER_EMAILS ~2026-09-10T20:00+02
  (unread 165→1 po prvom digeste 11. 9.).
- Schéma denného riadku v `START-HERE.md` rozšírená o `config_changes_that_day`
  + krok iterácie číta changelog.
- Historické jsonl **neprepisované** (append-only). Atribúcia pre 10./11. 9. žije
  v changelogu + v tomto reporte; po re-batchi / ďalšom dennom meraní pôjde do jsonl.

---

## 4. Realvia: 19 webhookov, ale len na štyroch dňoch z 31

```
25. 8.   7
28. 8.   1
11. 9.   9
15. 9.   2
ostatných 27 dní   0
```

Potvrdzuje a zostruje včerajší nález. Realvia **nie je tok, sú to dávky**.
Keď som 15. 9. napísal „webhook sa vrátil", bolo to presné, ale zvádzalo to
k predstave obnovenej prevádzky. Nie je to obnovená prevádzka.

Otázka pre Realviu tým dostáva konkrétny tvar: *posielate pri každej zmene,
alebo v dávkach? A je štvordňový rozstup normálny?*

---

## 5. Čo z toho vyplýva pre samotnú slučku

| zmena | prečo |
|---|---|
| rozdeliť `leads_new` na `real` / `seed` | inak 24 z 28 leadov znečisťuje trend |
| pridať `config_changes_that_day` | jediná fungujúca zmena za mesiac nemá PR |
| pridať `leads_by_source` ako mapu | „Portál" vs `portal:Reality.sk` sú dva rôzne svety |
| `intents_total` a `matches_total` sledovať ako **dni na nule** | plochá nula sa v dennej tabuľke stráca; počítadlo „N dní bez pohybu" je čitateľnejšie |

Prvé dve sú podstatné. Ostatné dve sú pohodlie. *(Implementované v tomto PR: prvé dve.)*

---

## 6. Čo tento backfill NEDOKAZUJE

- **Nedokazuje, že produkt nefunguje.** Dokazuje, že päť krokov loopu je
  vypnutých — párovanie nikdy nebežalo, auto-response nikdy nebola zapnutá.
  Nula tam nie je zlyhanie, je to dôsledok toho, že sa to ešte nespustilo.
- **Nedokazuje, že seed dáta sú chyba.** Demo dataset má zmysel. Chyba by bola
  počítať ho do rastu.
- **Nemeria kvalitu** tých 4 reálnych leadov — len ich počet.

---

## 7. Report honesty (W2 amendment checklist)

| tvrdenie | dôkaz |
|---|---|
| 5 loop steps flat zero 31 dní | INTENT new / QUALIFICATION / OUTREACH / APPOINTMENT / MANDATE = 0 každý deň (`docs/reports/2026-09-15-north-star-backfill.md`) |
| activities = 3 / mesiac | 2× 23. 8. + 1× 6. 9. |
| Realvia 19 webhookov na 4 dňoch | 7+1+9+2; ostatných 27 dní 0 — dávky, nie tok |
| nuly ≠ produkt broken | matching / auto-response nikdy neboli zapnuté (sekcia 6) |
| `merged_prs` slepé voči Vercel env | FOUNDER_EMAILS 10. 9. → unread drop; žiadny PR v atribúcii |

Predchádzajúci W2 report: `docs/reports/2026-09-15-north-star-backfill.md`.
