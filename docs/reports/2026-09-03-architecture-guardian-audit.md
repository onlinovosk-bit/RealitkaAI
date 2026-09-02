# Architecture Guardian — READ-ONLY audit

**Date:** 2026-09-03  
**Branch:** `docs/architecture-guardian-audit`  
**Scope:** A1 · Architecture Guardian (Night Operations)  
**Mode:** research only — no code changes

---

## 1. Existuje Architecture Guardian v repe?

**Áno ako docs/scaffolding + čiastočný CI tooling. Nie ako aplikačný modul pod `apps/crm/src/lib`.**

| Path | Role |
|---|---|
| `docs/automations/a1-architecture-guardian.md` | Paste-ready Cursor Automation inštrukcie A1 |
| `docs/automations/2026-08-03-setup-karta.md` | Setup card / cron tabuľka |
| `docs/architecture/2026-08-03-night-operations.md` | SSOT metriky A1 |
| `docs/architecture/2026-08-03-night-operations-center.md` | Tvrdí „2/3 postavený" |
| `docs/audit/README.md` | Dokumentuje `guardian-history.jsonl` |
| `apps/crm/scripts/check-api-contract.mjs` | API contract ratchet (beží na PR) |
| `apps/crm/scripts/api-contract-baseline.json` | Baseline dlhu |
| `.github/workflows/code-contract-guard.yml` | PR + workflow_dispatch (bez schedule) |

**Na `origin/main` chýba:** `apps/crm/scripts/find-dead-exports.mjs` (len vetva `chore/dead-export-check`), `docs/audit/guardian-history.jsonl`, A1 unit testy, in-repo nightly runner.

### Nie je A1 (nepliesť)

| Systém | Príklad ciest |
|---|---|
| **Guardian v1** (leady) | `apps/crm/src/lib/guardian/*`, `/api/cron/guardian-run` |
| **Quality Guardian** | `apps/crm/src/lib/capabilities/quality-guardian/*` |

Ak by otázka znela „existuje app modul Architecture Guardian?" → **nie** — jedna veta stačí: existujú len Night Ops dokumenty a PR contract ratchet.

---

## 2. Čo reálne beží vs scaffolding

| Beží dnes | Scaffolding |
|---|---|
| `code-contract-guard.yml` na **PR** → `check-api-contract.mjs` | Cursor Automation A1 (enable mimo gitu) |
| Dead-exports krok v CI **skipped** (súbor nie je na main) | Nočný beh tsc + test + history JSONL |
| `schema-governance-guard.yml` — schedule **vypnutý** | Vetva `reports/guardian-history` |
| Product `/api/cron/guardian-run` — **iný produkt** | Tvrdenie „2/3 postavený" |

**Verdikt:** A1 ako nočný node nie je zapojený v repe. Čiastočne beží len PR ratchet.

---

## 3. Čo by znamenal „nočný beh nad main" (možnosti, bez odporúčania)

| Option | Mechanizmus | Pros | Cons |
|---|---|---|---|
| **A** Cursor Automation | Paste `a1-architecture-guardian.md`, cron ~02:00 | Zodpovedá SSOT; ľudský report | Mimo gitu; kvóty; dead-exports chýba |
| **B** GitHub Actions schedule | `on.schedule` + checkout main | Auditable YAML; logy | Ťažší full tsc/test; history commit permissions |
| **C** Vercel cron → API | Nová route | Rovnaký vzor ako product crons | Zlý fit (repo audit ≠ tenant DB); conflation s guardian-run |
| **D** Externý cron | Clone + shell | Nezávislé | Credentials mimo repo; ďalší systém |

---

## 4. Odhad rozsahu

| Cesta | ~LOC / súbory |
|---|---|
| Enable Cursor A1 only | 0 app LOC |
| Land dead-exports (už na vetve) | ~2 files / ~260 LOC |
| GHA nightly contract on main | ~1 file / 40–80 LOC |
| Full A1 (tsc+tests+history) | ~1–2 files / 80–150 + dead-exports |

---

## Korekcia naratívu

1. „Z dvoch tretín postavený" **nie je overené na main** — contract áno, dead-exports nie, nightly nie.
2. Product `guardian-run` **nie je** Architecture Guardian.
3. Žiadne A1 testy; žiadny `guardian-history.jsonl`.

*Audit only. Nič nestavané.*
