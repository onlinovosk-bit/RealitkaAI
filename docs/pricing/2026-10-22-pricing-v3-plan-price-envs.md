# Pricing v3: Stripe Price ID po pláne a období

## Model Stripe katalógu

Revolis licencia má byť jeden Stripe Product s viacerými Price objektmi. Product reprezentuje predávanú licenciu; Price reprezentuje obchodný variant: pásmo `Start`, `Team`, `Kancelária`, `Sieť` a obdobie `monthly/yearly`. Tento model zodpovedá existujúcemu checkoutu: aplikácia odvádza pásmo z počtu maklérov a Stripe line item nesie `quantity = počet maklérov`.

Samostatné produkty pre štyri plány by zbytočne rozdelili rovnakú licenciu, sťažili reporting a nezmenili entitlement logiku. Pásmo aj granty ostávajú aplikačné pravidlá odvodené z počtu maklérov.

## Env premenné

Nové Price ID:

- `STRIPE_PRICE_V3_START_MONTHLY`
- `STRIPE_PRICE_V3_START_YEARLY`
- `STRIPE_PRICE_V3_TEAM_MONTHLY`
- `STRIPE_PRICE_V3_TEAM_YEARLY`
- `STRIPE_PRICE_V3_KANCELARIA_MONTHLY`
- `STRIPE_PRICE_V3_KANCELARIA_YEARLY`
- `STRIPE_PRICE_V3_SIET_MONTHLY`
- `STRIPE_PRICE_V3_SIET_YEARLY`

Dočasný fallback počas migrácie:

- `STRIPE_PRICE_V3_SEAT_MONTHLY`
- `STRIPE_PRICE_V3_SEAT_YEARLY`

Pravidlo fallbacku: nová premenná má prednosť. Ak je nová premenná nastavená, ale nie je platné `price_...`, checkout pre daný plán zlyhá bezpečne a v odpovedi sa vráti iba názov tejto env premennej. Ak nová premenná vôbec nie je nastavená a stará intervalová premenná je platná, použije sa stará hodnota.

## Cenník

Všetky sumy sú bez DPH. Ročná fakturácia používa mesačný základ × 12. Mesačná fakturácia je mesačný základ + 20 %.

| Počet maklérov | Pásmo | Mesačný základ pri ročnej fakturácii |
|---:|---|---:|
| 1 | Start | 25 € |
| 2-5 | Team | 65 € |
| 6-10 | Kancelária | 65 € + 9 € za makléra nad 5 |
| 11-20 | Sieť | 110 € + 6 € za makléra nad 10 |
| 21+ | Sieť | 170 € + 5 € za makléra nad 20 |

Kontrolné body: 20 maklérov = 170 € mesačný základ; 30 maklérov = 220 € mesačný základ.

Zľavový kód nie je súčasťou tejto zmeny.
