# Overnight swarm — sumár 2026-07-25

**Brief:** `docs/briefs/overnight/overnight-brief-swarm-vlny-2026-07-24.md`  
**Orchestrátor:** Cursor agent · **Režim:** vlny 0–3

---

## ČO SA ZMENILO (per PR)

| Vlna | PR | Stav | Merge commit |
|------|-----|------|--------------|
| 1a n8n | [#321](https://github.com/onlinovosk-bit/RealitkaAI/pull/321) | **MERGED** | `f6e918dee5cede6ca3007b418cebd3d5186d8f33` |
| 1c sales/governance | [#322](https://github.com/onlinovosk-bit/RealitkaAI/pull/322) | **MERGED** | `e88da3375cb223b09b5f08ea77fd4a897558d09a` |
| 1d graph audit | [#323](https://github.com/onlinovosk-bit/RealitkaAI/pull/323) | **MERGED** | `5795155fbdb714a033ae50ebcaf91622cf7140d6` |
| 1b e2e | [#324](https://github.com/onlinovosk-bit/RealitkaAI/pull/324) | **OPEN** (duplicitný) | kód už na `main` cez #323 — pozri odchýlku |
| 2 brain | [#320](https://github.com/onlinovosk-bit/RealitkaAI/pull/320) | **OPEN** | čaká founder merge |
| Track O Obsidian | `C:\RealitkaAI-Memory\` | **HOTOVÉ** | mimo git repa |

**PHASE 0 snapshot:** nebežal — `main` nemal modified tracked súbory (len untracked lokálny šum). Write-probe OK na všetkých cieľových cestách + vault.

---

## DÔKAZ

- CI **Lint, test, build:** zelené na #321–#323 ([príklad run](https://github.com/onlinovosk-bit/RealitkaAI/actions/runs/30123374008)).
- **Memory Engine `brain:check`:** na PR docs-only **FAIL** (drift registry vs ingest) — očakávané do merge #320; na `main` po vlne 1 stále `valid: false` (registryCount 14 vs ingest 17).
- **`brain:audit` na main:** 0 errors, 13 advisories (beží).
- **1b acceptance 3× playwright:** lokálny beh neukončený v okne agenta (Supabase/dev server) — overiť founder: `cd apps/crm && npx playwright test --project=valuation-widget --repeat-each=3`.

---

## TRACEABILITY (acceptance)

| Balík | Acceptance | Splnené |
|-------|------------|---------|
| 1a | JSON W1–W3, README, CI secrets guard | Áno (W1 už 32 firiem na main; PR aktualizoval W2/W3 + README) |
| 1b | DB asserty, mobile stabilita, nightly projekt, brief bod 2 | Kód na main; 3× e2e **neoverené** tu |
| 1c | Súbory na cestách, linky | Áno (veos-integration / premortem template už boli na main) |
| 1d | Jeden report, klasifikácia, baseline, 2 QW plány | Áno `docs/architecture/graph-audit-2026-07.md` |
| Track O | Vault štruktúra, Dataview syntax, žiadny duplikát repa | Áno |
| W2 | `brain:check` + test advisory | Na #320 po rebase + regen; **brain:test 11/11** lokálne |

---

## ODCHÝLKY

1. **#323 squash obsahuje aj commit z 1b** (valuation-widget + package.json + brief sandbox-gdpr) — mimo čistého docs-only rozsahu 1d. [#324](https://github.com/onlinovosk-bit/RealitkaAI/pull/324) zatvoriť alebo nechať founder.
2. **`brain:check` červený na main** do merge **#320** (identity, lessons, registry regen).
3. **Memory Engine CI** na docs PR zlyháva kvôli bodu 2 — merge docs šiel cez zelený **Lint, test, build** (branch protection).

---

## ČO ČAKÁ NA FOUNDERA

- **Merge #320** (W2 brain — kód + `.cursor/rules` + registry).
- **Review nechceného kódu 1b v #323** vs pôvodný plán „founder merge 1b“.
- **Zatvoriť #324** ak redundantný.
- **D-1 Ads (27.07)** — stav kampane pred štartom.
- **Harasim demo** — ak pondelok 8:00: checklist `docs/sales/demo-prep-megarealitka.md` (žiadny tenant insert bez GO).
- **Zmluva Vitko** — odoslaná? (otázka zo briefu).
- **n8n Cloud import** W1–W3 podľa `automation/n8n/README.md`.

---

## Harasim demo — rýchly checklist (len príprava)

- [ ] Termín potvrdený (vault: 27.07 08:00 placeholder)
- [ ] `/odhad/demo` + sandbox badge otestované
- [ ] Calendly / CTA text pre ukážku pripravený
- [ ] Bez produkčného tenant insertu
