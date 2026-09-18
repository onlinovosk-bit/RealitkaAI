# Reality Smolko — production roadmap 2026-09-03

**Režim:** docs overlay (founder GO). Kód/migrácia = iný PR + GO.  
Parent artifact 404 — fázy 1/3/4 tu nie sú vymyslené; keď sa obnovia, **každá** musí mať riadok tabuliek.

Pravidlo: `memory/decisions.md` — audit kódu ≠ audit dát.

---

## Prod (3. 9. 2026, `ypgajkhqtbriqqmyawyv`)

| Tabuľka | Prod |
|---|---|
| `properties` | 133 (132 Smolko) |
| `portal_listings` | 0 |
| `property_price_trail` | 0 |
| `valuation_estimates` | 5 |
| `scheduled_events` | **neexistuje** |
| `supabase_migrations.schema_migrations` | **48** riadkov |
| `apps/crm/supabase/migrations/*.sql` | **109** súborov |

Rozdiel ~60 neaplikovaných súborov. **Nesmie sa aplikovať naslepo.** Najprv prečítať SQL, overiť závislosti (tabuľky, typy, funkcie) voči prod, až potom Dashboard. Ak závisí od neaplikovaného — founder rozhodnutie.

---

## Fáza 2 — cenová evidencia (V0)

| | |
|---|---|
| Predpokladané tabuľky a stav v produkcii | `portal_listings` **0 riadkov** (tabuľka je). `property_price_trail` **0 riadkov** (tabuľka je). `properties` 132 Smolko, **0× Predaná**. |
| V0 | Len `PricingEvidenceInput` (manuál / licencia). Vlastné dáta krivku nedajú. |
| Použiť | 128 aktívnych ponúk ako „v ponuke minimálne X dní“, nie presné dni. |
| Blokuje porovnateľné | `type = Ostatné` 86/132. Fix adaptera = iný PR. |
| Prenájom | Stĺpec `transaction_type` = 0× Prenájom — **nespoľahlivé**. Realvia kód **123** (53 ks) ≈ prenájom podľa titulov. Mapper P0. |

**Nie V0 (backlog):** denný snapshot ceny + stavu každej ponuky do **existujúcej** `property_price_trail`. Bez zberu dnes nebude krivka o pol roka.

---

## Fáza 5 — booking / obhliadky

| | |
|---|---|
| Predpokladané tabuľky a stav v produkcii | `scheduled_events` **nie je**. Súbor `20260527143000_event_scheduler_phase1.sql` v repe. |
| Blokujúci predpoklad | Aplikovať tú migráciu v Dashboard **pred** kódom bookingu. Nie `db push`. |
| Závislosti súboru (overené SELECT 3. 9.) | `agencies`, `profiles`, `leads.id` text, `properties.id` text, `profile_agencies_for_auth()` **existujú**. Stále: prečítať súbor pred apply. |

---

## Ďalšie fázy (chýba parent text)

Kým nie je originálny artifact v repe: žiadny BUILD. Pri doplnení fázy povinný riadok **predpokladané tabuľky a ich stav v produkcii** (count alebo „tabuľka nie je“).
