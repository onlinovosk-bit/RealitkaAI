# Tenancy / multi‑agency

**Owner:** Orchestrator 1 (DB politiky, RLS, rezolút agencie pri API); Orchestrator 2 kde ide o UX izolácie a práva v UI.

## Zásady

- Každá mutácia a čítanie citlivých dát musí byť viazané na **agency / tenant** kontext na serveri.
- Klientské filtre nestačia — autorizácia a RLS sú zdroj pravdy.

Podrobnosti implementácie sú v kóde (`apps/crm`) a v migráciách; sem dopĺňaj len rozhodnutia, ktoré ovplyvňujú viac feature súčasne.

**Súvisiaci agent:** [`../agents/agent-auth.md`](../agents/agent-auth.md), [`../agents/agent-db.md`](../agents/agent-db.md).
