---
title: "Overnight Master Brief 7 — Focus the Product"
project: Revolis.AI
type: overnight-master-brief
brief_number: 7
status: ready
created: 2026-06-15
tags: [revolis, tier-gating, anti-hallucination, ux, trust, remove-not-add]
related:
  - "[[overnight-master-brief-6]]"
  - "[[enrichment-research-poc-brief]]"
  - "[[decisions]]"
---

# OVERNIGHT MASTER BRIEF 7 — Focus the Product

> Téza: zrelý produkt ukazuje MENEJ, ale všetko funguje. Tento brief NEPRIDÁVA
> ani jednu featuru — ODSTRAŇUJE nepostavené a GATEuje vyššie-tierové, aby
> zákazník na svojom pláne nevidel prázdne "Čoskoro" karty ani upsell šum.
> Trigger: Market Vision zákazník (Smolko) vidí pri prihlásení zamknuté
> Protocol Authority moduly + tri prázdne "Čoskoro" karty (Plánovaná stavba,
> Bod zlomu, Zmena v okolí). To nie sú bugy — tie featury NEEXISTUJÚ.

## PREREQ (BEZ TOHTO NEZAČÍNAJ — pýtaj sa, nehádaj)
1. ROZHODNUTIE hide-vs-upsell per trieda modulu (potvrdí founder):
   - `unbuilt` (žiadny backend) → VŽDY úplne skryť. Žiadna "Čoskoro" karta.
   - `gated` (postavené, ale vyšší tier) → čestný upsell ALEBO skryť. Default
     odporúčanie: skryť pre nižšie tiery (čistejšie, menej šumu). Ak founder
     chce upsell, MUSÍ byť jasne označený ako "vyšší plán", NIKDY ako "Čoskoro".
2. USAGE DÁTA z Briefu 6 (Úloha 3): ak instrumentation beží → použi ju na
   poradie/prioritu zostávajúcich modulov. Ak NEbeží → scope = len skryť+gateovať,
   ŽIADNE preusporiadanie podľa usage (nehádaj čo sa používa).
3. `resolveTeamAccountTier` (Brief 6, Úloha 1) musí čítať `manual_plan` správne —
   tier-gating na ňom stojí. Ak ešte nie je mergnuté, najprv to.

## ZÁSADY (NEPREKROČIŤ)
- Tento brief NEPRIDÁVA featuru. Ak by úloha viedla k stavaniu nového modulu — ZASTAV.
- merge ≠ deployed ≠ verified. Nič do main bez green CI.
- Tier-gating je billing-adjacent → preview + smoke, nie len "copy change".
- E2E/RLS testy LEN proti ephemeral `supabase start` v CI (žiadne hosted secrets).
- Nepredpokladaj. Chýbajúce dáta = pýtaj sa.

## ANTI-HALLUCINATION PRAVIDLO (jadro tohto briefu)
Modul bez funkčného backendu sa NIKDY nesmie vyrenderovať ako karta/menu položka,
ktorá implikuje, že existuje. Konkrétne ZAKÁZANÉ:
- "Čoskoro" karty pre featury, ktoré nemajú reálnu implementáciu.
- Mock/demo dáta vydávané za živé (žiadni Kováč/Poláková/Kĺč/Plesslová).
- Rozmazané "DOSTUPNÉ V PLÁNE X" panely, ktoré zaberajú hlavný priestor.
Pravidlo: featura je buď `live` (ukáž), `gated` (čestný upsell/skry), alebo
`unbuilt` (úplne skry). Žiadny štvrtý "tvári sa hotovo" stav.

## ÚLOHA 1 — Module registry (single source of truth)
Vytvor `src/lib/modules/registry.ts`:
- Každý modul/karta/menu-item deklaruje:
  `{ key, label, requiredTier, status: 'live' | 'gated' | 'unbuilt' }`.
- Audituj VŠETKY aktuálne renderované moduly v L99 hube + dashboarde + menu
  a klasifikuj každý. (Nadviaž na existujúci Vlna 0 audit, ak je v repo.)
- `unbuilt` priklady z produkcie: Plánovaná stavba, Bod zlomu, Zmena v okolí
  (a všetky "ČOSKORO — napojenie na verejné registre").
- Registry je deklaratívna policy (Red Hat policy-as-code) — viditeľnosť sa
  riadi týmto súborom, nie roztrúsenými if/else v komponentoch.

## ÚLOHA 2 — Tier-gating render logika
- Centrálny `canRenderModule(moduleKey, userTier)`:
  - `status==='unbuilt'` → NIKDY nerenderuj (bez ohľadu na tier).
  - `status==='live' && userTier >= requiredTier` → renderuj normálne.
  - `status==='gated'` → podľa rozhodnutia z PREREQ (skry alebo čestný upsell).
- `userTier` ber z `resolveTeamAccountTier` (číta `manual_plan`).
- Nahraď roztrúsené ad-hoc gating checky volaním tejto jednej funkcie.

## ÚLOHA 3 — Odstráň fake "Čoskoro" karty
- Zmaž/skry render všetkých `unbuilt` modulov z hub + dashboard + menu.
- Hlavný panel: ak je obsah `gated`/`unbuilt`, nenechaj rozmazaný upsell teaser
  zaberať primárny priestor — nahraď reálnym `live` obsahom alebo zúž.

## TESTOVANIE (POVINNÉ)
- Unit: `canRenderModule` pre maticu (tier × status) — hlavne že `unbuilt`
  nevráti true NIKDY a že Market Vision nevidí Protocol Authority `live` moduly.
- Render/component test: prihlásený Market Vision user (Smolko fixture)
  NEVIDÍ žiadny Protocol Authority modul ani žiadnu `unbuilt` kartu.
- GUARD test (anti-halucinácia): prejdi celý renderovaný strom hubu a over,
  že sa neobjaví ŽIADNY modul so `status==='unbuilt'`. Tento test je merge gate.
- `npm run build` zelené, CI (ephemeral) zelená.

## DELIVERABLES
- PR `focus-product-tier-gating` (registry + canRenderModule + odstránenie unbuilt).
- `src/lib/modules/registry.ts` ako jediný zdroj pravdy o viditeľnosti.
- `docs/briefs/overnight-master-brief-7.md` (tento súbor) + status.
- Doplň do automerge DENYLIST: `/^apps\/crm\/src\/lib\/modules\//`
  (viditeľnosť featur je billing-adjacent — vyžaduj manuálny review).
- NIČ do main bez green CI + prejdeného GUARD testu.

## ČO TENTO BRIEF VEDOME NEROBÍ
- Nestavia "Plánovaná stavba/Bod zlomu/Zmena v okolí" — to je mesiace reálnej
  integrácie na verejné registre, nie nočná úloha. Skrýva ich, kým nebudú reálne.
- Nerobí fake stuby, čo vyzerajú hotovo. To by zákazníka klamalo viac, nie menej.
- Nedotýka sa billing engine — len ČÍTA tier cez resolveTeamAccountTier.
