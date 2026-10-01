---
title: "Overnight Master Brief 12 — Don't-Die Hardening"
project: Revolis.AI
type: overnight-master-brief
brief_number: 12
status: ready
created: 2026-06-16
tags: [revolis, rls, security, gdpr, governance, hardening, cleanup, tech-debt]
related:
  - "[[master-data-sourcing-map]]"
  - "[[overnight-master-brief-11-revival]]"
  - "[[decisions]]"
---

# OVERNIGHT MASTER BRIEF 12 — Don't-Die Hardening

> Téza: máš 1 platiaceho zákazníka s reálnymi dátami klientov a chystáš sa
> pripojiť ďalšie zdroje (RealSoft, Nehnuteľnosti Admin), čo nasypú dáta
> tretích strán. Ak RLS niekde nedrží = cross-tenant únik osobných údajov =
> GDPR incident. Tento brief je POISTKA proti preventabilnému incidentu.
> Nečaká na žiadny externý zdroj. Zbiera otvorené opravy z celej histórie.
>
> DÔLEŽITÉ: časť položiek je "ROZHODNI" (founder), nie "oprav" (swarm).
> Swarm NESMIE robiť deštruktívne akcie (drop tabuliek) bez potvrdenia.

## ZÁSADY (NEPREKROČIŤ)
- merge ≠ deployed ≠ verified. Nič do main bez green CI.
- E2E/RLS testy LEN proti ephemeral supabase start / TEST_SUPABASE_*, NIKDY prod.
- Žiadny DROP tabuľky/stĺpca bez explicitného potvrdenia foundera (viď Wave D).
- Žiadna migrácia ručne do produkcie — len cez repo + PR.
- Nepredpokladaj. Chýbajúce dáta = pýtaj sa.

## WAVE A — RLS AUDIT NAPRIEČ VŠETKÝMI TABUĽKAMI (najvyššia priorita)
Cieľ: každá tabuľka s `agency_id` musí mať overenú tenant izoláciu.
1. Vygeneruj zoznam VŠETKÝCH tabuliek v public schéme so stĺpcom `agency_id`.
2. Pre každú over: má RLS enabled? má policy? je policy striktná (match na
   `agency_id`), alebo má únikové vetvy (`agency_id IS NULL OR ...`),
   prekrývajúce sa permissive policy, alebo anon prístup? (rovnaké diery ako
   sme našli na `leads`: anon insert true, NULL klapka, 6 prekrývajúcich policy).
3. Oprav nájdené diery rovnakým vzorom ako pri `leads`: jedna striktná tenant
   policy cez `profile_agencies_for_auth()`, `agency_id NOT NULL`, žiadny anon
   write bez WITH CHECK.
4. Rozšír centrálny `rls-tenant-isolation.test.ts` o KAŽDÚ tenant tabuľku
   (seed A/B + cross-tenant assertion `isolationOk`), nech CI chytí budúce diery.
PRIORITNÉ tabuľky (dáta klientov/osobné údaje): activities, agency_signals,
realvia_webhook_logs, realsoft_import_logs, client_dna, deal_risk, lead_events,
buyer_intents, outreach_*, broker_profiles, a všetky ďalšie s agency_id.

## WAVE B — GOVERNANCE: odrezať agent write do produkčnej schémy
Dôkaz problému: junk tabuľky v produkcii (`AI AGENT AUTOMAT ONBOARDING`,
`...no.2.01`, `gpmmfashion@gmail.com tabulka`) = niečo má write prístup do
prod schémy mimo CI/migrácií.
1. Zisti, ktoré credentials/procesy majú DDL/write prístup do produkčnej DB
   (service_role kľúče v agentoch, swarm procesy, MCP).
2. Oddeľ: agenti/swarm NESMÚ mať DDL prístup do produkcie. Schéma sa mení LEN
   cez migrácie v repo + PR. Kde agent potrebuje write dát, scoped service
   role bez DDL.
3. Pridaj guard (CI alebo DB), čo zachytí neočakávanú tabuľku v prod schéme
   mimo migračnej histórie.

## WAVE C — profile_agencies_for_auth() konsolidácia
Koreň P0 profile bugu (PR #98/#99): dvojzdroj pravdy o "ktorá je moja agency"
(`profile_agencies_for_auth()` vs subquery do `profiles`).
1. Nájdi VŠETKY miesta (policy, funkcie, kód), čo rozhodujú agency príslušnosť.
2. Zjednoť na JEDEN mechanizmus (`profile_agencies_for_auth()`, security-definer).
3. Test: user s jedným profilom vidí svoju agency; over, že neexistujú
   duplicitné profily (auth stub + canonical) pre toho istého usera.

## WAVE D — JUNK CLEANUP (ROZHODNI, potom oprav — NEDEŠTRUKTÍVNE bez potvrdenia)
Swarm NESMIE dropnúť nič sám. Namiesto toho:
1. Pre každú podozrivú tabuľku (`AI AGENT AUTOMAT ONBOARDING`, `...no.2.01`,
   `gpmmfashion@gmail.com tabulka`, prípadne `revolis_leads` s 1 riadkom)
   vypíš: count riadkov, vzorku obsahu, kedy naposledy zapísané.
2. Priprav DROP migráciu ako NÁVRH (zakomentovanú / pending review), NIE spustenú.
3. Founder potvrdí, čo je bezpečné dropnúť → až potom sa migrácia odomkne.

## WAVE E — TECH DEBT (menšie, ale otvorené z histórie)
1. `last_contact` migrácia `text` → `timestamptz` (+ prepis existujúcich ISO
   stringov). Pozor: Action Queue naň píše — uprav aj zápis.
2. AI triage fix: prečo dáva 439× "Nízka" prioritu? Buď oprav triage logiku,
   alebo ak nemá dosť dát, nech `ai_priority_strip` ostane pending (nie live
   na konštante). Súvisí s Brief 11 Wave C flipom.
3. Audit "skipped" testov: vypíš všetky preskakované testy, doplň chýbajúce
   (hlavne RLS/integračné), nech nič nepreskakuje ticho.
4. Hardcoded demo dáta audit: nájdi zvyšné výskyty (Kováč/Poláková/Kĺč/
   Plesslová) mimo revenue dashboardu, rozšír GUARD alebo skry.
5. docs/ cleanup (founder rozhodnutie): živé vs archív pre MASTER_PROMPT_V3.md
   a spol. — swarm môže navrhnúť štruktúru, presun potvrdí founder.

## TESTOVANIE (POVINNÉ)
- Každá opravená RLS policy: cross-tenant test (A nevidí/nezapíše B) v centrálnom
  rls-tenant-isolation.test.ts, beží v ephemeral CI.
- `last_contact` migrácia: test čítania/zápisu po type change.
- `npm run build` zelené, CI (ephemeral) zelená.

## DELIVERABLES
- PR per wave (rls-audit, governance, profile-consolidation, tech-debt),
  bez miešania. Wave D = NÁVRH migrácie, nie spustená.
- `docs/briefs/overnight/overnight-master-brief-12.md` + status.
- Report: zoznam nájdených RLS dier + ako opravené (do decisions.md).
- NIČ do main bez green CI. Žiadny DROP bez founder potvrdenia.

## ČO TENTO BRIEF VEDOME NEROBÍ
- Nedropuje junk tabuľky sám (founder rozhoduje — Wave D).
- Nepridáva nové featury — toto je hardening, nie expanzia.
- Nemení produkčnú schému ručne — len cez migrácie + PR.
```
