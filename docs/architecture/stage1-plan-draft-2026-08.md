# Stage 1 plan draft — First Real RK, lead loop

**Status:** DRAFT ONLY. Nie je to štart Stage 1. Žiadny kód, migrácia, credential ani merge.
**Dátum:** 2026-08-15
**Lane:** N2 L26 (docs-only)
**Základ:** `origin/main` @ `b4e947580` (obsahuje `d6b9e351` / #416)
**Kill deadline Stage 0 (stále platí):** 2026-08-31 — Stage 1 sa nespúšťa, ak Stage 0 pred týmto dátumom regresuje.

Zdroje (citovať, neprepisovať blueprint):

- `docs/architecture/acquisition-os-stage0-PASS-report.md` — Stage 0 PASS 15.8.2026; Stage 1 sa nespúšťa
- `docs/architecture/acquisition-os-v2.2-final-locked.md` § Stage 1 (Week 3–6)
- `docs/architecture/acquisition-os-stage0-zisti-report.md` — `UNIQUE(agency_id, id)` na `leads` neexistuje
- `docs/architecture/revolis-constitution-v2.md` — 12-otázkový check
- `docs/prompts/acquisition-os-stage0-execution.md` — Basic access až pred Stage 1
- `docs/runbooks/day1-2-google-ads-credentials.md` — Test access ≠ Basic access
- `docs/reports/2026-08-15-webhook-smoke.md` + PASS: po smoku `vercel env rm GOOGLE_ADS_WEBHOOK_KEY production`

---

## 1. Cieľ (čo overujeme)

Jeden reálny RK účet, malý rozpočet, **lead loop** — nie Ads Manager, nie ROI engine.

Blueprint DoD (locked): lead z Google Ads Lead Form sa objaví v CRM do **60 s** a maklér dostane notifikáciu. Revolis má **management access**, billing ostáva RK.

Mechanizmus (Ústava Q2–Q3): skrátiť Lead → Telefón. Stage 1 **neuzatvára** mandate/conversion slučku — to je Stage 2 (Data Manager API).

---

## 2. Ústava (stručne, draft nie BUILD)

| # | Verdikt |
|---|---|
| 1 Zaplatil by klient? | VALIDATE — prvý RK môže, nie je to predajná featura sama o sebe |
| 2 / 3 Lead→Provízia | Áno na prvom kroku (lead v CRM). Nie na mandate. |
| 4–6 Moat / dáta | Prvý reálny `gclid` + lead-form payload. Slabé, kým nie je Stage 2 outcome. |
| 8 Timing | Stage 0 PASS je podmienka, nie automatický GO. **Príliš skoro = BACKLOG**, ak chýba Basic access / RK / budget. |
| 9 MVP < 2 týždne | Áno, ak scope ostane webhook → lead (+ notifikácia). Nie, ak sa ťahá persistencia + conversions. |
| 10 Pasce | Feature / sunk-cost: neriešiť Stage 2 v Stage 1. Perfection: nečakať na všetky `acquisition_*` tabuľky. |

**Skóre draftu: 8–9 VALIDATE.** Founder GO po odpovediach v §12. Tento dokument **neodomyká** implementáciu.

---

## 3. Scope vs non-scope

### V scope (návrh, po GO)

1. **1 reálna RK**, management access, malý serving budget (číslo v §9 — founder).
2. Developer token: žiadosť o **Basic access** (timing + materiály v §4).
3. Google Lead Form webhook → **skutočný CRM lead** (Stage 0 `lead_id` ostáva NULL / `LOGGED_TEST` — to sa tu mení až po GO).
4. `google_key` už **nie z query-string** — len header / body (§5).
5. **Nový** Production webhook kľúč. Smoke kľúč z 15.8. sa **nesmie znovu použiť** (§6).
6. Tenant: reálna RK ≠ Demo `b101361c-e250-4c43-b099-52c4febeb450`. Cross-tenant ostáva 403 / no data.
7. Lead status minimálne: `NEW` (ďalšie stavy CONTACTED / QUALIFIED len ak neblokujú DoD).
8. Dôkaz DoD: čas lead→CRM ≤ 60 s + notifikácia + screenshot / log (bez secrets).

### Mimo scope (explicitne)

- Stage 1 **implementácia** v tomto PR. Tento súbor je plán.
- Conversion upload / Data Manager API / mandate feedback (Stage 2).
- Persistencia ad groups / keywords / search terms / metrics → **L27** (§7).
- HTTP/cron produktový sync job (Stage 0 otvorené #3) — nie podmienka lead loopu.
- Mutácie kampaní / budget AI / autopilot / Meta / Microsoft / LLM v webhook ceste.
- Návrat **starého** `GOOGLE_ADS_WEBHOOK_KEY` do Production (PASS: „toto NIE je“).
- KMS / nový vault. Stage 0 ekvivalent (Vercel env + `credential_ref`) ostáva, kým founder nerozhodne inak.
- Zmena blueprintu v2.2.

---

## 4. Basic access — kedy a s čím

Stage 0 bežal na **Test account access**. Test MCC neservuje, nemá billing, **nepodporuje conversion uploads** a nestačí na reálny účet (blueprint rozhodnutie #9).

**Kedy:** podať žiadosť **pred** prvým Stage 1 implementačným PR. Google review trvá dni až týždne. Bez Basic access sa reálny účet nepripája.

**Odkiaľ:** API Center **produkčného ROOT MCC** (nie Test MCC). Runbook: ak API Center nevidíš, si v client účte.

**Materiály (founder, mimo repa — žiadne tokeny sem):**

| Pole | Návrh textu (skontrolovať pred odoslaním) |
|---|---|
| Company | ONLINOVO s.r.o. |
| Website | https://revolis.ai |
| Use of API | Read + lead-form ingest do vlastného CRM pre RK, ktoré Revolis poverili správou Google Ads. Stage 1 = 1 účet, malý budget. Žiadny Ads Manager pre tretie strany ako produkt. |
| Účty / QPS | 1 client účet teraz; nízke QPS (webhook + občasný read-only search). Škála 10+ je Stage 4. |
| Kontakt | firemný e-mail MCC vlastníka, nie osobný chat |

Token ostáva **1 per Revolis**. Po schválení: Production env pre `GOOGLE_ADS_*` (dnes sú credentials Preview-only — PASS otvorené #2). SA invite na **reálny** účet / MCC; Stage 0 Test MCC ostáva guard (`7024414113`).

---

## 5. `google_key`: query-string → header / body

Dnes handler berie kľúč v poradí **query → body → `x-google-key`**. Query-string končí v access logoch, Referer, Vercel/CDN.

**Stage 1 pravidlo (návrh):** akceptovať len `x-google-key` a/alebo `google_key` v tele. Query-string → **401**. Testy musia pokryť: query-only fail; header OK; body OK; zlá hodnota 401.

Google Lead Form webhook nie je kryptografický podpis — je to advertiser-configured kľúč (blueprint §7.1). Transport nesmie kľúč znovu vystaviť v URL.

---

## 6. Nový webhook kľúč (15.8. — smoke kľúč sa NIKDY nerecykluje)

15.8. production smoke: `is_test=true` → 200 `LOGGED_TEST`, `lead_id=null`. Potom `vercel env rm GOOGLE_ADS_WEBHOOK_KEY production`.

Dôvod nereuse: kľúč bol v Production, Preview vetve a smoke behoch. Recyklácia = ten istý secret v novom serving kontexte.

**Stage 1:** vygenerovať **nový** kľúč až po founder GO; vložiť len do cieľového env; starý neobnovovať. Hodnota **nie je** v tomto dokumente ani v chate.

---

## 7. Persistencia → L27 (follow-on)

PASS otvorené #1: v CRM nie sú tabuľky ad groups / keywords / search terms / metrics. Workery sú overené live + testami, nie persistenciou.

**L26 toto nerieši.** Persistencia tých entít je follow-on **L27**. Stage 1 lead loop závisí od `acquisition_accounts` / `_campaigns` / `_events` + `leads`, nie od keyword tabuliek.

---

## 8. `UNIQUE(agency_id, id)` na `leads` (odložené zo Stage 0 ZISTI)

ZISTI: `leads.id` je **text** PK; `UNIQUE(agency_id, id)` **neexistuje**. Blueprint Stage 1+ chce `FOREIGN KEY (agency_id, lead_id) REFERENCES leads(agency_id, id)`. Founder vtedy: **nemeniť `leads` v Stage 0** — odložené (ZISTI písal Stage 2 / conversions).

**Návrh v tomto drafte:** additive unique (alebo partial unique kde `agency_id IS NOT NULL`) **pred** akýmkoľvek composite FK. Samotný insert leadu v Stage 1 vie ísť cez existujúce `leads.id text`. Composite FK nie je nutný na DoD „lead v CRM“.

Rozhodnutie founderovi (§12): landnúť unique v prvom Stage 1 schema PR, alebo držať defer do Stage 2 `acquisition_conversions`?

---

## 9. Budget

Draft strop — **nie schválené číslo:**

- Jeden účet, jedna (max dve) Lead Form kampaň, **PAUSED → ENABLE** až po webhook smoke na novom kľúči.
- Strop: **≤ 150 € / 14 dní** alebo skôr, ak dojde kill (§10). Founder môže znížiť.
- Billing = RK. Revolis nemení ownership.
- Žiadne AI budget mutácie.

---

## 10. Kill kritérium (ako Stage 0)

Stage 0: ak kompletný PASS checklist s dôkazmi neprejde do 14 pracovných dní od PR-S0.1, stop a revízia tempa (nie blueprintu). Kalendárny strop Stage 0: **31.8.2026**.

**Návrh Stage 1:**

1. Žiadny implementačný PR pred founder GO na §12.
2. Ak do **14 pracovných dní** od prvého Stage 1 kódového PR nie je dôkaz DoD (lead v CRM ≤ 60 s + notifikácia), **STOP** — revízia tempa, nie v2.2.
3. Ak Basic access nie je schválený do dátumu, ktorý founder zapíše do GO, Stage 1 sa nespúšťa (neobchádzať Test MCC serving).
4. Ak spend dosiahne strop a v CRM je 0 reálnych leadov → STOP spend, kampaň PAUSED.
5. Perfgate: ak `/acquisition` T1/T2 znovu ~2 min (stav pred #416), STOP serving review — layout regresia nie je Stage 1 feature.

---

## 11. Riziká

| Riziko | Prečo je reálne | Mitigácia v pláne |
|---|---|---|
| Basic access delay / reject | Test token nestačí na reálny účet | Žiadosť pred kódom; bez schválenia no-GO |
| Recycle smoke kľúča | 15.8. kľúč žil v Production | Nový kľúč; starý sa nevracia |
| `google_key` v URL | Dnešný handler preferuje query | Stage 1: query → 401 |
| Preview-only `GOOGLE_ADS_*` | PASS #2 | Production env až po GO + nový webhook kľúč |
| Chýbajúce tabuľky sync entít | PASS #1 | L27, nie L26 |
| Unique na `leads` | ZISTI C1 | Rozhodnutie pred composite FK |
| Demo vs reálna RK | Seed/test MCC guard | Nový `acquisition_accounts` riadok; Demo ostáva test |
| Scope creep (SIS, SMS, conversions) | Blueprint Stage 1 má aj SIS + push/SMS | DoD = lead + notifikácia; SIS/SMS orezať ak blokujú 14 dní |
| Reálne peniaze | Prvý serving | Strop + kill #4 |
| Webhook allowlist | 15.8. proxy najprv blokoval handler | Overiť, že Production cesta stále končí v handleri (dôkaz, nie nový redesign) |

---

## 12. Otvorené otázky pre foundera (GO brána)

Bez odpovedí sa Stage 1 **nekóduje**.

1. **Ktorá RK** je „first real“? Má management access (nie ownership) potvrdený písomne?
2. **Aký strop spend** (EUR a dátum)? Je 150 € / 14 dní OK, alebo nižší?
3. **Kedy podať Basic access** — hneď, alebo až po výbere RK? Kto podá formulár v API Center ROOT MCC?
4. **Notifikácia DoD:** in-app stačí, alebo musí byť SMS/push v prvom PR?
5. **Seller Intent Heuristic v1** v Stage 1, alebo odložiť ak ohrozí 60 s DoD?
6. **`UNIQUE(agency_id, id)` na `leads`:** Stage 1 schema PR, alebo stále Stage 2?
7. **L27 persistencia** pred lead loopom, alebo paralelne / až po prvom leade?
8. **Kalendárny kill** Stage 1 (návrh: 14 pracovných dní od prvého kódového PR). Aký dátum zapísať?
9. **Production `GOOGLE_ADS_*`:** GO na nové env hodnoty (bez návratu smoke webhook kľúča)?
10. Potvrdzuješ, že toto je **VALIDATE / plán**, nie štart — a že Stage 0 kill **31.8.2026** ostáva nadradený, kým Stage 0 drží PASS?

---

*Koniec draftu. Ďalší krok po GO: samostatný implementačný brief (1 PR = 1 logická zmena), nie tento súbor.*
