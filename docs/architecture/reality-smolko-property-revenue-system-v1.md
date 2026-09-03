# Reality Smolko — property / revenue system v1

**Status:** data overlay 2026-09-03 (founder GO, docs-only).  
**Parent Claude artifact** `1080c99d-37d0-4830-901c-df0001576e3e` — fetch 404; tento súbor je repo zdroj pravdy pre dátové limity.  
**Nie je to audit kódu.** Čísla nižšie sú `SELECT` na `ypgajkhqtbriqqmyawyv` 3. 9. 2026.

Roadmap: `docs/briefs/reality-smolko-production-roadmap-2026-09-03.md`.  
Type mapping: `docs/reports/2026-09-03-smolko-type-mapping-integration.md`.

---

## Prod snapshot (riadky, nie súbory)

| Objekt | Stav |
|---|---|
| `properties` | 133 (132 Reality Smolko) |
| `portal_listings` | **0** |
| `property_price_trail` | **0** |
| `valuation_estimates` | 5 |
| `scheduled_events` | **tabuľka neexistuje** (`to_regclass` = null) |

Smolko `11111111-1111-1111-1111-111111111111`:

| Pole | N |
|---|---|
| `status = Aktívna` | 128 |
| `status = Stiahnutá` | 4 |
| `status = Predaná` | **0** |
| `type = Ostatné` | **86 (65 %)** |
| `type = Byt` / `Dom` | 30 / 16 |
| `transaction_type = Predaj` | **132** (prenájom **0**) |
| `price` null alebo 0 | 41 |
| `usable_area = 0` | 50 |
| `created_at` | 2026-05-25 → 2026-08-28 UTC = dátum **synchronizácie**, nie inzerovania |

---

## Fáza 2 V0 — cena pri preberaní

Krivka „ako dlho sa predáva pri akej cene“ sa z týchto dát **nedá** spočítať a **mesiace sa nedá**. Chýbajú predaje (`Predaná` = 0) aj skutočný dátum vyvesenia.

**V0 = výhradne manuálny / licencovaný vstup porovnaní** (`PricingEvidenceInput`). Vlastný inventory na to nestačí: prázdny price-trail, nula predajov, 65 % bez použiteľného `type`.

**Čo použiť smie:** 128 aktívnych ponúk ako argument pre majiteľa — *toto sú naše vlastné ponuky za takúto cenu, stále nepredané.* Label **len** „v našej ponuke minimálne X dní“. Nikdy presný počet dní z `created_at`.

**P0 pred porovnateľnými:** opraviť mapovanie `type` (adapter, nie prázdny payload) — mimo tento PR.

**Prenájmy:** v CRM nula. Otvorené: robí Smolko prenájmy, alebo sa nesynchronizujú? Concierge „nájom / kúpa“ bez odpovede nestavať.

---

## 6.2 Čo sa má znovu použiť

Neznovu stavať price-trail.

| Artefakt | Úloha |
|---|---|
| `apps/crm/src/lib/price-trail/engine.ts` | body, motivácia, sync z `portal_listings` |
| `apps/crm/src/lib/price-trail/negotiation-script.ts` | text pre oslovenie |
| `apps/crm/src/components/price-trail/PriceChart.tsx` | graf |
| `apps/crm/src/components/price-trail/PriceTrailPanel.tsx` | panel |
| `apps/crm/src/components/price-trail/MotivationBadge.tsx` | badge |
| `portal_listings` | cache portálových inzerátov |
| `property_price_trail` | história ceny |

Sú postavené na **inú konverzáciu**: osloviť motivovaného predajcu s dlho visiacim inzerátom — **nie** stanovenie ceny pri preberaní.

**Tabuľky sú prázdne (0 riadkov).** V0 z nich nečerpá. Engine v kóde existuje; dáta nie.

---

## Zakázané

Vymyslená doba predaja. Presné dni z `created_at`. „Máme price-trail“ bez počtu riadkov. Tretia kópia grafu/engine.
