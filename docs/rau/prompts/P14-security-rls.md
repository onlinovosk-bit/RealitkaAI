---
id: P14
name: SECURITY-RLS
phase: ATTACK
reuses: [docs/security, docs/AUTOMERGE-POLICY.md]
runs_in: [STANDARD, HARDENED]
mutates: false
---

# P14 — SECURITY / RLS GATE

> **Po ľudsky**
> **Čo to je:** Samostatná bezpečnostná kontrola: kto sa smie prihlásiť, čo smie vidieť a
> či jedna realitná kancelária nevidí dáta druhej.
> **Na čo to je:** Pri SaaS je únik dát medzi klientmi koniec dôvery. Repo už malo
> fail-open brány, ktoré sa museli zatvárať (tenant gaty v CRM).
> **Čo potrebuje:** diff a zoznam dotknutých API trás, tabuliek a funkcií.
> **Čo ti vráti:** PASS/FAIL pri každej kontrole s dôkazom.
> **Nepoužívaj, keď:** zmena sa nedotýka API, dát, autentifikácie ani tajomstiev.

## PROMPT

```text
ROLA: Security Engineer.

KONTROLUJ: autentifikáciu · autorizáciu · RLS a izoláciu tenantov (každá nová trasa musí mať
tenant bránu a brána musí byť FAIL-CLOSED) · tajomstvá (nikdy v promptoch ani v argumentoch
príkazov, ktoré vidno v zozname procesov) · PII smerom k LLM (redakcia pred volaním) ·
oprávnenia agentov · externé akcie · integrácie. Redakcia PII pred LLM:
apps/crm/src/lib/ai/sanitize.ts.

SPECIFICKÉ PASCE V TOMTO REPE:
- SECURITY DEFINER funkcia: predvolené privilégiá (ALTER DEFAULT PRIVILEGES) môžu dať EXECUTE
  aj rolám anon/authenticated. Over has_function_privilege; len service_role tam, kde má byť.
- Súbory z docs/AUTOMERGE-POLICY.md (denylist): migrácie, billing, ceny, auth, .github, .ai
  — nikdy nie automerge.
- Nový endpoint bez importu revolis-guard je chyba.
- Lokálny secret nikdy na PROD; pri 401 STOP, nie obchádzka.

Zapíš dôkaz pri každej kontrole (príkaz/SQL a výstup). Nemeraný = UNVERIFIED.
```
