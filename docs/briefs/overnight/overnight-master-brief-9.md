# OVERNIGHT MASTER BRIEF 9.0 — Ruflo Swarm
**Dátum:** 2026-06-12 → 13 · **Baseline:** `origin/main` · **Autor zadania:** Fable (schválil Andy)
**Téma noci:** Auto-merge robot + tri vlny: doručenie restov 8.0 → integrácie → stabilizácia.

---

## GLOBÁLNE PRAVIDLÁ
1. Vetva + PR per úloha; merge robí ROBOT (Tier 1/2) alebo Andy (Tier 3). Agent NIKDY nemerguje sám. **Politika:** [AUTOMERGE-POLICY.md](../../AUTOMERGE-POLICY.md) · **Report:** [OVERNIGHT-REPORT-9.md](../../../apps/crm/docs/OVERNIGHT-REPORT-9.md).
2. Pred každou data-dependent implementáciou over zdroj v [master-data-sourcing-map.md](../../architecture/master-data-sourcing-map.md) a nehádať neoverené zdroje.
3. ŽIADNA produkčná DB — len lokálna Supabase / fixtures. ŽIADNY deploy do produkcie.
4. NEDOTÝKAŤ SA bez Tier 3 označenia: `.github/**`, `vercel.json`, billing/Stripe/entitlement, auth, `supabase/migrations/**` (nové migrácie = automaticky Tier 3 PR), `seat-pricing.ts`, verejné ceny, Smolko účet.
5. CI zelené pred DONE. Copy k zákazníkom: žiadne AI zmienky, žiadne vymyslené entity, anonymná „RK z Prešova".
6. Agent nemá právomoc meniť podmienené rozhodnutia briefu (ak X → Y); smie len konštatovať, či X nastalo.
7. Každý PR dostane od orchestrátora label: `automerge` (len Tier 1/2 podľa [AUTOMERGE-POLICY.md](../../AUTOMERGE-POLICY.md)) alebo `tier-3-andy`.

## ⛔ ZAKÁZANÉ AKCIE (trvalý blok — vault decisions.md)
Stealth Recruiter (legal hold) · Arbitrage live/cron (POST-V1) · scraping portálov · auto-send e-mailov zákazníkom/prospectom · zmena verejných cien mimo release · label `automerge` na denylist cesty.

---

## FÁZA 0 — AUTO-MERGE ROBOT (večer, kým je Andy hore; ~40 min)
**Agent R · vetva `feat/automerge-policy` · PR = TIER 3, MERGUJE ANDY PRED SPANÍM**

1. `docs/AUTOMERGE-POLICY.md` — zdroj pravdy politiky:
   - **TIER 1 (auto, okamžite):** `docs/**`, `**/*.md`, `tests/**` (len add/update testov), marketing repo obsah BEZ cien, kód za flagom default OFF (overené greppom flagu v diffe). Podmienky: CI zelené + up-to-date + label `automerge` + nulový dotyk denylistu.
   - **TIER 2 (auto s odkladom 6 h, veto label `hold`):** bežný CRM feature kód mimo denylistu.
   - **TIER 3 (len Andy):** denylist = `.github/**`, `vercel.json`, billing/Stripe/entitlement, auth/RLS, `supabase/migrations/**`, `seat-pricing.ts`, verejné ceny, Smolko, ZAKÁZANÉ AKCIE.
2. `.github/workflows/auto-merge-policy.yml`: trigger label `automerge` + check_suite. Kroky: CI zelené? up-to-date? → changed files vs denylist (akýkoľvek match → odstráň label, komentár „TIER 3 — vyžaduje Andyho", koniec) → Tier 1 allowlist match → squash-merge; inak Tier 2 pravidlo (vek ≥ 6 h, bez `hold`). Každý auto-merge = komentár (verzia politiky, tier, matchnuté cesty). Robot politiku VYKONÁVA, nikdy neinterpretuje.
3. PR popis: 2 manuálne kroky pre Andyho (vytvoriť labels `automerge`/`hold`/`tier-3-andy`; potvrdiť branch protection „require up to date" zapnutú).
**Fallback:** ak Andy PR večer nemergne, celá noc beží v stacked režime (Vlna 2/3 stackuje na vetvy Vlny 1) a robot štartuje ráno.

## PRE-FLIGHT INVENTÁR (orchestrátor, súbežne s Fázou 0)
`git branch -a` + `git log` proti zoznamu Briefu 8.0: existujú vetvy/PRs pre landing v2, onboarding wizard, founder metrics, nehnutelnosti importer, RLS suite? Výsledok určí, či agenti Vlny 1 DOKONČUJÚ alebo STAVAJÚ NANOVO. Zapíš do reportu ako prvú sekciu („REPORTOVANÉ nie je COMMITNUTÉ — overený stav").

---

## VLNA 1 (~22:00–01:30) — doručenie restov 8.0, disjunktné územia
*Každý agent deklaruje v PR popise svoje územie (priečinky); orchestrátor nepustí dvoch na rovnaké.*

**Agent B — RLS TENANT IZOLÁCIA (najvyššia priorita noci) · Tier 3**
Dokonči `chore/rls-tenant-isolation-suite`: seed 2 agentúr, testy cross-tenant SELECT/INSERT/UPDATE/DELETE cez user klienta na VŠETKY tenant tabuľky + check „RLS enabled" na každej. **Over, že CI suite reálne spúšťa** (vitest include + workflow). Kritické nálezy ≤50 riadkov → policy fix migráciou v PR; väčšie → popis. Výstup: RLS-ISOLATION-REPORT.md + PR s počtami (tabuliek / pokrytých / FAIL). Label `tier-3-andy`.

**Agent W — ONBOARDING WIZARD (3 kroky) · Tier 2**
Nadviaž na #183 (NEduplikuj — audit ACTIVATION-AUDIT.md): wizard po prvom logine novej agentúry: (a) profil kancelárie, (b) import — `/import/universal` + odkazy na playbooky, (c) ranný report + seat invites. Preskočiteľný, idempotentný, flag `ONBOARDING_WIZARD_ENABLED` default OFF. Územie: `app/(onboarding)` + `lib/activation`.

**Agent M — FOUNDER METRICS DASHBOARD · Tier 2**
Podľa Briefu 8.0 Agent D: `/internal/metrics` (gate `FOUNDER_EMAILS`), SQL views: MRR (Smolko manual zvlášť), seaty, Cockpit attach %, kredity grant/spend/purchase, credit revenue %, ai_cost_daily ak existuje. Guardrail pásma z pricing-v1.md. Testy na seedoch. Územie: `app/internal`, `lib/metrics`. (View migrácie = súčasť PR → ak vzniknú, PR je Tier 3; preferuj views cez existujúci mechanizmus bez novej migrácie, ak sa dá.)

**Agent N — NEHNUTEĽNOSTI.SK IMPORTER · Tier 2**
Podľa 8.0 Agent E: source `nehnutelnosti-export` v Universal Import (formát odvoď z dát 439 kontaktov), dedupe e-mail+telefón, dry-run default, syntetické fixtures, playbook `docs/playbooks/migracia-nehnutelnosti.md` (TODO screenshoty Andy). Územie: `lib/import`, `docs/playbooks`.

**Agent L — LANDING V2 · Tier 3 (ceny!)**
Podľa 8.0 Agent A: nová landing z demo v3 DNA, cenník importom zo `seat-pricing.ts`, von fake obsah, CTA demo + podmienený checkout, RELEASE-CHECKLIST.md. NIE deploy. Label `tier-3-andy`. Územie: marketing repo.

---

## MIDNIGHT GATE (orchestrátor, ~01:30)
1. Over, čo robot zmergoval (Tier 1/2 z Vlny 1). Nemergnuté závislosti → Vlna 2 stackuje (base = vetva V1, PR ako stacked).
2. Zostav Vlnu 2 podľa reálneho stavu; agentom V2 zapíš presný baseline do zadania.
3. Žiadny agent V2 neštartuje na domnienke — len na overenom commite.

## VLNA 2 (~01:30–04:30) — integrácie a navrstvenie
**Agent W2 (stack na W):** napojenie aktivačných e-mailov (#183) na wizard udalosti (S0–S4 prechody z reálnych krokov wizardu) + event log kompletizácia. Tier 2.
**Agent M2 (stack na M):** metrics CSV exporty, prepojenie na ai_cost_daily, mini trend (4 týždne) per metrika. Tier 2.
**Agent I — NOTIFICATIONS INBOX UI:** zvonček + panel pre routine_notifications (read/unread, filter, role-aware: maklér svoje, owner + ceo_command), poctivý empty state. Tier 2. Územie: `app` notifikačné komponenty.
**Agent H — HOUSEKEEPING (Tier 1):** (1) presun `cursor-brief-demo-page-final` a `recruiting-modul-brief` z `briefs/overnight/` do `briefs/prompts/` (git mv); (2) inventár `docs/` rootu → `docs/ARCHIVE-PROPOSAL.md`; (3) doplniť `docs/briefs/README.md`; (4) ak chýba overnight-master-brief-6.md, TODO pre Andyho; (5) vault sync decisions.md.

## VLNA 3 (~04:30–06:30) — stabilizácia, len Tier 1, žiadne nové features
**Agent S1:** test coverage diery z FEATURE-VERIFICATION-REPORT „Recommended TASK" stĺpca, ktoré sú čisté testy.
**Agent S2:** dead code / lint sweep mimo denylistu.
**Agent S3:** dokumentácia: AUTOMERGE-POLICY krížové odkazy, activation-emails.md + wizard prepojenie, OVERNIGHT-REPORT-9 skelet.

---

## ORCHESTRÁTOR — záver noci
1. `apps/crm/docs/OVERNIGHT-REPORT-9.md`: pre-flight inventár, vlna→agent→PR→tier→stav, RLS nálezy NAVRCHU, otázky, ranná Tier 3 fronta.
2. Briefs index + vault sync (automerge politika v1 prijatá).
3. Ranný checklist pre Andyho (RLS first, Tier 3 fronta, robot audit, visiace položky, intro e-maily 2 prospektom).

---
*Brief koniec. Fáza 0 potrebuje Andyho večer na jeden merge — potom noc patrí robotovi a trom vlnám.*
