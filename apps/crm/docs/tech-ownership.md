# Technické vlastníctvo modulov (pre-mortem Sc. 7)

**Pravidlo:** každý kritický modul má aspoň jedného **primárneho** vlastníka (meno). Pri absencii = riziko „bus factor“.

| Modul / oblasť | Súbory / poznámka | Primárny vlastník | Záloha |
|----------------|-------------------|-------------------|--------|
| AI triáž (cron, idempotencia, fallback) | `src/ai/triage-*`, `src/lib/ai/lead-triage-batch.ts`, cron route | _doplňte_ | _doplňte_ |
| AI explainability + feedback | `AiTriageExplainBlock`, `api/ai/triage-feedback`, migrácie feedback | _doplňte_ | _doplňte_ |
| Supabase RLS / migrácie | `supabase/migrations/` | _doplňte_ | _doplňte_ |
| Auth / profiles / agency | `src/lib/auth*`, `permissions` | _doplňte_ | _doplňte_ |
| Realvia / integrácie | `src/lib/realvia/`, webhooky | _doplňte_ | _doplňte_ |
| Billing / Stripe | `src/lib/billing*`, API billing | _doplňte_ | _doplňte_ |

**Review:** raz za štvrťrok skontrolovať, či sú vlastníci aktuálny a či existuje onboarding pre nového člena na každý riadok.
