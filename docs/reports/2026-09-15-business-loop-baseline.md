# Business loop baseline — 2026-09-15

**Zdroj:** zmerané 2026-09-14/15, founder session  
**Účel:** `production_effect` pre Lane C (`fix/w2-matching-guards`) — meria produktový stav, nie len kód.  
**Poznámka:** SQL nižšie **napísať, nespúšťať** v tejto lane (žiadny prod prístup).

| # | Krok | Dnešná hodnota (15. 9. 2026) | SQL (nevykonané) |
|---|---|---|---|
| 1 | SIGNAL | posledný Realvia webhook `2026-09-11` | `select max(received_at) as last_signal from realvia_webhook_events;` — tabuľku/stĺpce prispôsob podľa skutočnej schémy Realvia ingestu |
| 2 | LEAD | 506 | `select count(*) as leads from leads;` |
| 3 | INTENT | 3 `buyer_intents` | `select count(*) as buyer_intents from buyer_intents;` |
| 4 | QUALIFICATION | **0** `lead_property_matches` | `select count(*) as lead_property_matches from lead_property_matches;` |
| 5 | WARMING | neexistuje | — (krok v produkte zatiaľ nie je) |
| 6 | OUTREACH | **0** leadov s `auto_response_sent_at` | `select count(*) as outreach_sent from leads where auto_response_sent_at is not null;` |
| 7 | RESPONSE | **0** aktivít za 7 dní | `select count(*) as activities_7d from lead_activities where created_at >= now() - interval '7 days';` — názov tabuľky overiť |
| 8 | APPOINTMENT | **0** obhliadok | `select count(*) as viewings from viewings;` — alebo ekvivalentná tabuľka obhliadok |
| 9 | MANDATE | 0 | `select count(*) as mandates from mandates;` — alebo ekvivalent |
| 10 | FEEDBACK | neexistuje | — (krok v produkte zatiaľ nie je) |

## Interpretačný kontext pre matching guards

- 439/506 leadov má prázdny `property_type` (founder session).
- Pred zapnutím párovania nesmie skóre tvrdiť zhodu pri prázdnych hodnotách na oboch stranách.
- QUALIFICATION = 0 je baseline; Lane C opravuje skórovanie, nespúšťa `recalculateAllMatches()`.