# 00-meta — pravidlá Engineering OS

**Cieľová cesta:** `docs/architecture/engineering-os/00-meta.md`
**Rozsah:** 1 strana. Ak sa nezmestí, škrtá sa obsah, nie zväčšuje strana.

## 1. YAML hlavička (povinná, presne 6 polí)

```yaml
---
Module: nazov-modulu              # kebab-case, zhodný s názvom súboru
Status: Specified                 # jeden zo stavov v §2
Gate: Brána X                     # brána z COMPANY.md/ADR + prípadný spúšťač
DependsOn: [modul-a, modul-b]     # tvrdé závislosti; [] ak žiadne
RelatedModules: [modul-c]         # súvisiace bez závislosti; [] ak žiadne
LastReview: 2026-07-28            # dátum poslednej kontroly foundera / zmeny
---
```

Iné polia sa nepridávajú. Potreba siedmeho poľa = návrh na zmenu tohto
dokumentu (PR + GO), nie výnimka v jednom module.

## 2. Status workflow

```
Specified → Reviewed → Approved → Implemented → Deprecated
```

- **Specified** — AI napísala špecifikáciu, founder ju ešte nečítal.
- **Reviewed** — founder prečítal; výsledok je `Approved` alebo
  `Needs changes` (modul zostáva Reviewed, do textu pribudne blok
  `## Review Notes` s výhradami).
- **Approved** — founder dal GO na implementáciu. Vyžaduje splnené
  podmienky zo sekcie „Kill kritériá pre prechod do Approved".
- **Implemented** — kód zmergovaný, CI zelené, modul odkazuje na PR čísla.
- **Deprecated** — nahradený alebo zabitý; riadok v README zostáva
  (história sa nemaže), text dostáva odkaz na náhradu.

**Zmenu stavu vykonáva AI výhradne na explicitný príkaz foundera.**
Review robí founder (Needs changes / Approved). AI smie navrhnúť, že modul
je pripravený na review — nikdy nesmie stav posunúť sama.

## 3. Povinné sekcie každého modulu (v tomto poradí)

1. `## Why does this create an unfair advantage?` — prečo to konkurencia
   nedokáže skopírovať. Ak sekcia nemá presvedčivú odpoveď, modul nemá
   existovať.
2. `## Evidence` — Inspired by / Validated by (ADR) / Business Need /
   Customer Impact.
3. `## Cieľová architektúra` — diagram, dátový model, API placeholder.
4. `## Kill kritériá pre prechod do Approved`
5. `## Exit Criteria` — kedy modul opúšťa Specified / Reviewed / Approved
   (doplnené na pokyn foundera pri review 2026-07-28)
6. `## Open Questions`
7. `## Known Risks`
8. `## Out of Scope`
9. `## Future Evolution`

Modul po review navyše obsahuje `## Review Notes` (dátum, výsledok,
zapracované pripomienky).

## 4. Proces zmien

Každá zmena modulu alebo tohto dokumentu = **PR + explicitné GO foundera.**
Zmena obsahu aktualizuje `LastReview` a riadok v README tabuľke v tom istom
PR. Konflikt modulu s ADR alebo ústavou sa rieši podľa hierarchie autority
(CONSTITUTION.md Čl. 1) a zapisuje sa, nikdy nerieši potichu.

## 5. Čo Engineering OS zámerne NEMÁ (deferred pod Bránu 3)

Žiadny JSON registry · žiadne generátory a renderery · žiadne metriky bez
čísla v ADR · žiadna formálna Architecture Review Board — review je founder.
