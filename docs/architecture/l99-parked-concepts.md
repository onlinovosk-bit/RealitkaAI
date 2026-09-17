# L99 Parked Concepts

Koncepty zaparkované mimo aktívnej exekúcie. Dôvod: chýbajú dáta, timing, alebo závislosť na Guardian 5/5 + human approval.

| Koncept | Prečo parked |
|---------|----------------|
| **Neural Core** | Nemá produkčný dataset; predčasné pred Loop 2 substrátom |
| **Founder Brain** | Interné rozhodovanie — nie customer-facing moat |
| **Contrarian Brain** | Vyžaduje Genome s N≥2 klientov |
| **Counterfactual Engine** | Vyžaduje históriu rozhodnutí v `decisions` (Loop 2) |
| **Market Memory** | Network loop — blocked pred zákazníkom #2 |
| **Genome Factory (auto-deploy polovica)** | Auto-deploy bez human approval — VETO; plná verzia až za Guardian 5/5 |
| **Growth Intelligence System (plná verzia)** | Nie sú dáta ani objem — viď P-GI nižšie |
| **Model Routing + Cost Governor** | Neškrtá reálne peniaze pri dnešnom objeme — viď P-MR nižšie |

## Re-open podmienky

1. Loop 1 (Revenue) má merateľný win u zákazníka A (Smolko).
2. Loop 2 zapisuje predikcie + outcomes (Genome substrát v prevádzke).
3. Guardian PROD 5/5 — predajný argument, nie len code-truth.

## Aktívna exekúcia (nie parked)

- **Loop 1:** Follow-up Agent (draft-only) — Brief 10 Wave A
- **Loop 2 substrát:** `decisions`, `exclusivity_outcomes` — v PROD DB
---

## P-GI — Growth Intelligence System (plná verzia)

**Zaparkované:** 2026-09-03
**Zdroj návrhu:** externý AI výstup („REVOLIS Growth Intelligence System" + master
prompt „Growth Intelligence Foundation"), predložený founderom 3.9.2026.
**Status master promptu:** NESPUSTENÝ. Podľa pravidla autority nie je founder GO.

### Čo je zaparkované

Sémantická analytická vrstva nad GA4 + Search Console + CRM: normalizačný adaptér,
doménový model (`Visitor` → `Intent Signal` → `Lead` → `Qualified Lead`),
deterministický analytický engine (porovnanie období, trendy, anomálie,
funnel drop-off), AI interpretačná vrstva, `GrowthOpportunity` model a
uzavretá slučka insight → hypotéza → experiment → meranie.

### Čo NIE JE zaparkované

Princípy z toho návrhu platia už teraz —
`docs/architecture/adr-2026-09-03-growth-intelligence-principles.md`
(P0 rozsah merania, P1 adaptér nie doménový model, P2 deterministika pred LLM,
P3 fakt/hypotéza/odporúčanie, P4 dátová minimalizácia, P5 cost governance,
P6 kontinuita kontextu, P7 zapnuté > postavené). Definície metrík sú
v `docs/architecture/growth-metrics-definitions-v0.md`.

### Prečo parked

1. Objem: Google kampaň 1.7.–31.8.2026 priniesla 13 klikov. Detekcia anomálií na
   takom objeme je generátor náhodných čísel.
2. Pokrytie merania: GA je zapojené len v `(marketing)`. Sprievodca a verejný
   výpis nehnuteľností pod `(public)` sa nemerajú vôbec.
3. Cookie gating bol nasadený až 4.9.2026 (PR #517) — pred ním nebol zber legitímny.

### Re-open podmienky (všetky tri naraz)

- [ ] GA4 zbiera **so súhlasom** aspoň **30 dní** bez prerušenia
- [ ] Merané povrchy majú aspoň **500 relácií mesačne** (pod tým nie je baseline)
- [ ] Tú istú analytickú otázku si položil **ručne aspoň 3×** cez GA4 MCP read-only —
      dôkaz opakovaného vzoru podľa princípu 5 Ústavy (YAGNI)

Kým platí čo i len jedna nesplnená podmienka, odpoveď na „postavme Growth
Intelligence" je nie, a odkaz je sem.

---

## P-MR — Model Routing + Cost Governor

**Zaparkované:** 2026-09-03
**Zdroj návrhu:** externý AI výstup („Model Routing Intelligence"), founder 3.9.2026.

### Čo je zaparkované

Systém, ktorý pre každú úlohu odhadne náročnosť, vyberie najlacnejší model
s dostatočnou pravdepodobnosťou úspechu, zachová kontext pri prechode medzi
modelmi, eskaluje pri zlyhaní a meria **cost per successful task**.

Eskalačný rebrík (jadro myšlienky, nech prežije bez pôvodného textu):

```
veľký objem vstupov
    ↓  lacní workeri: klasifikácia, enrichment, extrakcia, scoring
filter
    ↓  top ~1 %
stredná trieda modelov
    ↓  top ~0,1 %
frontier model: strategické rozhodnutie, architektúra, kontrola výsledku
```

### Čo si z toho brať už teraz (nestojí nič)

- Metrika je **cena za úspešne dokončenú úlohu**, nie cena za token.
- Frontier model sa nevolá automaticky, ale ako **eskalačná vrstva**.
- Prekrýva sa s P5 (cost governance) v ADR. Neduplikovať.

### Prečo parked

Router škrtá percentá z reálnej sumy. Audit z 4.9.2026
(`docs/audit/2026-09-04-ai-cost-telemetry.md`) zistil, že `costEur` sa počíta na
6 miestach a **nikde nedopadne** — migrácie `20260611000002_ai_action_audit_cost.sql`
a `20260611000004_ai_cost_daily.sql` neboli aplikované na produkciu, takže
`logAiAction` od 11.6.2026 ticho zlyháva (AP-010). `CREDITS_ENFORCEMENT` je navyše
vypnuté. Nemáme teda ani meranie, z ktorého by router vychádzal.

### Re-open podmienky (stačí jedna)

- [ ] Mesačné náklady na AI API **v aplikácii** presiahnu **300 €**
      *(návrh Claude, čaká na potvrdenie founderom — pri ~30 % úspore je to zhruba
      hranica, kde sa dvoj- až trojtýždňová práca vráti do roka)*
- [ ] Lead Factory spracúva viac ako **5 000 leadov mesačne**

### Podmienka pred stavbou (aj po splnení re-open)

Najprv **aplikovať tie dve migrácie** a potom **mesiac merania** skutočnej ceny za
úspešne dokončenú úlohu podľa typu úlohy. Bez tých dát by router optimalizoval
odhad, nie realitu — presne ten druh práce, pred ktorým varuje AP-007.

### Overovanie cien modelov

Ceny a benchmarky v pôvodnom návrhu pochádzajú z marketingových stránok dodávateľov
a nie sú nezávisle overené. Pri akomkoľvek rozhodnutí o peniazoch platí:
**cenu over v deň rozhodnutia priamo na cenníkovej stránke dodávateľa.**
Nepoužívať čísla z tohto dokumentu ako vstup do kalkulácie.

