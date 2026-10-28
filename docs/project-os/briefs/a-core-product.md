# A — REVOLIS CORE PRODUCT

Misia: CRM pre realitné kancelárie (leady, kontakty, nehnuteľnosti, aktivity, pipeline, skóring, matching). Tento brief je rozcestník. Nenahrádza [STATUS.md](../../STATUS.md) ani [memory/decisions.md](../../../memory/decisions.md).

## Aktuálny stav z tohto behu

Overené čítaním súborov 2026-10-23, nie novým meraním produkcie:

- Aplikácia CRM je v `apps/crm`. Ďalšie appky v koreni `apps/`: `marketing`, `realvia-ingestion`, `revenue-intelligence` (výpis `ls`).
- [docs/STATUS.md](../../STATUS.md) má v hlavičke vážený odhad ≈ 51 % z prepočtu 2026-10-05. Novší riadok 2026-10-16 hovorí, že tabuľka sa neprepočítava, kým nie je živý nákup. Predaj / platby je v tabuľke 0 % s odkazom na [docs/reports/2026-10-20-stripe-krok-c-blokator.md](../../reports/2026-10-20-stripe-krok-c-blokator.md). V tomto behu som Stripe a produkčnú databázu nečítal. Číslo je stav dokumentu, nie nové meranie.
- Päť discovery súborov existuje: [ARCHITECTURE.md](../../discovery/2026-10-21/ARCHITECTURE.md), [DATA_FLOWS.md](../../discovery/2026-10-21/DATA_FLOWS.md), [INTEGRATIONS.md](../../discovery/2026-10-21/INTEGRATIONS.md), [FINDINGS.md](../../discovery/2026-10-21/FINDINGS.md), [OPEN_QUESTIONS.md](../../discovery/2026-10-21/OPEN_QUESTIONS.md). Ich obsah som v tomto behu znova nepočítal.
- SESSION blok v STATUS.md má odškrtnuté míľniky 1–7 discovery a steny doručiteľnosti. CI na heade tej steny je v tom bloku označené ako nemerané.

## Rozhodnutia (historický zápis, v tomto behu znova nemerané)

| Zápis | Čo z neho brief preberá | Cesta |
|---|---|---|
| 2026-10-21 Cenník v3 | Licenčné pásma a to, že v čase zápisu v PROD ešte neboli `STRIPE_PRICE_V3_*` | [memory/decisions.md](../../../memory/decisions.md) |
| 2026-10-20 GO STRIPE-C | Blokátor platieb je chýbajúca premenná `STRIPE_PRICE_V3_SEAT_MONTHLY`, nie pád testov v tom behu | ten istý súbor a [report](../../reports/2026-10-20-stripe-krok-c-blokator.md) |
| 2026-10-20 Speed / time-saving | Roadmapa a texty len o funkciách označených ako LIVE v tom zápise | [docs/strategy/2026-10-20-speed-time-saving-roadmap.md](../../strategy/2026-10-20-speed-time-saving-roadmap.md) |
| 2026-10-22 Doručiteľnosť | Kód odhlásenia a potlačenia je v repozitári na `main` (`a2e42ace`, predmet commitu). Nasadenie a migrácia v zápise čakajú na GO | [memory/decisions.md](../../../memory/decisions.md), [session-summary](../../../memory/session-summary.md) prvý záznam |

## Aktívne línie podľa týchto zdrojov

- Platby: founder doplní cenu v Live a premennú. Tento brief to nespúšťa.
- Doručiteľnosť: migrácia a tajomstvo čakajú na GO. Postup je skill [prod-migration](../../../.claude/skills/prod-migration/SKILL.md), nie tento dokument.
- Discovery otázky ostávajú v `docs/discovery/2026-10-21/OPEN_QUESTIONS.md`.

`memory/open-tasks.md` existuje. V tomto behu som ho nečítal, takže z neho neuvádzam úlohy.

## Zdroje

- [revolis-constitution-v2.md](../../architecture/revolis-constitution-v2.md)
- [master-data-sourcing-map.md](../../architecture/master-data-sourcing-map.md)
- [clay-positioning-reframe.md](../../architecture/clay-positioning-reframe.md)
- [apps/crm/docs/pricing-v1.md](../../../apps/crm/docs/pricing-v1.md) — historický cenník, nie dôkaz aktuálneho v3

## Blokátory

Zapísané v STATUS a v rozhodnutiach vyššie. V tomto behu som ich znova nevolal na produkcii.

## Ďalší krok

Founder drží Stripe krok C. Ďalšia produktová stena ide až po jeho GO a po Reality Check.

## Hranice

Žiadny zápis do produkčnej databázy, žiadne tajomstvo v popise, žiadne zákaznícke záznamy v tomto briefe. Referenčný klient sa v nových textoch nepomenúva nad rámec súborov, ktoré ho už obsahujú.
