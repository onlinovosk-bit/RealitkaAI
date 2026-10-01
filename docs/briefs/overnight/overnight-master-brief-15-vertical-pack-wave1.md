---
title: "Overnight Master Brief 15 — Real Estate Vertical Pack Vlna 1"
project: Revolis.AI
type: overnight-master-brief
brief_number: 15
status: ready
created: 2026-06-18
tags: [revolis, vertical-pack, real-estate, capabilities, swarm]
related:
  - "[[L99-real-estate-vertical-pack-prompt]]"
  - "[[revolis-constitution-v2]]"
  - "[[kontrolor-SKILL]]"
---

# OVERNIGHT MASTER BRIEF 15 — Real Estate Vertical Pack, Vlna 1

## ⛔ FÁZA 0 — WRITE-CAPABILITY GATE (POVINNÁ, NEPRESKAKOVAŤ)
Pred akoukoľvek prácou over, že agent VIE zapísať do repa. Minulé behy
(wave12/13) vrátili TEXT bez commitov (AP-009). Preto:
1. Spusti JEDNÉHO agenta na triviálnu úlohu: vytvor vetvu `test/write-probe`,
   pridaj 1 riadok do `docs/audit/write-probe.md`, commitni, pushni.
2. Over z hlavného procesu: `git branch -a | grep write-probe` + `git log`.
3. **Ak vetva + commit existujú → pokračuj na Fázu 1.**
   **Ak NIE → ZASTAV celý brief.** Agent nemá write nástroje. Hlás to a skonči.
   NEPOKRAČUJ "naslepo" — vyrobil by si len text.
Done = artefakt (commit + zelené CI), NIKDY nie text. Toto platí na každý krok.

## ROZSAH (čo staviame a čo NIE)
- **Vstup pre VŠETKO:** reálna zákazka z UC import API (už tečie do `properties`).
  Žiadne mock dáta. Stavaj z reálnych polí (title, langData, ceny, plochy, images).
- **NESTAVAŤ (Vlna 2/backlog):** scoring, pricing, lead hunter, digital twin,
  capability registry. Chýba dátový zdroj alebo cargo cult pri 1 RK. Ak agent
  na ne narazí, preskočí ich a zaznamená do logu.
- Žiadne PII, žiadne auto-send navonok, žiadny scraping (zakázané akcie).

## ZÁVISLOSTNÝ GRAF (NIE paralelné vlny — majú poradie!)
```
KROK 1 (prvý, blokuje ostatné):
  Quality/Brand Guardian — kontroluje výstup VŠETKÝCH ostatných
KROK 2 (po Guardianovi):
  Listing Generator — zákazka → headline/popis/SEO (vstup pre Krok 3)
KROK 3 (paralelne, po Listing Generatori):
  Property Microsite  │  Banner Factory  │  Presentation Builder
  (všetky tri berú výstup Listing Generatora + Guardian QA)
```
Agenti v Kroku 3 BEŽIA paralelne (každý vlastná vetva, žiadne kolízie súborov).
Krok 1 a 2 sú sekvenčné — nesmú bežať naraz, lebo Krok 3 závisí od oboch.

## CAPABILITIES — špecifikácia

### KROK 1 — Quality/Brand Guardian (Core, prvý)
`apps/crm/src/lib/capabilities/quality-guardian/`
- Vstup: akýkoľvek vygenerovaný výstup (text/vizuál spec).
- Kontroluje: gramatika, brand (farby/logo/tón z brand kitu), právne texty,
  fakty proti zákazke (nevymýšľa parametre, ktoré v zákazke nie sú — AP-001).
- Výstup: PASS / FLAG s konkrétnym dôvodom. FLAG blokuje publish.
- Human approval gate: nič nejde navonok bez PASS + človek potvrdí.

### KROK 2 — Listing Generator
`apps/crm/src/lib/capabilities/listing-generator/`
- Vstup: zákazka z `properties` (reálna, z UC).
- Výstup: headline, popis (z langData ak je, inak z polí), SEO meta, keywords.
- GUARDRAIL: používa len polia, čo v zákazke REÁLNE sú. Chýbajúce pole →
  vynechá, nevymýšľa. Prejde cez Quality Guardian pred uložením.

### KROK 3a — Property Microsite
`apps/crm/src/lib/capabilities/property-microsite/`
- Vstup: zákazka + výstup Listing Generatora.
- Výstup: samostatná stránka na nehnuteľnosť (hero, fotky z images[], popis, kontakt).
- noindex kým nie je human-approved. Žiadne lead formuláre s auto-send.

### KROK 3b — Banner Factory
`apps/crm/src/lib/capabilities/banner-factory/`
- Vstup: zákazka + brand kit.
- Výstup: stavové vizuály (Na predaj / Znížené / Predané / Rezervované) v jednotnom štýle.
- Prejde Quality Guardian (brand QA) pred uložením.

### KROK 3c — Presentation Builder
`apps/crm/src/lib/capabilities/presentation-builder/`
- Vstup: zákazka + Listing Generator výstup.
- Výstup: owner/buyer deck (PDF). Prejde Quality Guardian.

## ENGINEERING OS PRE KAŽDÚ CAPABILITY (light, nie enterprise)
Každá dostane: vlastný workflow, audit log (kto/čo/kedy vygeneroval), human
approval gate pred publish, basic cost log (tokeny). NIE: enterprise dashboard,
capability registry, process mining (to je Vlna 3 cargo cult pri 1 RK).

## OBSIDIAN VAULT
Vault `RealitkaAI-Memory` je oddelený repo — Obsidian Git ho zálohuje samostatne.
Swarm doň NEzapisuje priamo. Ak má capability poznatok hodný zápisu, zaznamená
ho do `docs/audit/` v kódovom repe (nie do vaultu) — vault je tvoja doména.

## TESTOVANIE (POVINNÉ, inak je to slop)
- Unit: každá capability na REÁLNEJ zákazke z `properties` (nie mock).
- Quality Guardian: test, že FLAG blokuje publish; že nevymyslené pole prejde,
  vymyslené pole zachytí.
- Integračné (ephemeral CI): RLS — capability vidí len zákazky vlastnej agentúry.
- `npm run build` + CI zelené pred merge. Kontrolór PASS.

## DELIVERABLES
- 5 PR-iek (1 capability = 1 PR), v poradí závislostí: Guardian → Listing →
  {Microsite, Banner, Presentation} paralelne.
- Každý PR: vlastná vetva, vlastný Vercel preview, zelené CI, Kontrolór prejazd.
- NIČ do main bez green CI + human review. Žiadny auto-merge na týchto (nové capabilities).
- Status do `docs/briefs/overnight/overnight-master-brief-15.md`.

## ZAKÁZANÉ (stála ZAKÁZANÉ AKCIE línia)
- Auto-send emailov/kampaní navonok bez human approval.
- Scraping portálov / PII tretích strán.
- Stealth lead-gen v akejkoľvek forme (CI guard to teraz chytá ako vzor).
- Stavať Vlnu 2/3 capabilities (scoring/pricing/lead-hunter/digital-twin/registry).
- Commit/merge bez zeleného CI (žiadny bypass na kóde).

## AK NIEČO ZLYHÁ
- Write-probe zlyhá (Fáza 0) → ZASTAV, hlás, nepokračuj.
- Capability nemá reálny vstup → preskoč, zaznamenaj, nestavaj na mocku.
- CI červené → nemerguj, oprav príčinu (nie workaround).
