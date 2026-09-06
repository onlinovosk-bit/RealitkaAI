# REVOLIS.AI — OVERNIGHT MASTER BRIEF 16
# Verzia: 16.0 | 2026-09-03 → 04 | Ruflo swarm — 5 agentov (A–E), 1 orchestrátor
# ═══════════════════════════════════════════════════════════════
# Brief 15 (Vertical Pack Wave 1) — predchádzajúci
# Tento brief: Dátová pravda + Rýchla odpoveď + Súhlas + Nákladová pravda + Dokumenty
# ═══════════════════════════════════════════════════════════════

## STAV PRED ŠTARTOM (overené v produkcii 2026-09-03, nie odhad)

```
properties            133   (89 máj → +5 jún → +26 júl → +12 aug)  ← PRÍTOK FUNGUJE
  z toho 'Ostatné'     86   (65,2 %) — rozbité mapCategory
  prenájmy ako 'Predaj' 53
leads                 504   z toho Smolko 448
  status 'Nový'       448   ← ANI JEDEN lead sa nikdy nepohol
  auto_response_sent_at ≠ NULL:  0
credit_ledger           6   ← všetkých 6 sú monthly_grant / grant_expiry (cron)
                              ŽIADNY riadok spotreby. Ani jeden.
GA4                     0   NEXT_PUBLIC_GA_MEASUREMENT_ID nebolo nastavené
cookie banner          —    komponent existuje, 0 importov v repe
```

## GLOBÁLNE PRAVIDLÁ

```
NIKDY nemergi do main — len PR. Merguje founder.
NIKDY force push.
NIKDY db push / DDL do produkcie. Migrácie len ako SÚBOR v repe, neaplikované.
NIKDY auto-send navonok (email, SMS). Drafty áno, send nikdy.
NIKDY prístup k zákazníckym credentials.
Done = ARTEFAKT (commit + vetva + zelené CI). Text nie je done (AP-009).
PRI DOUBT → zastav, zapíš do .ai/bus/outbox/, pokračuj ďalšou úlohou.
```

---

## ⛔ FÁZA 0 — WRITE-PROBE (blokujúca, sekvenčná)

Bez tohto stráca swarm celú noc (AP-009 — agent vráti text namiesto commitu).

1. JEDEN agent: vetva `test/write-probe-b16`, pridaj riadok do `docs/audit/write-probe.md`,
   commit, push na origin.
2. Over z hlavného procesu: `git ls-remote --heads origin | grep write-probe-b16`
3. Vetva + commit existujú → pokračuj na vlny. Neexistujú → **ZASTAV a hlás.**
   Je to chyba Ruflo configu (write_file + git tooly), nie dôvod na ďalší prompt.

**Nemergovať.** Je to len dôkaz zápisu.

---

## ZÁVISLOSTNÝ GRAF

```
FÁZA 0 (sekvenčná, blokujúca)
    │
    └──► VLNA A │ VLNA B │ VLNA C │ VLNA D │ VLNA E   (5 agentov PARALELNE)
```

Vlny A–E sa **nekrížia ani jedným súborom**. Overené proti main @ `64a1b57`.
Každá vlna = vlastná vetva = vlastný PR.

| Vlna | Vetva | Exkluzívny scope |
|------|-------|------------------|
| A | `docs/b16-growth-foundation` | `docs/architecture/**` |
| B | `fix/b16-realvia-honest-mapping` | `apps/crm/src/lib/realvia/**` |
| C | `feat/b16-rychla-odpoved` | `apps/crm/src/app/api/valuation/submit/**`, `apps/crm/src/app/api/leads/inbound/**` |
| D | `fix/b16-cookie-consent-gating` | `apps/crm/src/components/analytics/**`, `apps/crm/src/app/(marketing)/layout.tsx`, `apps/crm/src/app/(public)/legal/sub-processors/**` |
| E | `chore/b16-ai-cost-truth` | `apps/crm/src/lib/ai/**`, `apps/crm/src/lib/rescore-lead.ts`, `apps/crm/src/lib/outreach-store.ts`, `docs/audit/**` |

**Kolízna kontrola pred štartom:** agent si pred prvým commitom vypíše
`git diff --name-only origin/main...HEAD` a overí, že každý súbor patrí do jeho
scope. Súbor mimo scope → revert a hlás.

---

## AGENT-A — Dokumenty a definície (žiadny kód)

**Vetva:** `docs/b16-growth-foundation`
**PR:** `docs: ADR growth intelligence principles + parked concepts + metrics v0`

### A1 — ADR princípov
Vlož `docs/architecture/adr-2026-09-03-growth-intelligence-principles.md`
z podkladu od foundera. **Obsah nemeň ani o slovo.**

### A2 — Parked concepts
Prepíš `docs/architecture/l99-parked-concepts.md` kompletným novým obsahom
z podkladu. Pôvodných 6 konceptov a obe koncové sekcie musia zostať nedotknuté.

### A3 — Definície metrík (NOVÝ SÚBOR — hlavná práca tejto vlny)
Vytvor `docs/architecture/growth-metrics-definitions-v0.md`.

Toto je jediná časť „Growth Intelligence System", ktorá sa dá postaviť dnes,
lebo nepotrebuje žiadne dáta. A rieši reálny problém: **Revolis nemá definíciu
kvalifikovaného leadu.** Preto má všetkých 448 leadov status `Nový` — nie je
podľa čoho triediť.

Pre každý pojem uveď: **Názov · Biznis význam · Výpočet · Zdroj dát · Závislosti ·
Obmedzenia · Vlastník.**

Pojmy, ktoré musia byť definované:

```
Visitor              Engaged Visitor        High Intent Visitor
Lead                 Qualified Lead         Warm Lead
Sales Opportunity    Lead Conversion Rate   Traffic Quality
```

**Povinné vstupy pre A3 (čítaj, nehádaj):**
- `apps/crm/src/lib/valuation/analytics.ts` — 6 eventov, ktoré vieme merať dnes
- `apps/crm/src/lib/ai/lead-triage-batch.ts` a `lib/rescore-lead.ts` — ako sa dnes počíta skóre
- produkčný stav: `leads.status` má jedinú hodnotu `Nový`, `leads.score` má 4 rôzne
  hodnoty v rozsahu 0–70 bez pravidla za nimi

**Povinná sekcia na konci A3:** *„Návrh stavového modelu leadu"* — aké statusy majú
existovať, aký prechod ich spúšťa a ktorý z nich znamená **kvalifikovaný**.
Návrh, nie implementácia. Kód sa v tejto vlne nemení.

**ZAKÁZANÉ v A3:** vymýšľať prahy, ktoré nemajú oporu v dátach. Ak sa hranica nedá
odvodiť, napíš `NEZNÁME — treba N pozorovaní` a pokračuj (AP-001, AP-005).

---

## AGENT-B — Realvia: čestné neznáme mapovanie (P0)

**Vetva:** `fix/b16-realvia-honest-mapping`
**PR:** `fix(realvia): honest unknown mapping for category and transaction`
**Súbor:** `apps/crm/src/lib/realvia/processQueue.ts`

### Problém
`mapCategory` má tabuľku pre kódy 11–20. Realvia reálne posiela
`9,11,12,13,14,20,27,28,30,34,35,37,41,46,47,48,57,60,61,65`.
Výsledok: **86 zo 132 nehnuteľností (65,2 %) spadne na `'Ostatné'`.**
`mapTransaction` mapuje kódy 122/123/127 všetky na `'Predaj'` — pritom
**53 z nich je prenájom** (44 to má priamo v názve inzerátu).

### Čo urob
1. Neznámy kód → **explicitné neznáme**, nie `'Ostatné'` a nie `'Predaj'`.
   Zvoľ hodnotu, ktorá sa vizuálne odlišuje od legitímnej kategórie a zapíš ju do PR.
2. Kódy **13 a 14** presuň z `'Dom'` medzi neznáme — dnes sú to prenajímané byty.
3. Loguj neznámy kód (kód + `property.id`), nech vieme doplniť číselník.
4. **NEHÁDAJ z názvu inzerátu.** Odvodzovať typ z textu je AP-005.
5. **Žiadny backfill.** Existujúcich 133 riadkov sa nedotýkaj.

### Akceptačné kritériá
- [ ] Unit test: každý z 20 reálne prijatých kódov → očakávaný výstup
- [ ] Test: neznámy kód nikdy nevráti `'Ostatné'` ani `'Predaj'`
- [ ] Žiadna zmena mimo `lib/realvia/**`
- [ ] `pnpm test` + `pnpm build` zelené

---

## AGENT-C — Vrstva 1: rýchla odpoveď

**Vetva:** `feat/b16-rychla-odpoved`
**PR:** `feat(leads): wire inbound auto-response into valuation and inbound routes`

### Kľúčový fakt — nepíš nový kód
`lib/acquire/inbound-lead-auto-response.ts` a `send-inbound-auto-response.ts`
sú **hotové, otestované a migrácia `20260713150000_inbound_auto_response.sql`
je aplikovaná v produkcii**. Volá ich jediná cesta — `/api/acquire/email`.
Preto `auto_response_sent_at ≠ NULL` = **0 z 504**.

Úloha je zapojiť ich, nie napísať.

### T1 — `app/api/valuation/submit/route.ts`
Route volá `runInboundLeadTriageAndNotify`, ale `runInboundLeadAutoResponse` nie.
Smolko má z tejto cesty **7 reálnych leadov** (posledný 27.7.), ktorým nikto neodpísal.
Pridaj `void runInboundLeadAutoResponse(supabase, inserted, { agencyId, name, email })`
hneď za triage. **Len pre `tenant.isSandbox === false`** — sandbox vetva sa vracia skôr
a nesmie odísť žiadny e-mail. Napíš na to test.

### T2 — `app/api/leads/inbound/route.ts`
Nevolá ani triage, ani auto-response. Pridaj obe po úspešnom inserte.
`.select()` už vracia `id` aj `agency_id` — nemeň ho.
Prázdny e-mail: `runInboundLeadAutoResponse` sa sám ukončí (`if (!leadEmail) return`).
Nepridávaj vlastnú vetvu. Existujúci tvrdý guard `input.consent === true` neoslabuj.

### GDPR (neprerokovateľné)
- Auto-odpoveď je plnenie na žiadosť dotknutej osoby → smie odísť aj bez `marketing_opt_in`.
- **Preto šablóna nesmie obsahovať marketingový obsah.** Pridaj test so zoznamom
  zakázaných reťazcov.
- Ďalšie správy (nurture) sú mimo tohto PR a vyžadujú `marketing_opt_in = true`.
- Reply-To nikdy `noreply@`. `resolveInboundFromEmail` to už vynucuje — neobchádzaj.
- Dedup: `auto_response_sent_at` je zámok, neresetuj ho.

### ZAKÁZANÉ
- **Žiadny backfill** starých 504 leadov. Auto-odpoveď na dopyt spred troch mesiacov
  poškodí zákazníkovi meno.
- SMS. `sendSms` je stub, `TWILIO_*` nie sú nastavené. V0 je iba e-mail.
- Realvia webhook (vytvára properties, nie leads).

### Akceptačné kritériá
- [ ] valuation non-sandbox odošle, sandbox neodošle
- [ ] inbound odošle pri vyplnenom e-maile, pri prázdnom nepadne
- [ ] druhé odoslanie toho istého leadu neodošle druhý e-mail
- [ ] `auto_response_enabled = false` vypne odosielanie
- [ ] chýbajúci `RESEND_API_KEY` nezhodí request (ide do `autoErrorCapture`)
- [ ] v testoch je `sendInboundAutoResponse` mockovaný — **žiadny e-mail neodíde**

### Pozn. pre foundera (nie pre agenta)
Všetkých 6 agentúr má `agencies.email` a `agencies.phone` = NULL. Fallback ide na
owner profil, kde `phone` je prázdny. Prod UPDATE robí founder, nie agent.

---

## AGENT-D — Cookie consent gating

**Vetva:** `fix/b16-cookie-consent-gating`
**PR:** `fix(analytics): gate Google Analytics behind cookie consent`

### Problém
`components/legal/cookie-consent-banner.tsx` má **0 importov v celom repe**.
`"revolis-cookie-consent"` má **0 poslucháčov**. `GoogleAnalytics.tsx` sa renderuje
bez podmienky. Text bannera pritom sľubuje: *„Voliteľné analytické cookies zapíname
iba s vaším súhlasom."*

`NEXT_PUBLIC_GA_MEASUREMENT_ID` sa práve nastavuje. **Tento PR musí byť v main skôr,
než sa tá premenná aktivuje.**

### T1 — `components/analytics/GoogleAnalytics.tsx`
Prerob na klientský komponent, ktorý:
- pri mount číta `localStorage["revolis_cookie_consent_v1"]`
  (tvar `{ mode: "all" | "necessary", timestamp }`)
- renderuje `<Script>` iba pri `mode === "all"`
- počúva `window.addEventListener("revolis-cookie-consent", …)` a pri
  `detail.mode === "all"` sa prekreslí — súhlas musí platiť **bez reloadu**
- odregistruje listener v cleanup
- ponechá `if (!GA_ID) return null;`

**SSR:** prvý render vráť `null`, rozhodnutie až v `useEffect`, inak hydration mismatch.
Každé čítanie `localStorage` v `try/catch`.

### T2 — `app/(marketing)/layout.tsx`
Pridaj `<CookieConsentBanner />` vedľa `<GoogleAnalytics />`.
Widget odhadu `/odhad/[agencySlug]` je pod `(marketing)` — banner tam musí byť tiež.

### T3 — `app/(public)/legal/sub-processors/page.tsx`
Záznam Google Analytics má `purpose: "Anonymizovaná analytika webu"`. Nie je to pravda:
`lib/valuation/analytics.ts` posiela `session_id` do GA4 a `lib/valuation/lead-mapper.ts`
ho zapisuje do `note` leadu (`sid=…`) — existuje spoločný kľúč medzi GA4 a CRM.
Zmeň `purpose` na:
`"Analytika webu vrátane identifikátora relácie na priradenie dopytu"`.
Nič iné v tom súbore nemeň.

### NEROB
- `lib/analytics/gtag.ts` — už má guard na `window.gtag`, stačí to
- Google Consent Mode v2 — mimo rozsahu
- GA do `(dashboard)`, `(public)`, `onboarding` layoutov
- obsah ani dizajn bannera

### Akceptačné kritériá
- [ ] bez súhlasu: banner viditeľný, v HTML **nie je** `gtag/js`
- [ ] „Len nevyhnutné" → `gtag/js` sa nenačíta
- [ ] „Súhlasím so všetkými" → `gtag/js` sa načíta **bez reloadu**
- [ ] po reloade si prehliadač súhlas pamätá
- [ ] zablokované `localStorage` → banner sa zobrazí, appka nepadne
- [ ] žiadny hydration warning

---

## AGENT-E — Nákladová pravda (predpoklad Model Routingu)

**Vetva:** `chore/b16-ai-cost-truth`
**PR:** `chore(ai): audit AI cost telemetry — where costEur goes and why nothing lands`

### Prečo toto a nie router
Founder chce Model Routing + Cost Governor. Predpoklad routera je meranie.
Produkčný stav:

```
credit_ledger    6 riadkov — VŠETKÝCH 6 je monthly_grant / grant_expiry (cron)
                 ŽIADNY riadok spotreby
usage_metrics_daily   5 riadkov
ai_jobs               0
ai_recommendations    0
```

Smolko dostal 60 kreditov v auguste. Všetkých 60 expirovalo **nevyužitých** 1.9.

Pritom `estimateClaudeCostEur` / `estimateOpenAiCostEur` volá **6 miest v kóde**
(`lib/ai/listing-content.ts`, `lib/ai/dashboard-insights.ts`, `lib/rescore-lead.ts`,
`lib/outreach-store.ts`, `app/api/ai/call-coach/stream/route.ts`,
`app/api/ghostwriter/generate/route.ts`). Počítajú `costEur` a nikde sa neobjaví riadok.

**Router, ktorý optimalizuje nulu, je zbytočný. Táto vlna zisťuje, kde sa meranie stráca.**

### Krok 1 — AUDIT (hlavný výstup)
Napíš `docs/audit/2026-09-04-ai-cost-telemetry.md`:

| Volajúce miesto | Počíta costEur? | Kam sa zapisuje? | Zapíše sa naozaj? | Dôkaz |
|---|---|---|---|---|

Pre každé zo 6 miest vystopuj celú cestu `costEur` → cieľ. Pri každom urči jedno z:
```
NIKDY SA NEVOLÁ        — funkcia nemá volajúceho v produkčnej ceste
VOLÁ SA, NEZAPISUJE    — hodnota sa vypočíta a zahodí
ZAPISUJE, ZLÁ TABUĽKA  — ide inam, než kde ju hľadáme
ZAPISUJE SPRÁVNE       — potom je príčinou nulové používanie, nie kód
```

### Krok 2 — OPRAV NAJVIAC JEDNU VEC
Ak audit nájde jednoznačné miesto, kde sa `costEur` počíta a ticho zahadzuje
(AP-010 — success napriek tichému zlyhaniu side-effectu), zapoj ho.
**Maximálne jedno miesto.** Ak sú nejednoznačné, neopravuj nič a napíš to do PR.

### ZAKÁZANÉ
- **Nestavaj router.** Žiadny model selection, žiadna eskalácia, žiadny Cost Governor.
- Nemeň sadzby v `lib/ai/llm-usage-cost.ts` — ceny modelov overuje founder u dodávateľa.
- Žiadne DDL do produkcie. Ak treba tabuľku, priprav migračný **súbor**, neaplikuj ho.
- Nedotýkaj sa `credit_ledger` dát.

### Akceptačné kritériá
- [ ] Audit pokrýva všetkých 6 volajúcich miest, každé s verdiktom a dôkazom
- [ ] Odpoveď na otázku: *prečo je v `credit_ledger` nula riadkov spotreby*
- [ ] Najviac jedna oprava kódu, s testom
- [ ] Žiadna zmena mimo scope vlny E

---

## ORCHESTRÁTOR

1. Spusti Fázu 0. Zlyhá → **STOP celej noci**, hlás, nespúšťaj vlny.
2. Spusti A–E paralelne, každý vlastná vetva.
3. Pred prvým commitom každej vlny over kolízny scope (viď tabuľka vyššie).
4. Vlna zlyhá → ostatné pokračujú. Jedna vlna nesmie zastaviť ostatné.
5. Ráno napíš `.ai/bus/outbox/MSG-20260904-090-orch-b16-result.md`.
   **Chýbajúci ranný report = incident.**

### Formát ranného reportu

```
VLNA │ VETVA │ PR │ CI │ SÚBORY MIMO SCOPE │ STAV
```
`STAV` je jedno z: `ARTEFAKT` (commit + vetva + zelené CI) · `NEDOKONČENÉ` · `ZASTAVENÉ`.
Pri všetkom okrem `ARTEFAKT` uveď dôvod. **Žiadne „hotovo" bez git dôkazu (AP-009).**

Na koniec pripoj kontrolný dotaz do produkcie a jeho výsledok:

```sql
select
  (select count(*) from leads where auto_response_sent_at is not null) as odpovedane_leady,
  (select count(*) from properties where type = 'Ostatné') as ostatne_nehnutelnosti;
```

Obe čísla sú dnes 0 a 86. Po merge vĺn B a C sa musia pohnúť — **kým sa nepohnú,
práca nie je hotová, nech PR hovorí čokoľvek** (ADR princíp P7).

---

## ČO SA V TEJTO NOCI NESTAVIA (výslovne)

```
Growth Intelligence System   — sémantická vrstva, anomaly agent, opportunity agent
Model Routing / Cost Governor — výber modelu, eskalácia, cost per successful task
Sprievodca / chatbot          — čaká na vlnu B (dnes by filtroval rozbité dáta)
vyhľadávacie API nad properties
backfill čohokoľvek
```

Dôvod pre prvé dva je zapísaný v `docs/architecture/l99-parked-concepts.md`
(P-GI, P-MR) aj s podmienkami, kedy sa odparkujú. Vlny A3 a E sú ich prvé
skutočne staviteľné časti — definície a meranie. Systémy prídu, keď budú dáta.
