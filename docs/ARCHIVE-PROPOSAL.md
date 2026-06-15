# Docs root — archive proposal

**Inventár:** 2026-06-12 · **Agent:** Brief 9 Vlna 2 Agent H · **Scope:** súbory a priečinky priamo v `docs/` (nie `apps/*/docs`)

Účel: navrhnúť, čo ponechať aktívne, čo presunúť do archívu alebo podpriečinka, a čo zlúčiť — bez automatického mazania.

---

## Root súbory

| Súbor | Veľkosť / stav | Odporúčanie | Poznámka |
|-------|----------------|--------------|----------|
| `AGENT_STANDARD.md` | aktívny štandard | **KEEP** | Canon pre agent prompty; odkazuje `CLAUDE.md` |
| `AUTOMERGE-POLICY.md` | v1.0 (2026-06-12) | **KEEP** | Zdroj pravdy pre auto-merge robot (Brief 9 Fáza 0) |
| `MASTER_PROMPT.md` | legacy L99 multi-agent | **ARCHIVE** → `docs/archive/prompts/` | Nahradené `MASTER_PROMPT_V3.md`; zachovať pre históriu |
| `MASTER_PROMPT_V3.md` | v3.0 (2026-05-06) | **KEEP** | Aktuálny master prompt pre agent OS |
| `REALVIA_ONBOARDING.md` | aktívny checklist | **KEEP** | Externý onboarding Realvia; živý runbook |
| `design-preview.html` | statický HTML mock | **MOVE** → `docs/design/` alebo `apps/marketing/docs/` | Nie je markdown; mimo konvencie `docs/*.md` |
| `progress.md` | posledná úprava 2026-05-04 | **REVIEW** | Môže byť zastarané vs `apps/crm/docs/progress.md` — zlúčiť alebo archivovať staršiu kópiu |

---

## Root podpriečinky

| Priečinok | Obsah | Odporúčanie | Poznámka |
|-----------|-------|--------------|----------|
| `architecture/` | `L99_ARCHITECTURE_AUDIT.md` | **KEEP** | Plán refaktoru; stále referenčný |
| `briefs/` | overnight + README | **KEEP** | Index overnight briefov; pozri `briefs/README.md` |
| `legal/` | `DPA_Reality_Smolko.md` | **KEEP** (citlivé) | DRAFT DPA; nie archivovať bez právneho review |
| `realvia/` | `ONCALL_RUNBOOK.md` | **KEEP** | Operatívny runbook ingest pipeline |

---

## Chýbajúca štruktúra (Brief 9 housekeeping)

| Položka | Stav | Akcia |
|---------|------|-------|
| `briefs/prompts/` | **neexistuje** | Vytvoriť pri presune historických prompt briefov |
| `cursor-brief-demo-page-final` v `briefs/overnight/` | **neexistuje** na `main` | Žiadny `git mv`; pravdepodobne nikdy nebol commitnutý alebo je mimo `docs/briefs/` |
| `recruiting-modul-brief` v `briefs/overnight/` | **neexistuje** na `main` | Živá kópia: `apps/crm/docs/strategy/recruiting-modul-brief-2026-06-03.md` — nepresúvať bez Andyho (iný path) |
| `overnight-master-brief-6.md` | **chýba** | TODO pre Andyho — doplniť alebo označiť ako zrušený brief |

---

## Navrhované ďalšie kroky (Tier 2+, nie v tomto PR)

1. Vytvoriť `docs/archive/prompts/` a presunúť `MASTER_PROMPT.md` (git mv).
2. Vytvoriť `docs/design/` a presunúť `design-preview.html`.
3. Reconciliovať `docs/progress.md` vs `apps/crm/docs/progress.md` — jeden canonical progress doc.
4. Po doplnení brief-6 aktualizovať `docs/briefs/README.md` tabuľku.

---

*Tier 1 PR — len inventár; žiadne presuny v tomto kroku okrem plánovaných brief moves (súbory neexistovali).*
