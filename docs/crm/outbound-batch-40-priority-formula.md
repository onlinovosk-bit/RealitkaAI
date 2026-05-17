# Outbound Batch 40 - Priority Tier Formula

Použi súbor `docs/outbound-batch-40-template.csv`.

## Čo doplniť do `priority_tier` (stĺpec V)

Do bunky `V2` vlož:

```excel
=IF(U2>=80,"A",IF(U2>=60,"B","C"))
```

Potom potiahni dole po `V41`.

## Význam tierov

- `A` = kontaktovať hneď (24h)
- `B` = kontaktovať do 72h
- `C` = nurture / neskorší wave

## Odporúčaný workflow

1. Vyplň aspoň stĺpce: `agency_name`, `city`, `listings_count`, `agents_count`, `response_time_min`, pain signály (`O:S`).
2. Skontroluj `fit_score` (stĺpec U).
3. Spočítaj `priority_tier` podľa vzorca vyššie.
4. Zoraď tabuľku podľa `fit_score` desc, potom podľa `priority_tier`.

