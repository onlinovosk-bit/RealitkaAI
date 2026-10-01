# Matching Input Contract v1 — odovzdanie D1 → D4

**Stav (2026-09-30):** IMPLEMENTOVANÝ za flagom `DEMAND_MATCHING_ENABLED` (default OFF),
`GO DEMAND-D4`. Na PROD neprodukuje nič, kým nebeží D1 (tabuľka `lead_demands` tam ešte
nie je, backfill gate neprešiel). Kód: `lib/demand/match.ts`, `match-store.ts`,
`app/api/leads/[id]/demand-matches`, `components/leads/demand-matches-card.tsx`,
`scripts/demand-match-run.ts`, migrácia `20260930120000_demand_property_matches.sql`.
**Účel:** aby matching (D4) nevrátil do systému domýšľanie, ktoré D1 odstránil.

```
lead_demands (D1, verified)  ─┐
broker-confirmed demand (*)  ─┼─► MATCHING INPUT ─► matching engine ─► lead_property_matches
properties (Realvia/manual)  ─┘
```
(*) zatiaľ neexistuje. Je to budúci explicitný vstup makléra s označením, kto a kedy ho zadal.

## 1. Čo matching SMIE použiť

| Zdroj | Podmienka |
|---|---|
| `lead_demands`, najnovší riadok leadu | `status = 'ok'`; pole má `value != null`, `source = 'inquiry_text'` a neprázdne `evidence` |
| Dopyt potvrdený maklérom (budúci) | explicitný zápis s autorom a časom; dopyt, ktorý maklér ručne zadal ako „vybral som“, nie predvyplnený |
| `properties` | iba polia, ktoré prišli zo zdroja (Realvia / ručne), nie odhadnuté |

## 2. Čo matching NIKDY nesmie použiť

| Zakázaný vstup | Prečo (dôkaz 2026-09-29) |
|---|---|
| `leads.property_type`, `leads.rooms`, `leads.financing`, `leads.timeline` | Predvyplnené hodnoty sú na **4 miestach v kóde**: `acquire/email` (opravené v #749), `components/leads/lead-create-form.tsx:52-56` („Byt“, „2 izby“, „Hypotéka“, „Do 3 mesiacov“), `lib/universal-import/realvia/map-realvia-client.ts:221` („Byt“), `lib/integrations-store.ts:317` („Byt“). PROD: 59 leadov má zároveň „Byt“ aj „Hypotéka“ a nedá sa odlíšiť, kde to maklér potvrdil. |
| `leads.budget`, `leads.location` | Voľný text bez pôvodu. Použiť sa smie len cez dopyt potvrdený maklérom. |
| Akýkoľvek default alebo fallback (napr. 180 000 € z `forecasting-store.ts:91`) | vymyslená hodnota |
| Pole z `lead_demands` s `rejected` | verifikátor ho zamietol |
| Implicitné odvodenie („pýtal sa na byt v Petržalke → hľadá byt v Petržalke“) | záujem o inzerát nie je dopyt. D4 môže mať samostatný signál „podobné inzerátu“, ale označený ako **signál**, nie dopyt. |

## 3. Pravidlá výpočtu

1. **Neznáme ≠ zhoda ≠ nezhoda.** Pole, ktoré lead nemá, nezvyšuje ani neznižuje
   skóre. Započíta sa do `unknown_fields`.
2. **Minimálny dopyt na zápis zhody:** `property_type` + (`location` alebo
   `budget_max`). Bez toho sa zhoda nezapisuje a lead sa počíta ako „bez dopytu“.
3. **Každá zhoda je vysvetliteľná.** Ukladá sa rozpis po poliach:
   ```json
   { "score": 0.94,
     "fields": {
       "location":      { "status": "match",   "lead_evidence": "v Petržalke", "property_value": "Bratislava - Petržalka" },
       "budget_max":    { "status": "match",   "lead_evidence": "do 180 000 €", "property_value": 172000 },
       "property_type": { "status": "match",   "lead_evidence": "2-izbový byt", "property_value": "byt" },
       "area_min":      { "status": "unknown" } },
     "demand_record_id": "<lead_demands.id>" }
   ```
   UI zobrazí `✓` pri zhode, `✗` pri nezhode a `⚠ neznáme` pri chýbajúcom poli.
4. **Dohľadateľnosť:** každá zhoda nesie `demand_record_id`. Keď sa dopyt zmení
   (nový riadok v `lead_demands`), staré zhody sa prepočítajú, neprepíšu sa potichu.

## 4. Metriky D4 (business výstup, nie „feature exists“)

```
leads celkom
 └─ s platným demand recordom (status ok)
     └─ s minimálnym dopytom (bod 3.2)
         └─ s ≥ 1 zhodou
             └─ zhody, ktoré maklér otvoril / poslal klientovi
```
Až posledný riadok je obchodný výsledok.

## 5. Akceptačné testy D4 (implementované v `lib/demand/__tests__/match.test.ts`, RLS v `tests/rls/demand-matches-rls.test.ts`)

- lead s `property_type` iba v `leads` (napr. „Byt“ z formulára) → **0 zhôd**, `reason = no_verified_demand`
- lead s dopytom v `lead_demands`, ale pole `rejected` → pole sa ignoruje
- zhoda bez `demand_record_id` sa nedá zapísať (constraint)
- budget chýba → budget sa nepočíta, nedosadí sa 180 000 €

## 6. Rozhodnutia pri implementácii (v1)

| Pravidlo | Hodnota | Prečo |
|---|---|---|
| Typ nehnuteľnosti | tvrdá podmienka; typ inzerátu „Neznáme“ = nie je zhoda | PROD typy: Byt, Dom, Chata, Pozemok, Komerčná, Záhradný domček, Neznáme |
| Transakcia | kupa ↔ Predaj, prenajom ↔ Prenájom; riadok „Dopyt“ nikdy; predávajúci/prenajímateľ = `not_a_buyer` | „Dopyt“ v `properties.transaction_type` je dopyt, nie ponuka |
| Stav | iba aktívne („Aktívna“ aj „Aktivna“) | na PROD existujú oba zápisy |
| Lokalita | tvrdá; každé slovo z dopytu ≥ 3 znaky v lokalite inzerátu, pri slovách ≥ 5 znakov stačí zhodných prvých 5 | skloňovanie: „v Petržalke“ ↔ „Petržalka“, „Košiciach“ ↔ „Košice“ |
| Rozpočet | ≤ max ✓; do +10 % ✗ (zobrazí sa); nad +10 % vyradené; bez ceny = neznáme | žiadny fallback; `budget_min` sa nepoužíva na vyradenie |
| Izby, plocha | rozsah min–max; mimo = ✗; chýbajúce = neznáme | |
| Skóre | zhody / (zhody + nezhody), prah 0,6, najviac 10 na dopyt | neznáme nič nepridá ani neuberie |
| Minimum | typ + (lokalita alebo rozpočet) v dopyte **a** aspoň jedna z nich ✓ na inzeráte | typ sám nestačí |

**Mimo v1 (otvorené):**
- Dopyt potvrdený maklérom (§1) neexistuje, D4 číta len `lead_demands`.
- Posledný krok funnelu (§4, „maklér otvoril / poslal klientovi“) sa zatiaľ nemeria.
- Zhody sa prepočítajú pri novom demand recorde, nie pri zmene nehnuteľnosti.
