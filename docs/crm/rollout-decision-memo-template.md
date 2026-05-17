# Revolis CRM - Rollout Decision Memo (Template)

Decision date: 2026-04-14  
Decision time (CEST): 07:59  
Rollout mode: Accelerated drill (draft)  
Plan references:
- `docs/rollout-plan-24-48h-phases.md`
- `docs/rollout-plan-24-48h-operational-now.md`

## 1) Final decision

- Decision: `CONDITIONAL GO` (draft)
- Effective from: 2026-04-14 08:00
- Approved by:
  - Business Owner: Andrej Ondrus (pending final sign-off)
  - Tech Lead: Andrej Ondrus
  - Product Lead: Andrej Ondrus

## 2) Executive summary (max 5 lines)

- Technické gate checks prešli: smoke, dashboard summary, playbook, assistant, billing plan.
- V accelerated drill režime sú prvé hypercare checkpointy (1-3) zelené.
- Kritické riziká P0 neboli detegované; aktuálne otvorené incidenty: P0=0, P1=0, P2=0.
- Podmienečnosť rozhodnutia je viazaná na dokončenie manuálneho browser-auth golden path.
- Po uzavretí T0 manuálnych krokov je možné prepnúť draft na plné GO.

## 3) Evidence snapshot

- Availability: n/a (drill režim, bez plného 24h okna)
- Assistant p95 latency: n/a (drill snapshot only)
- Assistant fallback/error ratio: n/a (drill snapshot only)
- Billing checkout/portal status: PASS (plan endpoint), WARN (checkout vyžaduje autentifikovanú session)
- Open incidents: P0=0 / P1=0 / P2=0
- Data integrity notes: API odpovede konzistentné, bez detekovaného narušenia dát.

## 4) Exit criteria review

- [x] No unresolved P0
- [x] P1 issues mitigated or owned with ETA
- [ ] Critical flows passed (login, dashboard, lead detail, assistant, billing)
- [x] Monitoring trend acceptable
- [x] Stakeholder communication prepared

## 5) Risks and mitigations

1. Risk: Browser-auth golden path zatiaľ nie je potvrdený v drill logu.  
   Severity: P1  
   Mitigation: Manuálny test login -> dashboard -> lead detail -> billing checkout click.  
   Owner: Andrej Ondrus  
   Due: 2026-04-14 08:15

2. Risk: Playbook fallback obsahuje demo položky (mock) pri absencii živých dát.  
   Severity: P2  
   Mitigation: Označenie DEMO + transparentná komunikácia + následná náhrada živými dátami.  
   Owner: Andrej Ondrus  
   Due: 2026-04-14 12:00

3. Risk: Billing checkout API vracia chybu pri neautentifikovanom volaní (očakávané správanie).  
   Severity: P2  
   Mitigation: Overiť flow v prihlásenej session a ponechať user-friendly error handling.  
   Owner: Andrej Ondrus  
   Due: 2026-04-14 08:20

## 6) 7-day action list

1. Action: Dokončiť browser-auth golden path a uzavrieť T0 manuálnu časť.  
   Priority: High  
   Owner: Andrej Ondrus  
   Due: 2026-04-14

2. Action: Nahradiť demo fallback v playbooke živými dátami, keď budú stabilne dostupné.  
   Priority: High  
   Owner: Andrej Ondrus  
   Due: 2026-04-15

3. Action: Sledovať Stripe Workbench a Vercel chyby počas 24h po drill štarte.  
   Priority: Medium  
   Owner: Andrej Ondrus  
   Due: 2026-04-15

4. Action: Dokončiť decision memo finalizáciu na GO/CONDITIONAL GO po uzavretí checkpointov.  
   Priority: Medium  
   Owner: Andrej Ondrus  
   Due: 2026-04-14

5. Action: Pripraviť stakeholder update s final statusom a ďalším 7-day plánom.  
   Priority: Medium  
   Owner: Andrej Ondrus  
   Due: 2026-04-14

## 7) Stakeholder update (copy/paste)

`[ROLLOUT DECISION] Revolis CRM`
`Decision: CONDITIONAL GO (draft)`
`Status: YELLOW`
`Open incidents: P0=0 / P1=0 / P2=0`
`Top notes: 1) Core API gates PASS 2) Hypercare #1-#3 GREEN 3) Waiting for browser-auth T0 confirmation`
`Next 7 days: owners assigned, execution starts immediately.`

