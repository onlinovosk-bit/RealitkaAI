# Build Order — BO-eval-smolko-outcomes: Parser + triage gold eval

**Status:** SHIPPED (in progress)
**Cieľ:** Bazos inbound maily (Palenčár) nesmú padať ako NOT_A_LEAD; 4 Smolko gold outcomes ako merateľný triage eval.

**Zdroj dát:** `docs/eval/eval-dataset-smolko-outcomes.md`

| Commit | Scope | Súbory |
|--------|-------|--------|
| 1 | Bazos fixture + parser | `email-adapter.ts`, fixture, test eval 7 |
| 2 | Triage eval harness | `data/eval/smolko-outcomes-gold.jsonl`, script |

**Gate:** Core Platform (a) parser prevádzka → (b) triage kalibrácia.
