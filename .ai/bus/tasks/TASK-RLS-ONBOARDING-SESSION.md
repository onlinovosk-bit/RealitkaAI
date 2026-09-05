# TASK-RLS-ONBOARDING-SESSION — zatvoriť `Allow anon access`

**Status:** PR open (Path B) — migration PREPARED, NOT applied  
**PR:** https://github.com/onlinovosk-bit/RealitkaAI/pull/534  
**Branch:** `security/rls-onboarding-session`  
**Report:** `docs/reports/2026-09-04-rls-onboarding-session-api.md`

**Priority:** P0 (posledná otvorená anon diera v `public` po DROP wave)  
**Depends on:** `drop_open_anon_policies` applied (2026-09-04) — verified in prod  
**Merge:** founder GO; **samostatný PR** od DROP wave  

## Problem

`onboarding_sessions` má politiku `Allow anon access` (`FOR ALL TO anon USING (true)`).
Dnes 5 riadkov `form_data` — ktokoľvek s anon kľúčom ich vie čítať aj mazať.

Browser sync (`useOnboarding.ts`, `OnboardingClient.tsx`) posiela `session_id` a robí
upsert/select. localStorage je SoT; sync toleruje zlyhanie — ale to **nie je** dôvod
nechať ALL otvorené na neurčito.

## Cieľ

1. Nahradiť `Allow anon access` politikou viazanou na `session_id` **alebo**
   PRESUNÚŤ sync na server endpoint so service role.
2. Preferovaná cesta (rozhodnutie foundera):
   - **A:** `TO anon` scoped na `session_id` (krehké; treba dôveryhodný viazací token)
   - **B (odporúčané):** API route `POST/GET /api/onboarding/session` so service role;
     DROP anon ALL; klient volá len API
3. Test: anon nemôže `SELECT *` / `DELETE` cudzie session; vlastný sync funguje.

## Acceptance

- [ ] `Allow anon access` neexistuje
- [ ] 5 existujúcich sessions nie sú verejne listovateľné anon kľúčom
- [ ] Onboarding progress sync stále funguje (API alebo scoped policy)
- [ ] Rollback SQL v tom istom PR

## Out of scope (tento PR)

- Refaktor celého onboarding UX
- Oprava `lead_assignment_rules` / pridanie `agency_id` — **nie tu** (viď nižšie)

---

## Nález navyše (nezapadnúť) — `lead_assignment_rules` vs schéma

**Riešiť s migračným driftom (Brief 17 vlna 1), nie v onboarding PR.**

Po DROP wave je tabuľka v plnom RLS deny (0 politík) — to je OK (0 riadkov).
Predtým však kód už bol **rozbitý proti produkčnej schéme**:

- Dôkaz: `apps/crm/src/app/api/automation/rules/[id]/route.ts:19`
  `.from("lead_assignment_rules").select("agency_id")`
- Produkčná schéma stĺpcov: `id · name · rule_type · profile_ids · criteria · is_active · created_at`
- **`agency_id` neexistuje** → Postgres `42703` (undefined_column)
- Rovnaká trieda tichého zlyhania ako `cost_eur` v `ai_action_audit`
- Plný deny po DROP **nezlomil** túto funkciu — bola zlomená skôr, lebo migrácia
  „add agency_id to lead_assignment_rules“ (ak existuje v 52 neaplikovaných) nikdy nebežala

**Vstup pre Brief 17 / migračný drift:** kód vs 48 aplikovaných / ~100 v repe / 27 voľných SQL.

---

## Súvisiaci vedomý stav — `integration_settings`

Po DROP: RLS enable + **0 politík** = plný deny pre anon/authenticated.

- Repo: **žiadna referencia** na `integration_settings` v aplikačnom kóde
- IMAP / nastavenie schránky **nikdy nebolo zapojené** — tabuľka bola otvorená, prázdna, nepoužívaná
- Plný deny **neláme** existujúcu funkciu
- Toto je **vedomý stav**, nie bug „nefunguje nastavenie schránky“ — keď sa IMAP oživí,
  treba tenant/profile-scoped politiky (+ server path) v samostatnom PR
