# SWARM VLNA 4 — lane V4-A..D (číslovanie nekoliduje so STF)

**Cieľová cesta:** `docs/prompts/ruflo-swarm-vlna4-2026-08.md`
**Dátum:** 2026-08-15
**Režim:** vetva + PR + STOP, žiadny merge.
**Pravidlá:** CONSTITUTION, T10, repo=kanál (`docs/reports/YYYY-MM-DD-nazov.md` + push).

Merge robí výhradne founder. Žiadny push do `main`. Žiadne credentials v kóde/logoch/PR.

BASE: `origin/main`. 1 PR = 1 logická zmena.

## Dôkaz neprekrytia

| Lane | Zapisuje výhradne do | Nesmie |
|---|---|---|
| V4-A PR-S0.6 | `apps/crm/src/app/api/acquisition/google/lead-webhook/**`, `apps/crm/src/app/api/acquisition/audit-log/**` + ich testy | `lib/acquisition/sync/` |
| V4-B | `docs/architecture/inbound-oauth-pull-design.md` (+ voliteľne `docs/reports/`) | aplikačný kód, sync/ |
| V4-C | `docs/reports/2026-08-15-migration-history-audit.md` | `db push`, DDL, sync/ |
| V4-D | `docs/reports/2026-08-15-nbs-kraj-rady-v0.2.md` (+ dáta len ak čestne stiahnuté) | estimate-engine, sync/ |
| L13 (3B) | `apps/crm/src/lib/acquisition/sync/campaigns.ts`, `ad-groups.ts` + testy | V4 súbory |
| L14 (3B) | `apps/crm/src/lib/acquisition/sync/keywords.ts`, `search-terms.ts`, `metrics.ts` + testy | V4 súbory |

---

## V4-A — PR-S0.6 webhook plumbing

Exekučný balík `docs/prompts/acquisition-os-stage0-execution.md`, blok PR-S0.6.

- `POST /api/acquisition/google/lead-webhook`: validácia `google_key`; `is_test=true` **LOGUJE a NESPRACÚVA**, nikdy nevytvára reálny lead.
- V Stage 0 webhook **NIKDY** nevytvára reálny lead v CRM.
- Idempotencia `provider_event_id` (UNIQUE agency+provider+event).
- `GET /api/acquisition/audit-log` tenant-scoped (agency z auth profilu, nie z query).
- Testy: `is_test`, zlý kľúč 401, duplicita, cross-tenant.
- Súbory: `api/acquisition/google/lead-webhook/`, `audit-log/`, testy.
- **Nedotýka sa** `lib/acquisition/sync/`.

Vetva: `feat/acquisition-s06-lead-webhook`. STOP po PR.

---

## V4-B — DMARC fix DESIGN

Nadväzuje na `docs/reports/2026-08-17-inbound-zisti.md`.

Navrhni náhradu Gmail auto-forwardu **pull modelom**: zákazník udelí OAuth (read-only, label filter), ingest volá existujúci `POST /api/acquire/email` pipeline.

Výstup: design doc + implementačný plán + text pre zákazníka (vypnúť forward, kliknúť súhlas).

**STOP pred implementáciou — GO dá founder.**

Vetva: `docs/v4-b-dmarc-oauth-pull`.

---

## V4-C — migration-history audit (read-only)

94 súborov vs 46+3 riadkov histórie na prod. Tabuľka: čo je aplikované mimo histórie vs. nikdy nebežalo. Návrh `migration repair` príkazov.

**NIČ nevykonať.** `db push` na prod = zakázaný do vyriešenia.

Vetva: `docs/v4-c-migration-history-audit`.

---

## V4-D — NBS krajské časové rady

Stiahni štvrťročné rady (PO+KE) so zdrojom a atribúciou (`docs/legal/nbs-povolenie-2026-08-10.md`), prepočítaj koeficient realizačná/ponuková vs ŠÚSR `sp3801qr`, report v0.2.

Ak sa nedá spárovať: čestný report, žiadna improvizácia. Nadväzuje na `docs/architecture/kalibracia-krajske-koeficienty-v0.md` (v0 = blocked_unpaired).

Vetva: `docs/v4-d-nbs-kraj-rady`.

---

## Spoločné pravidlá

1. Merge = NIKDY. Push feature vetvy, otvor PR, STOP.
2. Žiadne credentials v kóde/logoch/promptoch.
3. Konflikt / nesplniteľné zadanie → REPORT, nie improvizácia.
4. T10: „zregeneruj a commitni baseline“ pri prázdnom diffe = GUARD_BYPASS.
5. Výstup s hodnotou → `docs/reports/` + push (okrem čistého kódu, ktorý je sám dôkaz).
