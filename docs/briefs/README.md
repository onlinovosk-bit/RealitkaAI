# Briefs — letový denník

Zadania pre agentov (Ruflo Swarm / Cursor) a ich výsledky.

- **`overnight/`** — Master Briefy: celonočné programy prác pre swarm. Čítajú sa v páre so svojím OVERNIGHT-REPORT.
- **`prompts/`** — jednorazové zadania jednej veci (feature, pipeline, copy). Po vykonaní platí výsledná dokumentácia/kód, nie prompt.

**Pravidlá:**
1. Brief sa po spustení spätne NEEDITUJE — je to historický záznam zadania.
2. Orchestrátor po každej noci doplní riadok do indexu nižšie.
3. Nadradenosť: kód a živá dokumentácia (docs/pricing-v1.md a pod.) > brief/prompt.
4. Zakázané akcie pre agentov: pozri trvalý blok v Obsidian vaulte (decisions.md) — povinné čítanie každého briefu.

---

## Index — Overnight Master Briefy

| Brief | Dátum | Report | Kľúčové výsledky (PRs) | Stav |
|---|---|---|---|---|
| overnight-master-brief-5.md | 2026-06-09 | OVERNIGHT-REPORT-5.md | #156 notifications+FK · #157 team gating · #158/#159 (re-merge ako #162/#163) · #160 smoke guard | uzavretý |
| overnight-master-brief-6.md | 2026-06-10 | OVERNIGHT-REPORT-6.md (#173) | #165 pricing stack · #166 demo v3 · #167 prospecting · #168 CI baseline · #169 demo-ops · #170 W1 · #171 verification · #172 Realvia importer | uzavretý |
| overnight-master-brief-7.md | 2026-06-11 | OVERNIGHT-REPORT-7.md | #174 PR-2 granty · #175 morning brief source · #176 analyzer+CEO UI (čaká verdikt) · #177 insights LLM · #178 PR-3 cost log (+stack #179 checkout) | merge vlak beží |
| overnight-master-brief-8.md | 2026-06-12 | _(report chýba)_ | RLS suite (tests/rls/) · landing v2 · onboarding · metrics · nehnuteľnosti import — stav overiť | otvorený |

## Index — Prompty

| Prompt | Dátum | Výsledok | Stav |
|---|---|---|---|
| prompts/onboarding-emails-prompt.md | 2026-06-12 | `docs/onboarding/activation-emails.md` + `src/lib/activation/*` | PR feat/onboarding-activation-emails |

---
_Šablóna riadku: | súbor | dátum | report/PR | výsledky | stav |_
