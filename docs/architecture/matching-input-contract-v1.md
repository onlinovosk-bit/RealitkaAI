# Matching Input Contract v1 — odovzdanie D1 → D4

**Stav:** SPEC, nie je implementovaný. D4 (matching) sa stavia až po GO foundera a po
prejdení backfill gate (`docs/architecture/demand-contract-v1.md`).
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

## 5. Akceptačné testy D4 (pri implementácii)

- lead s `property_type` iba v `leads` (napr. „Byt“ z formulára) → **0 zhôd**, `reason = no_verified_demand`
- lead s dopytom v `lead_demands`, ale pole `rejected` → pole sa ignoruje
- zhoda bez `demand_record_id` sa nedá zapísať (constraint)
- budget chýba → budget sa nepočíta, nedosadí sa 180 000 €
