# RUFLO SWARM — AKTIVÁCIA: Vlna 1 K3 + paralelné nezávislé úlohy

## ⛔ FÁZA 0 — WRITE-PROBE (ak je to nová session, znova over)
Predošlý PASS: `origin/test/write-probe @ 20fccc4a6`. Ak beží tá istá session,
preskoč. Ak nová → spusti 1 agenta: vetva `test/write-probe-2`, 1 riadok do
`docs/audit/write-probe.md`, commit, push, over `git log`. Ak nezapíše → ZASTAV.

## KONTEXT (dôležitá zmena oproti včerajšku)
Dáta UŽ EXISTUJÚ a sú REÁLNE: 91 zákaziek `source_system='realvia'` v `properties`
(reálne Smolkove inzeráty z Košíc/Prešova) + 439 reálnych leadov. K1 Guardian (#216)
a K2 Listing (#219) sú MERGNUTÉ v main. Testuj na REÁLNEJ zákazke, NIE na
`UC_DOC_LISTING_SAMPLE`. Testovací fixture = reálna zákazka, napr.
`source_id='13303557'` (Predaj novostavby RD Modrá nad Cirochou) alebo
`source_id='2772732443'` (Prenájom 3-izb Košice Trieda SNP). Payload majú v `payload_raw`.

## VLNA A — K3 CAPABILITIES (3 paralelné vetvy, vstup z mergnutého K2)
Bežia paralelne, KAŽDÁ vlastná vetva, žiadne kolízie ciest (rôzne priečinky):

### A1 — Property Microsite  `feat/vertical-pack-property-microsite`
`apps/crm/src/lib/capabilities/property-microsite/`
Vstup: reálna zákazka + K2 Listing výstup. Výstup: samostatná stránka na
nehnuteľnosť (hero, fotky z `images`, popis, kontakt makléra z `broker_*`).
noindex kým nie je human-approved. Žiadne lead formuláre s auto-send. → PR K3a.

### A2 — Banner Factory  `feat/vertical-pack-banner-factory`
`apps/crm/src/lib/capabilities/banner-factory/`
Vstup: reálna zákazka + brand kit. Výstup: stavové vizuály (Na predaj / Znížené /
Predané / Rezervované) v jednotnom štýle. Prejde Guardian (brand QA). → PR K3b.

### A3 — Presentation Builder  `feat/vertical-pack-presentation-builder`
`apps/crm/src/lib/capabilities/presentation-builder/`
Vstup: reálna zákazka + K2 Listing. Výstup: owner/buyer deck (PDF). Prejde Guardian. → PR K3c.

VŠETKY A: použijú len polia, čo v zákazke REÁLNE sú (AP-001 — nevymýšľať).
Prejdú Quality/Brand Guardian (K1) pred uložením. Human approval pred publish.

## VLNA B — NEZÁVISLÉ ÚLOHY (paralelné s A, iné súbory, nekolidujú)

### B1 — processed flag fix  `fix/realvia-webhook-processed-flag`
`realvia_webhook_logs` má 107 záznamov `processed=false`, hoci dáta SÚ v properties
(91 realvia). Zisti príčinu: buď processor flag nenastavuje po úspešnom mapovaní,
alebo properties prišli inou cestou. Oprav tak, aby `processed=true` zodpovedalo
realite (záznam reálne spracovaný do properties). NEnastavovať naslepo — over
párovanie cez `source_id`. Migrácia + oprava processora. → PR B1.

### B2 — BRI diagnostika (READ-ONLY, žiadna zmena logiky)
Nájdi v kóde, ako sa počíta Buyer Readiness Index / lead score. Vypíš REPORT do
`docs/audit/bri-diagnostic.md`: z ktorých polí BRI počíta (budget? status?
interactions? last_contact?), prečo 439 leadov dostáva default (chýbajúce polia),
a aký minimálny set polí treba doplniť, aby BRI dával reálne skóre. **NEMENIŤ BRI
kód** — len diagnostika a report. → PR B2 (len doc).

## ZAMKNUTÉ — NESTAVAŤ (Vlna 2/3)
Scoring engine, pricing, lead hunter, digital twin, capability registry, Engineering
Genome, simulation, auto-kalibrácia. Chýba dáta alebo cargo cult pri 1 RK. Ak agent
narazí → preskočí, zaznamená, NESTAVIA.

## ŽELEZNÉ PRAVIDLÁ
- Done = ARTEFAKT (commit + push + zelené CI), NIKDY text (AP-009).
- 1 capability/úloha = 1 PR, vlastná vetva, vlastný Vercel preview, Kontrolór PASS.
- Reálne dáta, nie mock (AP-003). Žiadne vymyslené polia/čísla (AP-001).
- Žiadny auto-send navonok, scraping, stealth (zakázané akcie, CI guard ich chytá).
- RLS: každá capability vidí len vlastnú agentúru (ephemeral CI test).
- Commit/merge len po zelenom CI. Žiadny bypass.

## ZHRNUTIE NA KONCI BEHU (povinné)
Vypíš tabuľku: úloha → vetva → commit hash → CI stav → artefakt áno/nie.
Žiadne "hotovo" bez `git` dôkazu. Čo ostalo ako text/nedokončené a prečo.
