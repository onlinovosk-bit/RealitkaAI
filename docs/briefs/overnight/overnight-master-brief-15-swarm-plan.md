# Brief 15 — Swarm plan (vetvy + PR titulky)

> Zdroj: `overnight-master-brief-15-vertical-pack-wave1.md`  
> Poradie: Fáza 0 → Krok 1 → Krok 2 → Krok 3 (3a–c paralelne)  
> 1 PR = 1 capability. Žiadny auto-merge.

## Fáza 0 — Write probe (blokujúca brána)

| Vetva | PR titulok | Súbory | Merge |
|-------|------------|--------|-------|
| `test/write-probe` | `chore: write-probe for Brief 15 swarm (AP-009 gate)` | `docs/audit/write-probe.md` | Po overení → zatvoriť/zmazať vetvu; **nemergovať do main** (len dôkaz write) |

**Overenie:** `git branch -a \| grep write-probe` + `git log -1 test/write-probe`

---

## Krok 1 — Quality/Brand Guardian (blokuje všetko ostatné)

| Vetva | PR titulok | Scope |
|-------|------------|-------|
| `feat/vertical-pack-quality-guardian` | `feat(crm): Quality/Brand Guardian capability (Brief 15 K1)` | `apps/crm/src/lib/capabilities/quality-guardian/*`, unit testy (PASS/FLAG, fakt vs vymyslené pole), audit log stub, human-approval gate interface |

**Blokátor pre:** Krok 2, 3a, 3b, 3c

---

## Krok 2 — Listing Generator (po merge K1)

| Vetva | PR titulok | Scope |
|-------|------------|-------|
| `feat/vertical-pack-listing-generator` | `feat(crm): Listing Generator from UC properties (Brief 15 K2)` | `apps/crm/src/lib/capabilities/listing-generator/*`, vstup z `properties`, výstup headline/popis/SEO, integrácia Guardian pred save, unit test na **reálnej** zákazke |

**Závisí na:** K1 merged  
**Vstup pre:** Krok 3a, 3c

---

## Krok 3 — paralelné (po merge K2; navzájom nezávislé)

Spusti **3 agentov naraz** — každý vlastná vetva, žiadne kolízie paths.

| Vetva | PR titulok | Capability | Scope |
|-------|------------|------------|-------|
| `feat/vertical-pack-property-microsite` | `feat(crm): Property Microsite capability (Brief 15 K3a)` | 3a Microsite | `property-microsite/*`, hero/images/popis, `noindex` default, Guardian QA |
| `feat/vertical-pack-banner-factory` | `feat(crm): Banner Factory capability (Brief 15 K3b)` | 3b Banner | `banner-factory/*`, stavové vizuály + brand kit, Guardian brand QA |
| `feat/vertical-pack-presentation-builder` | `feat(crm): Presentation Builder capability (Brief 15 K3c)` | 3c Deck | `presentation-builder/*`, owner/buyer PDF spec, Guardian QA |

**Závisí na:** K1 + K2 merged  
**Spoločné pravidlá:** žiadne auto-send, žiadne lead formuláre s odoslaním, RLS test v CI

---

## Swarm príkaz (šablóna)

```
Brief 15 Vertical Pack Wave 1. FÁZA 0: test/write-probe MUST pass first.
Then SEQUENTIAL: K1 quality-guardian → K2 listing-generator.
Then PARALLEL: K3a microsite + K3b banner + K3c presentation (3 branches).
Each: read overnight-master-brief-15-vertical-pack-wave1.md + this plan.
Real UC property input only — NO mock. NO Wave 2 (scoring/pricing/registry).
Kontrolór before merge. 1 PR = 1 capability. NO main merge without green CI.
Status: docs/briefs/overnight/overnight-master-brief-15-status.md
```

---

## Pred štartom K1 (founder gate)

- [ ] #214 + #215 merged
- [ ] Smolko UC live + ≥1 reálna zákazka v `properties` (nie len smoke `784691`)
- [ ] Write-probe vetva + commit na remote

---

## Status log

| PR | Vetva | CI | Kontrolór | Merged |
|----|-------|-----|-----------|--------|
| probe | `test/write-probe` | — | — | — |
| K1 | `feat/vertical-pack-quality-guardian` | | | |
| K2 | `feat/vertical-pack-listing-generator` | | | |
| K3a | `feat/vertical-pack-property-microsite` | | | |
| K3b | `feat/vertical-pack-banner-factory` | | | |
| K3c | `feat/vertical-pack-presentation-builder` | | | |
