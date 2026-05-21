# AI UX Narrative Map — Workdesk Phase 3

Každý modul musí aktívne riadiť používateľa, nie len zobrazovať dáta.

| Screen | AI Purpose | Business Outcome | Next Best Action (copy) | Money metric | Telemetry event |
|--------|------------|------------------|-------------------------|--------------|-----------------|
| **Dashboard** | Kde sú peniaze dnes | Owner vie kam ísť prvý | „Zavolaj {lead} — {timing}" | Provízia € z budget | `priority_strip_view`, `next_best_action_click`, `call_now_click` |
| **Leads** | Kto je pripravený kúpiť | Zníženie response time | „Kto je pripravený kúpiť dnes?" strip | Hot lead count + € | `hot_leads_click`, `lead_priority_open` |
| **Forecast** | Čo ohrozuje mesiac | Ochrana pipeline hodnoty | „€{gap} riziko — dealy bez follow-up" | Expected pipeline € | `forecast_alert_open` |
| **Pipeline** | Ktorý deal posunúť | Zrýchlenie closingu | „Ktorý deal treba posunúť dnes?" | Weighted pipeline € | `dashboard_module_open` (pipeline_action) |
| **Team** | Kto stráca peniaze | Ochrana výkonu tímu | „Ktorý maklér práve stráca peniaze?" | Risk € per agent | `team_alert_click` |

## License depth (budúca fáza)

| Program | Mindset | AI depth | Urgency |
|---------|---------|----------|---------|
| Smart Start | Prežívam | Demo signály, 1 NBA | Nízka |
| Active Force | Vidím príležitosti | Plný strip + NBA | Stredná |
| Market Vision | Chránim pipeline | + forecast alerts | Vysoká |
| Protocol Authority | Ovládam trh | + team + market signals | Executive |

## Implementačný stav

- ✅ Dashboard: `AIPriorityStrip`, `NextBestActionPanel`, `executive-signals.ts`
- ✅ Leads: `LeadsHotStrip`
- ✅ Forecast: `ForecastRiskStrip`, `forecast-signals.ts`, light `DealHealthPanel`
- ✅ Pipeline: `PipelineActionStrip`
- ✅ Team: `TeamActionStrip`, `team-signals.ts`, light `TeamOwnerInsights`
- ✅ Telemetry: `ai-telemetry.ts` → `CustomEvent('monitoring')`
