# RUFLO SWARM — VLNA 3 (+ predpripravená 3B)

**Cieľová cesta:** `docs/prompts/ruflo-swarm-vlna3-2026-08-12.md`
**Dátum:** 12.08.2026
**Režim:** vetva + PR + STOP. **ŽIADNY MERGE, ŽIADNY PUSH DO MAIN, ŽIADNE
CREDENTIALS.** Merge robí výhradne founder.

---

## VSTUPNÁ BRÁNA — over, kým čokoľvek spustíš

Vlna 3 stavia na Vlne 2. Každý lane si PRED štartom overí na origin/main:

```
git fetch origin
git log --oneline origin/main -15
```

| Podmienka | Blokuje |
|---|---|
| L5 (migrácia `acquisition_core`) zmergovaná | L9 |
| L7 (`google-ads-client.ts`) zmergovaný | L9 |
| L2 (`data/susr-sp3801qr.json`) zmergovaná | L10 |

**Ak podmienka nesedí → lane sa NESPÚŠŤA a zapíše to founderovi.**
L11 a L12 nemajú podmienky — môžu bežať vždy.

## Dôkaz neprekrytia — Vlna 3

| Lane | Zapisuje výhradne do | Migrácia | Závislosť medzi lane |
|---|---|---|---|
| **L9** S0.2 credentials | `apps/crm/src/lib/acquisition/credentials.ts` (NOVÝ) · `apps/crm/src/app/api/acquisition/**` (NOVÝ adresár) · `.env.example` | nie | žiadna |
| **L10** krajské koeficienty | `docs/architecture/kalibracia-krajske-koeficienty-v0.md` (NOVÝ) · `data/krajske-koeficienty-v0.json` (NOVÝ) | nie | žiadna |
| **L11** decisions dedup audit | `docs/architecture/decisions-dedup-audit.md` (NOVÝ) | nie — READ-ONLY | žiadna |
| **L12** A3 golden regres | `apps/crm/src/lib/ai/__tests__/listing-golden.test.ts` (NOVÝ) | nie | žiadna |

Žiadne dva lane nezdieľajú súbor ani adresár. L9 je jediný, čo píše
aplikačný kód v `acquisition/` — a Vlna 2 tam už nič otvorené nemá.

---

## LANE 9 — PR-S0.2: credential vrstva + connect/accounts `feat/acquisition-s02-credentials`

Podľa exekučného balíka (blok PR-S0.2) + ZISTI report (#381: secrets = Vercel env).

**Env kontrakt — týmto PR sa STÁVA ZÁVÄZNÝM, zapíš ho do .env.example:**
```
GOOGLE_ADS_DEVELOPER_TOKEN=        # z API Center ROOT MCC
GOOGLE_ADS_LOGIN_CUSTOMER_ID=      # customer ID TEST MCC (bez pomlčiek)
GOOGLE_ADS_SA_KEY_JSON=            # obsah service account JSON ako string
GOOGLE_ADS_RATE_LIMIT_PER_TENANT=10
```

Úlohy:
1. `credentials.ts`: načítanie a validácia env, chýbajúca hodnota →
   explicitná chyba pri štarte modulu, NIE tichý undefined. Kľúč sa NIKDY
   neloguje — test na to.
2. `POST /api/acquisition/google/connect`: zapíše `acquisition_accounts`
   riadok (agency_id z auth kontextu, NIKDY z payloadu — test na to),
   status PENDING. Žiadne živé Google volanie.
3. `GET /api/acquisition/google/accounts`: tenant-scoped výpis.
4. Testy s mockmi: cross-tenant (A nevidí B účty) · customer_id z payloadu
   sa ignoruje · credential sa neobjaví v žiadnej response ani logu.

NEROB: žiadne živé volanie Google API, žiadna zmena migrácie z L5,
žiadna npm závislosť. Reálne hodnoty env NEEXISTUJÚ v repe — iba .env.example
s prázdnymi hodnotami.

## LANE 10 — Krajské koeficienty v0 (dáta + report, NIE zapojenie)

Teraz máme legálne obe strany rovnice: NBS krajské PONUKOVÉ rady
(povolené 10.8., atribúcia) a ŠÚ SR sp3801qr krajské REALIZAČNÉ indexy
(povolené 10.8., citácia — `data/susr-sp3801qr.json` z L2).

1. Vypočítaj pre Prešovský a Košický kraj časový rad pomeru
   realizačná/ponuková (spoločné štvrťroky, posledných 8–12 kvartálov).
2. Výstup `data/krajske-koeficienty-v0.json`: koeficient per kraj +
   interval + meta (zdroje, obdobie, licencie → docs/legal/).
3. Report `docs/architecture/kalibracia-krajske-koeficienty-v0.md`:
   metodika, graf-tabuľka radov, porovnanie s národným Eurostat koeficientom,
   odporúčanie či je rozdiel medzi krajmi materiálny (>3 p. b.).
4. **NEZAPÁJAJ do estimate-engine** — to je A1-C, sekvenčne s founderom.
   Ak dátové rady nemajú spoločné obdobie alebo sa nedajú spárovať,
   výstupom je report o tom — nie improvizovaný koeficient.

## LANE 11 — Decisions dedup audit (read-only)

V repe existujú `memory/decisions.md` (zdroj pravdy, práve opravený)
a `brain/decisions/decisions.md` (duplikát) + generované indexy.
Do `docs/architecture/decisions-dedup-audit.md` zisti a zapíš:
1. Kto číta `brain/decisions/` (git grep — kód, CI, brain:ingest?)
2. Sú obsahovo zhodné? Odkedy sa rozišli (git log oboch)?
3. Návrh: ktorý má byť zdroj a ktorý generovaný pohľad, aké zmeny by to
   vyžadovalo v brain:ingest, odhad veľkosti (XS/S/M).
NIČ NEVYKONAJ — rozhodne founder. Toto je prevencia triedy „dva zdroje
pravdy" (viď E2, brain indexy, dvojitý blueprint).

## LANE 12 — A3 golden regres test

4 schválené texty (Sabinov + Teriakovce + Ľubotice + Modrá n. C.
z `docs/sales/`) premeň na trvalé regresné fixtures pre listing generátor:
1. Fixtures: vstupné dáta inzerátov (extrahuj z PRED sekcií) + očakávané
   vlastnosti výstupu (NIE doslovný text — vlastnosti: dĺžka 220–320 slov,
   zákaz slov „krásny/útulný/jedinečný/exkluzívne" bez čísla, prítomnosť
   kontaktu makléra 1:1, žiadny fakt mimo vstupu — kontrola proti zoznamu
   povolených faktov z fixture).
2. Test beží BEZ LLM volania, ak repo nemá test-mode pre generátor —
   v takom prípade otestuj aspoň validátor vlastností na uložených K3
   výstupoch a napíš, čo by test-mode vyžadoval.
3. Žiadna zmena produkčného promptu ani ListingContent typu.

---

## VLNA 3B — predpripravená, spúšťa ju founder PO MERGI L9

*(zapísané tu, aby ďalšie kolo nečakalo na moju odpoveď)*

| Lane | Zadanie | Súbory |
|---|---|---|
| **L13** PR-S0.4 | sync workers: campaigns + ad groups (exekučný balík), mock-first, idempotencia test | `lib/acquisition/sync/campaigns.ts`, `ad-groups.ts` + testy |
| **L14** PR-S0.5 | sync: keywords + search terms + metrics | `lib/acquisition/sync/keywords.ts`, `search-terms.ts`, `metrics.ts` + testy |

L13 ‖ L14 sú disjunktné navzájom (rôzne súbory), obe závisia na L9+L7+L5
v maine. Živý smoke test proti Test MCC až keď founder vloží env hodnoty
do Vercelu — PR sa mergujú aj bez neho, s mockmi.

---

## Spoločné pravidlá (nemenné)

1. Merge = NIKDY. Push len feature vetvy, otvor PR, STOP.
2. Žiadne credentials v kóde/logoch/promptoch — ani placeholder s reálnym tvarom.
3. Konflikt / nesplniteľné zadanie → REPORT, nie improvizácia.
4. T10: „zregeneruj a commitni baseline" pri prázdnom diffe zdrojov = GUARD_BYPASS.
5. Vstupná brána hore je povinná — lane bez splnenej podmienky sa nespúšťa.

## Checklist pre foundera po Vlne 3

1. Review + merge **L9** → hneď potom môžeš odpáliť **Vlnu 3B** (L13+L14)
2. Prečítaj **L10 report** → rozhodnutie: sú krajské koeficienty materiálne?
   (ak áno, A1-C dostane reálny základ; ak nie, ušetrili sme komplexitu)
3. Prečítaj **L11 audit** → jedno rozhodnutie o zdroji pravdy decisions
4. Review + merge **L12** (testy — nízke riziko)
5. Paralelne s tým tvoje credentials: test MCC (anonymné okno / druhý Gmail)
   → C5 pridanie service accountu → env hodnoty do Vercelu podľa
   .env.example z L9 → až potom živý smoke
