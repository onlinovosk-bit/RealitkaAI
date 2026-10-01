# Product Roadmap Mapping 2026-07 — 16 modulov vs. existujúca architektúra

**Cieľová cesta:** `docs/architecture/product-roadmap-mapping-2026-07.md`
**Verdikt panelu (30 Principals):** 9/16 modulov = REUSE/EXTEND existujúcich
schopností · 3 moat moduly = stratégia Capture-now/Learn-later · 4 = DEFER
za zákaznícky signál. Nula nových systémov tam, kde existuje vlastník.

## Mapovacia tabuľka (záväzná — konfrontovať pri každom "postavme X")

| # | Modul | Rozhodnutie | Kanonický vlastník / existujúci základ | Brána |
|---|---|---|---|---|
| 1 | Smart Onboarding wizard | DEFER (wizard) + NEW (runbook) | Onboarding runbook `docs/playbooks/onboarding.md` — Kamzík ho potrebuje TERAZ manuálne | Wizard: ≥5 zákazníkov ALEBO onboarding bolesť ≥2× |
| 2 | AI Import Cleaner | EXTEND | Import pipeline (`scripts/import-*-contacts.ts`) + dedup v email gateway | UI review screen: ≥2 zákazníci importujúci sami |
| 3 | Lead Intelligence Engine | **REUSE — EXISTUJE** | AI triage (`ai_priority` + dôvod), BRI, Next Best Action (PR #277), Team Pressure | Rozšírenia skóre: dáta z Guardian/Decision logu |
| 4 | Today Dashboard | EXTEND | `dashboard-insights-cron/gather` — widgety doplniť z Guardian nálezov | Po Guardian v1 |
| 5 | **Guardian Service** (moat 3) | **EXTEND → BUILD v1** | Meno aj vzor existuje (heartbeat cron, integrity_alerts); v1 = hodinový check nad `lead_events`: bez aktivity 7d, bez ownera, bez follow-upu → digest notifikácia | Core Platform test: Smolko 439 kontaktov = dokázaná potreba. Najmenšia overiteľná zmena: 1 cron + 1 tabuľka `guardian_findings` |
| 6 | Activity Timeline | EXTEND | `lead_events`, `lead_property_events` — dáta sú, chýba len UI zoskupenie po dňoch | UI: zákaznícky dopyt |
| 7 | Property Intelligence | EXTEND | `regional-prices.json`, `kataster_events`, `listings_snapshot`, `listing_price_history`, `lead_property_matches/scores` — stavebnice existujú | Stránka: signál od zákazníka |
| 8 | **Organizational Memory** (moat 1) | **CAPTURE NOW** | Pri uzavretí dealu povinné 2 polia: `win_reason`/`lost_reason` + auto: čas, agent, typ, lokalita, cena → `deal_outcomes` | Learning/AI vyhľadávanie: brána 3 zákazníci (nezmenené). Zber dát: HNEĎ — história sa nedá dogeniť |
| 9 | **Decision Memory produktová** (moat 2) | **CAPTURE NOW** | Log vrstva: každé AI odporúčanie (NBA, triage, email) → `ai_recommendations` (odporúčanie, dôvod, accepted/rejected, outcome_at) | Learning slučka: brána 3 zákazníci. Log: HNEĎ — každý deň bez logu = stratené tréningové dáta |
| 10 | Automation Builder (vizuálny) | DEFER | n8n pokrýva interné; zákaznícky builder = veľký Customer Feature | ≥3 zákazníci žiadajúci automatizácie |
| 11 | Follow-up Generator | **REUSE — EXISTUJE** | AI email (1 kredit) + n8n W1 drafty; personalizácia z histórie = EXTEND promptu, nie nový modul | — |
| 12 | Performance Intelligence | DEFER | Team Pressure v1 je základ | Zákazník s ≥3 maklérmi, ktorý to žiada |
| 13 | Revenue Forecast | DEFER | — | ≥3 zákazníci s pipeline dátami |
| 14 | Universal/semantic search | DEFER | — | Zákaznícky signál; pozor na náklady embeddings |
| 15 | Command Palette (CMD+K) | NEW-malé (Cosmetic→batch) | Čistý frontend, žiadne dáta | Batch s najbližším UI PR |
| 16 | Procesná vrstva celkovo | POTVRDENÉ | Konkurencia ju rieši — my ju máme "dosť dobrú", nie dokonalú | Neutekať do parity pretekov — diferenciácia je v pamäti |

## Moat stratégia: Capture now, Learn later
Tri moduly (Org Memory, Decision Memory, Guardian) sú skutočný rozdiel —
ale ich hodnota rastie s HISTÓRIOU dát, nie s kódom. Model sa dá kúpiť,
12 mesiacov outcome dát nie (North Star). Preto:
- **Fáza CAPTURE (teraz, lacná):** 2 tabuľky + polia pri uzavretí dealu +
  log AI odporúčaní + Guardian v1 cron. Odhad: malé PR, žiadne AI.
- **Fáza LEARN (brána 3 zákazníci, nezmenená):** vyhľadávanie pamäte pred
  odpoveďou, kalibrácia odporúčaní z outcomes, "87 % úspešnosť pri
  podobných prípadoch".
Dôsledok: brány z COMPANY.md sa NEMENIA — mení sa len to, že zberná vrstva
nie je za bránou, lebo bez nej brána nikdy nebude mať čo učiť.

## Poradie realizácie (viazané na zákazníkov, nie na zoznam)
1. **Onboarding runbook** (docs) — Kamzík platí 99 € za onboarding budúci
   týždeň; runbook = okamžitá potreba, wizard nie.
2. **Capture PR** — `deal_outcomes` + `ai_recommendations` + win/lost polia.
3. **Guardian v1** — cron + `guardian_findings` + digest (kŕmi aj Today
   Dashboard widget "zabudnuté leady").
4. Všetko ostatné čaká na svoju bránu z tabuľky.
Každý z bodov 2–3 = samostatný brief s premortem (workflow.mdc pravidlo).
