# Balík D „secdef-callers-close" — mapa ciest (PROD `ypgajkhqtbriqqmyawyv`, 2026-10-14)

Stav: **kód v PR, SQL NEAPLIKOVANÉ.** Odomykacie slová: `GO D-APPLY` / `GO D-ROLLBACK`.
Poradie: merge PR (zelené CI) → Vercel Ready → `verify-before.sql` → `apply.sql` → `verify-after.sql`.
`verify-before.sql` je zhodný so stavom PROD z 2026-10-14 (14/14 + 7/7 + 7/7 + 2/2 kontrol; pred zmenou).

| Funkcia | Volajúci v kóde (pred) | Volajúci (po tomto PR) | Iné odkazy v DB |
|---|---|---|---|
| `add_price_point` | `lib/price-trail/engine.ts` (session klient; cron `price-trail-sync` cez anon) | service role | žiadne |
| `compute_bri_score_v2` | `lib/bri/engine.ts` (session; webhook `inbound/process-lead`; cron) | service role | žiadne |
| `compute_bri_score` | `lib/events/bri-score.ts` (session; cron už admin) | service role (čítanie `lead_scores` ostáva na pôvodnom klientovi) | žiadne |
| `record_brief_click/open` | `app/api/morning-brief/track/*` (anon, odkazy z e-mailu) | service role | žiadne |
| `expire_arbitrage_matches` | cron `arbitrage-scan` | service role | žiadne |
| `rotate_bri_snapshots` | cron `bri-snapshot` | service role | žiadne |

Autorizácia sa nemení: `profileId` pochádza z overenej session v route (alebo z cronu/webhooku s tajomstvom), RPC len zapisuje.
Mimo rozsahu: `arbitrage-scan` číta `arbitrage_config` anon klientom, takže pri RLS vráti 0 riadkov (existujúci stav, nemenené).
Predpoklad overený: Vercel Production má `SUPABASE_SERVICE_ROLE_KEY` (typ sensitive).
Ostáva pre ďalšiu stenu: `search_path` na funkciách, ktoré sú už zatvorené pre anon/authenticated (`compute_motivation_score`, `detect_broker_weakness`, `increment_api_usage`, `log_event`, `rate_limit_increment`, `recompute_broker_metrics`, `record_kataster_event`, `match_*`, `calculate_broker_metrics`) — treba prejsť ich telá.
