# TASK-RLS-ONBOARDING-SESSION — zatvoriť `Allow anon access`

**Priority:** P0 (follows anon RLS wave; not deferrable indefinitely)  
**Depends on:** `security/rls-anon-audit` applied  
**Merge:** founder GO; separate PR from the DROP wave  

## Problem

`onboarding_sessions` má politiku `Allow anon access` (`FOR ALL TO anon USING (true)`).
Dnes 5 riadkov `form_data` — ktokoľvek s anon kľúčom ich vie čítať aj mazať.

Browser sync (`useOnboarding.ts`, `OnboardingClient.tsx`) posiela `session_id` a robí
upsert/select. localStorage je SoT; sync toleruje zlyhanie — ale to **nie je** dôvod
nechať ALL otvorené.

## Cieľ

1. Nahradiť `Allow anon access` politikou viazanou na `session_id` (alebo
   PRESUNÚŤ sync na server endpoint so service role + vlastná auth session cookie).
2. Preferovaná cesta (rozhodnutie foundera):
   - **A:** `TO anon` s `USING (session_id = current_setting(...))` / signed cookie — krehké
   - **B (odporúčané):** API route `POST/GET /api/onboarding/session` so service role;
     DROP anon ALL; klient volá len API
3. Test: anon nemôže `SELECT *` / `DELETE` cudzie session; vlastný sync funguje.

## Out of scope

- Refaktor celého onboarding UX
- `lead_assignment_rules` agency_id (samostatne, keď sa feature oživí)

## Acceptance

- [ ] `Allow anon access` neexistuje
- [ ] 5 existujúcich sessions nie sú verejne listovateľné anon kľúčom
- [ ] Onboarding progress sync stále funguje (API alebo scoped policy)
- [ ] Rollback SQL v tom istom PR
