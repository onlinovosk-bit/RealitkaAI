# CURSOR HANDOVER — Revolis.AI, 3. augusta 2026

> **Cursor, prečítaj celý tento súbor pred prvým commitom.**
> Je to kompletné odovzdanie práce z auditu a z dokončenia Inzerát Generátora.
> Obsahuje 14 hotových patchov, poradie ich aplikovania, migrácie, čo zostáva
> a čo je zakázané. Nič v tomto dokumente nedomýšľaj — ak niečo chýba,
> zastav sa a napíš to do PR popisu.

**Cieľová cesta:** `docs/handover/2026-08-03-cursor-handover.md`
**Základ:** `main` @ `c82c860` (`feat(billing): credits panel + top-up link fix #335`)
**Autor podkladov:** Claude (Cowork) · **Rozhoduje:** founder Andrej Ondruš

---

## 0. AKO PRACOVAŤ — neprerokovateľné

Platí `brain/identity/FOUNDER.md`, `COMPANY.md` a `.cursor/rules/*`. Skrátene:

1. **Branch + PR + CI. Nikdy nedeployuj.** Merge do `main` robí človek.
2. **Nikdy nespúšťaj migráciu na prode.** Migračný súbor ide do PR, **neaplikovaný**.
   Aplikuje ho founder pred merge. *(Incident 22.07: kód nasadený pred migráciou
   zhodil widget platiaceho zákazníka.)*
3. **Žiadny prod `DELETE` ani `UPDATE`.** Priprav `SELECT`, výstup do PR, čakaj na človeka.
4. **Žiadne odosielanie e-mailov.** Drafty áno, send nikdy.
5. **Testuj výhradne cez test agency.** Nikdy cez účet Reality Smolko
   (`11111111-1111-1111-1111-111111111111`).
6. **Nový scope = STOP.** Ak úloha vyžaduje produktové rozhodnutie, napíš návrh
   do PR a nekóduj.
7. **Každé opakované zadanie musí mať rozpočet a fázu** podľa
   `.cursor/rules/revolis-loops.mdc` — max pokusov, max čas a **stop pri stagnácii**.
   Prvý beh novej slučky je vždy iba čítanie.
8. **Pred každým commitom musia byť zelené:**
   ```
   node apps/crm/scripts/check-api-contract.mjs --ci
   node apps/crm/scripts/find-dead-exports.mjs --ci
   ```

### ZAKÁZANÉ AKCIE
- Žiadne obnovenie Stealth Recruitera · žiadny portal scraping · žiadna arbitráž live/cron
- Žiadne automatické odosielanie e-mailov prospektom bez ľudského schválenia
- Žiadny prístup k zákazníckym credentials — ani pre smoke testy

---

## 1. ČO SA STALO — kontext v šiestich vetách

Audit z 2. 8. našiel ~28 800 € ročných únikov. Najväčší: kreditový systém bol
kompletný, otestovaný a **mŕtvy** — `spendCredits()` nemal ani jeden call site,
takže každý AI úkon bol zadarmo. Systémová spotreba sa účtovala pod agentúru
platiaceho zákazníka. Valuačný widget počítal odhady a zahadzoval ich.
Stealth Recruiter posielal studené e-maily z produkčnej domény bez opt-out vety.
Inzerát Generátor mal hotové API, prompt aj testy — a maklér sa k nemu nevedel
dostať, lebo neexistovalo UI.

**Štrnásť patchov nižšie to rieši.** Všetky sú hotové, commitnuté a overené.

---

## 2. PATCHE — aplikovanie

Push z prostredia, kde vznikli, nebol možný (read-only token). Preto sú to
patch súbory. **Aplikuj presne v tomto poradí** — patche 09–13 tvoria reťaz,
lebo všetky menia `listing-content/route.ts`.

```powershell
git checkout main
git pull

# --- nezávislé ---
git checkout -b fix/w1-stealth-recruiter-410 main
git am ..\patches\01-fix-w1-stealth-recruiter-410.patch

git checkout -b fix/w1-credits-cron-merge main
git am ..\patches\02-fix-w1-credits-cron-merge.patch

git checkout -b feat/w1-valuation-estimates main
git am ..\patches\03-feat-w1-valuation-estimates.patch

git checkout -b fix/w2-system-usage-agency main
git am ..\patches\04-fix-w2-system-usage-agency.patch

git checkout -b feat/w2-credit-spend-wiring main
git am ..\patches\05-feat-w2-credit-spend-wiring.patch

git checkout -b chore/dead-export-check main
git am ..\patches\06-chore-dead-export-check.patch

git checkout -b chore/api-contract-guard main
git am ..\patches\07-chore-api-contract-guard.patch

git checkout -b chore/revolis-incidents-rule main
git am ..\patches\08-docs-revolis-incidents-rule.patch

# --- REŤAZ: Inzerát Generátor, každý stojí na predchádzajúcom ---
git checkout -b feat/listing-gen-persistence feat/w2-credit-spend-wiring
git am ..\patches\09-feat-listing-gen-persistence.patch

git checkout -b fix/listing-gen-stream-harden feat/listing-gen-persistence
git am ..\patches\10-fix-listing-gen-stream-harden.patch

git checkout -b feat/listing-gen-ui fix/listing-gen-stream-harden
git am ..\patches\11-feat-listing-gen-ui.patch

git checkout -b test/listing-gen-tests-docs feat/listing-gen-ui
git am ..\patches\12-test-listing-gen-tests-docs.patch

git checkout -b feat/listing-gen-variants test/listing-gen-tests-docs
git am ..\patches\13-feat-listing-gen-variants.patch

git checkout -b chore/revolis-loops-rule feat/listing-gen-variants
git am ..\patches\14-docs-revolis-loops-rule.patch
```

Ak `git am` spadne: `git am --abort`, potom
`git apply --3way ..\patches\<subor>.patch` a commitni ručne.

---

## 3. PORADIE MERGE — nie je ľubovoľné

| # | Vetva | Podmienka pred merge |
|---|---|---|
| 1 | `fix/w1-stealth-recruiter-410` | žiadna — **merguj ako prvé**, je to compliance |
| 2 | `fix/w1-credits-cron-merge` | žiadna |
| 6 | `chore/dead-export-check` | žiadna |
| 7 | `chore/api-contract-guard` | **po #6** (workflow volá oba skripty) |
| 8 | `chore/revolis-incidents-rule` | žiadna |
| 3 | `feat/w1-valuation-estimates` | **migrácia** `20260802120000` |
| 4 | `fix/w2-system-usage-agency` | **migrácia** `20260802130000` + diagnostický SELECT |
| 5 | `feat/w2-credit-spend-wiring` | **až po #4** |
| 9 | `feat/listing-gen-persistence` | po #5 + **migrácia** `20260803120000` |
| 10 | `fix/listing-gen-stream-harden` | po #9 |
| 11 | `feat/listing-gen-ui` | po #10 |
| 12 | `test/listing-gen-tests-docs` | po #11 |
| 13 | `feat/listing-gen-variants` | po #12 + **migrácia** `20260803140000` |
| 14 | `chore/revolis-loops-rule` | po #13 (len dokumentácia, dá sa aj skôr) |

> **#5 MUSÍ ísť po #4.** Kým `SYSTEM_USAGE_AGENCY_ID` ukazuje na Smolkovo
> `agency_id`, zapojenie odpočtu kreditov by mu začalo účtovať spotrebu
> vlastného systému Revolisu.

### Migrácie — spúšťa FOUNDER, ručne, PRED merge

```
apps/crm/supabase/migrations/20260802120000_valuation_estimates.sql
apps/crm/supabase/migrations/20260802130000_system_usage_agency.sql
apps/crm/supabase/migrations/20260803120000_ai_generations.sql
apps/crm/supabase/migrations/20260803140000_ai_generations_variants.sql
```

Pred #4 spusti aj **read-only** diagnostiku:
`apps/crm/scripts/system-usage-agency-audit.sql`
Ukáže, koľko riadkov v `usage_metrics` a `ai_action_audit` visí pod Smolkovým
`agency_id`. **Prevod historických riadkov sa zámerne nerobí** — systémové
a zákaznícke sa pod jedným `agency_id` spoľahlivo rozlíšiť nedajú.

---

## 4. ČO JE V KTOROM PATCHI

### 01 · Stealth Recruiter → 410 Gone 🔴 compliance
Vypnuté **tri** povrchy: `/api/stealth-recruiter/outreach`, `/scan`,
`/api/cron/stealth-recruiter-ingest`. Route volala `resend.emails.send()`
a posielala studené e-maily majiteľom nehnuteľností z `noreply@revolis.ai`
**bez opt-out vety**, s `.catch(console.warn)` a „best effort" logovaním.
Z tej istej domény chodia notifikácie platiacim zákazníkom.
Handler vracia 410 **pred** autentifikáciou, volaním OpenAI aj odoslaním.

### 02 · Zlúčený kreditový cron
Vercel Hobby má presnosť plánovania **±59 minút**. `credits-expire` bežal `0 5 1 * *`
a `credits-grant` `0 6 1 * *` — poradie sa mohlo obrátiť a expirácia by zmazala
práve pridelené kredity. Nový `/api/cron/credits-cycle` robí obe fázy v jednom
behu s opätovným načítaním agentúr medzi nimi. `vercel.json`: 15 → 14 úloh.
`guardian-digest` posunutý z `0 7` na `0 9` — rovnaká kolízia s `guardian-run`.

### 03 · `valuation_estimates`
`estimate/route.ts:65` počítal cenové pásmo a **vracal ho bez zápisu do DB**.
Nová tabuľka + RLS + `lib/valuation/persist-estimate.ts` (best-effort, **nikdy
nevyhadzuje**). Route prijíma `agencySlug`, ktorý zod doteraz ticho zahadzoval.
⚠️ Diff na tom súbore je celoplošný — bol to jediný súbor v repe s poškodenými
koncovkami `\r\r\n` (76 riadkov). Normalizované na LF.

### 04 · Oddelenie systémovej spotreby
`SYSTEM_USAGE_AGENCY_ID` mal fallback na `agency_id` Reality Smolko a používa
sa na 15+ miestach. Prepnuté na `33333333-…` (Revolis System, interná agentúra
bez profilov → neviditeľná cez RLS). Plus runtime guard.

### 05 · Zapojenie kreditov + `leadUnlock` 4 → 20
`lib/credits/spend-for-action.ts` — most medzi sadzobníkom a ledgerom,
idempotentný, 402 pri nedostatku. Zapojený v `api/ai/listing-content`.
`leadUnlock` 4 → 20 kreditov (cena bola odvodená od nákladu na AI, nie od
hodnoty leadu; Kamzík platil 300 €/tip).
> **Vynucovanie je predvolene VYPNUTÉ.** `CREDITS_ENFORCEMENT=off` (default)
> len vráti cenu a pustí akciu. Viď rozhodnutie 2A v sekcii 6.

### 06 · Kontrola mŕtvych exportov
`spendCredits()` bol kompletný, otestovaný a **bez jediného call site** —
únik 9 100 €/rok. Skript + baseline s ratchetom: CI zlyhá len pri **novom**
mŕtvom exporte. Druhý commit opravuje falošné pozitíva (funkcie používané
vo vlastnom súbore): **295 → 144** nálezov. Regresný test: `spendCredits`
je v baseline naďalej.

### 07 · Vynútenie zmluvy API routes v CI
`revolis-api.mdc` má sekciu „Povinné importy". Dodržiavalo ju 3–27 % routes.
Z 214 routes chýba validácia v 127, jednotné odpovede v 158, telemetria v 209
a **rate-limit na 42 verejných endpointoch** — vrátane `billing/checkout`,
`billing/redeem-code`, `demo/capture-lead`. Skript + baseline + workflow
`code-contract-guard.yml` (bez secrets, bez `npm ci`).

### 08 · Pravidlo `revolis-incidents`
`.cursor/rules/revolis-incidents.mdc`, `alwaysApply: true`. Desať reálnych
incidentov z tohto repa s cestou k súboru a odvodeným pravidlom (I-01 … I-10).
**Cursor: toto pravidlo si prečítaj ako prvé pri akejkoľvek práci v `apps/crm`.**

### 09 · Perzistencia draftov Inzerát Generátora
`ai_generations` + RLS. Drží `output` (pôvodné AI, **nikdy sa neprepisuje**)
aj `edited_output` (úprava makléra). `GET /generations`, `PATCH /generations/:id`.
POST vracia `generationId`.

### 10 · Zabezpečenie stream route
Bola jediná AI cesta **bez rate limitu, bez kreditov a bez auditu** — stačilo
prepnúť endpoint z POST na `/stream` a model bol zadarmo.

### 11 · Broker UI
`(dashboard)/inzerat-generator` + `components/listing-generator/`.
Formulár, 4 persony, karty portál/FB/IG/e-mail/SEO, počítadlo znakov,
Kopírovať, inline editácia, uloženie úprav, vstup v navigácii.
402 sa zobrazí ako zrozumiteľná hláška o kreditoch, nie ako chyba.

### 12 · Testy a dokumentácia
6 unit testov store, `docs/prompts/inzerat-generator-tab.md` (chýbal),
oprava odkazu na neexistujúci `ListingGeneratorForm`.

### 13 · Štyri štýlové varianty s miešaním po kanáloch
| Variant | Čím sa líši |
|---|---|
| `conversion` | hook, benefit, pravdivá urgencia, silná CTA |
| `facts` | zakázané hodnotiace prídavné mená bez čísla; len overiteľné údaje |
| `story` | prvý odsek **nesmie** začať nehnuteľnosťou |
| `honest` | pomenuje jednu skutočnú nevýhodu a hneď ju zarámuje |

Jedno volanie modelu, 4 varianty. V UI má **každý kanál štyri chipy** — portál
môže byť z „Príbehu", Facebook z „Konverzného". Výber sa ukladá do
`chosen_variants` + `primary_variant`.
**Prompty explicitne zakazujú vymyslené fakty** — pri `honest` je to kritické.
Náklad: 0,064 € za 4 varianty oproti 0,0185 € za jeden. Pri sadzbe 2 kredity
marža **96 %** — sadzbu netreba meniť z nákladových dôvodov.

### 14 · Pravidlá pracovných slučiek
`.cursor/rules/revolis-loops.mdc`, `alwaysApply: true`. Tri pravidlá, ktoré
Revolisu chýbali — zvyšok playbooku už repo pokrýva a nekopíruje sa.

| | |
|---|---|
| **L-01** | Bez rozpočtu sa slučka nespúšťa. Tri limity: max pokusov · max čas · **stop pri stagnácii** (dve kolá bez zmeny). Tretí chýbal vo všetkých doterajších Swarm zadaniach. |
| **L-02** | Prvý beh je vždy **iba čítanie**. Fázy: čítanie → obmedzený zápis → dôveryhodná slučka. |
| **L-03** | Dôkaz musí byť **príkaz s návratovým kódom**, nie zhrnutie. Zoznam použiteľných dôkazov v tomto repe. |

Plus povinná hlavička každého slučkového zadania (SPÚŠŤAČ · ROZSAH · AKCIA ·
DÔKAZ · ROZPOČET · FÁZA · STOP+REPORT). Chýbajúci riadok = zadanie sa nespúšťa.

---

## 5. OVERENIE PO APLIKOVANÍ

```powershell
cd apps\crm
npm ci
npx tsc --noEmit
npm run test -- program-tier-pricing spend-for-action generations-store listing-variants
node scripts\check-api-contract.mjs --ci
node scripts\find-dead-exports.mjs --ci
```

**Čo bolo overené v prostredí, kde patche vznikli:** obe strážne kontroly sú
na vetve `feat/listing-gen-variants` **zelené** — 0 nových porušení zmluvy,
0 nových mŕtvych exportov. Prvý beh ich pridal 7 a boli **opravené, nie
zbaselinované**.

**Čo overené NEBOLO:** `tsc` ani `npm test` — v prostredí neboli `node_modules`.
**Typová kontrola a testy sú na tebe pred merge.**

---

## 6. ROZHODNUTIA FOUNDERA — Cursor ich NESMIE spraviť sám

### 2A · `CREDITS_ENFORCEMENT` → `enforce`? **NIE**
VOP čl. 2 hovorí „AI správy · podľa tarifného plánu · viď Order Form".
**Smolkov Order Form žiadny AI limit neurčuje** a slovo „kredit" sa v MSA, VOP
ani Order Forme nevyskytuje ani raz. Zavedenie kvóty zužuje rozsah licencie
z MSA čl. II → VOP čl. 3 bod 4: *„vyžaduje písomný dodatok, nie len notifikáciu"*.
Bod 3 dáva klientovi **bezsankčné ukončenie do 30 dní**.

> **Úloha pre Cursor (Vlna 2):** prerobiť `CREDITS_ENFORCEMENT` z globálnej env
> premennej na **pole `agencies.credits_enforced boolean default false`**.
> Globálny prepínač zasiahne všetkých naraz, bez per-tenant rollbacku.
> Toto je oprava v mojom vlastnom patchi 05.

### 2B · Zápis do `properties`? **Prepojiť, neprepisovať**
`properties.active_generation_id` → `ai_generations.id`.
`properties.description` **zostáva jediným zdrojom pravdy pre zobrazenie**.
Text sa doň skopíruje len explicitnou akciou „Použiť tento text", nikdy
automaticky. Pred prepisom sa pôvodný popis odloží, aby existovala cesta späť.
*Prepis by zničil rozdiel AI vs. maklér — jediné, čo konkurencia nemá.*

### 2C · Publish CTA? **NIE**
Podmienky TOPREALITY.sk čl. 5.9: *„Používateľ nesmie importovať akékoľvek
inzeráty s využitím exportno-importných softvérových systémov bez
predchádzajúceho písomného súhlasu."*

> **Namiesto toho postav:** tlačidlo **„Kopírovať a otvoriť portál"** (schránka
> + otvorenie formulára portálu v novom tabe) a **„Označiť ako publikované"**
> pre moat signál. Žiadna integrácia, žiadne porušenie podmienok, 80 % hodnoty.

---

## 7. ČO ZOSTÁVA — vlny pre Ruflo Swarm

### VLNA 1 *(2 agenti paralelne, dá sa pustiť hneď po merge)*

**1A · E2E Playwright happy path**
Branch `test/w1a-listing-gen-e2e` · vlastní `apps/crm/tests/e2e/listing-generator.spec.ts`
**DÔKAZ:** `npx playwright test listing-generator` skončí s kódom 0
**ROZPOČET:** max 8 pokusov · max 45 min · **stop pri 2 kolách bez zmeny počtu prechádzajúcich krokov**
**FÁZA:** 2 — obmedzený zápis, len do `tests/`
1. prihlásenie → `/inzerat-generator` sa vykreslí
2. formulár odmietne odoslanie bez povinných polí
3. generovanie → 5 kariet + SEO chipy + **4 variantové chipy na každej karte**
4. prepnutie variantu pri karte „Text na portál" zmení text
5. úprava + uloženie → indikátor „Uložené o HH:MM"
6. **obnovenie stránky → `GET /generations` vráti `edited_output` aj `chosen_variants`**

Krok 6 je najdôležitejší. AI volanie mockni na úrovni siete, **nevolaj reálny
model v CI**. Ak test odhalí chybu, zapíš ju do PR a nechaj opraviť vo Vlne 2.

**1B · Kontrola sandbox / demo cesty**
Branch `fix/w1b-listing-gen-sandbox` · vlastní `lib/capabilities/listing-generator/`
**DÔKAZ:** `SELECT count(*) FROM ai_generations WHERE agency_id = '11111111-…'` po demo behu = 0
**ROZPOČET:** max 4 pokusy · max 30 min · stop pri 2 kolách bez zmeny
**FÁZA:** **1 — IBA ČÍTANIE.** Najprv napíš, čo by si zmenil. Zápis až po schválení.
Over, či fixture/demo cesta nemôže zapísať do `ai_generations` pod reálnu
agentúru. Ak áno, oddeľ ju vzorom `is_sandbox` z valuačného widgetu.
Akceptačné kritérium: SELECT ako dôkaz, výstup do PR.

### VLNA 2 *(po Vlne 1 a po rozhodnutiach foundera)*
- **2A** `agencies.credits_enforced` — migrácia + úprava `spendForAction`
- **2B** `properties.active_generation_id` + akcia „Použiť tento text" + „Vrátiť pôvodný popis"
- **2C** „Kopírovať a otvoriť portál" + „Označiť ako publikované"

**ROZPOČET Vlny 2:** každá úloha max 6 pokusov · max 60 min · stop pri 2 kolách bez zmeny.
Fáza 2 (obmedzený zápis) — 2A a 2B menia schému, takže migrácia ide do PR neaplikovaná.

### VLNA 3 *(1 agent, sám)*
**3A · Uloženie draftu zo streamu.** Stream vracia surový text, nie parsovaný
`ListingContent`, takže draft neukladá. Odporúčam server-side akumuláciu
a uloženie po `[DONE]` — klient môže tab zavrieť.
**DÔKAZ:** `npm run test -- listing-stream-persist` + ručný test prerušenia (kód 0)
**ROZPOČET:** max 6 pokusov · max 45 min · stop pri 2 kolách bez zmeny
**FÁZA:** 1 — iba čítanie pri prvom behu (napíš návrh, ktorú z dvoch ciest a prečo)
Akceptačné kritérium: prerušený stream **nesmie** uložiť neúplný draft.

### VLNA 4 *(2 agenti, read-only, nič neimplementujú)*
**4A · Tenant izolácia:** môže agentúra A cez `PATCH /generations/:id` zmeniť
draft agentúry B? Vracia `GET` len vlastné? Je RLS aktívna aj bez filtra v kóde?
**4B · Peniaze a limity:** dá sa obísť odpočet prepnutím POST ↔ `/stream`?
Je `idempotencyKey` stabilný pre ten istý úkon a rozdielny pre iný?
Minú sa tokeny aj keď zákazník nemá kredity?

**ROZPOČET:** max 5 pokusov · max 40 min · stop pri 2 kolách bez nového nálezu
**FÁZA:** 1 — **iba čítanie**, títo agenti nič neimplementujú
Výstup oboch: `docs/briefs/overnight/2026-08-03-listing-gen-verifikacia.md`.
**Bez nálezov napíš „bez nálezov" — nevymýšľaj.**

---

## 8. ZNÁME DLHY — needit ich potichu

| Dlh | Kde | Poznámka |
|---|---|---|
| 42 verejných routes bez rate-limitu | `api-contract-baseline.json` | vrátane `billing/redeem-code` — pozvánka na hrubú silu |
| 536 porušení zmluvy API routes | baseline | ratchet drží, nezvyšuj |
| 144 mŕtvych exportov | baseline | ratchet drží |
| `lead_consents` kompenzačný delete | `valuation/submit/route.ts:159` | `architecture.mdc` hovorí „v jednej transakcii" — kód to porušuje. Treba RPC. |
| SLA tabuľka si protirečí | zmluvný balík | minúty sú 4–5× prísnejšie než uvedené % |
| Nesprávne IČO ONLINOVO | `brain/identity/COMPANY.md:17` | správne: Štúrova 130/25, 058 01 Poprad, IČO 54166942, IČ DPH SK2121592869 |
| Tri paralelné cenníky | mimo repa | strategické rozhodnutie foundera |

---

## 9. DEFINITION OF DONE pre Inzerát Generátor

- [ ] Maklér prejde celý tok bez pomoci: formulár → generovanie → výber variantu → úprava → uloženie
- [ ] Úprava aj výber variantu prežijú obnovenie stránky
- [ ] Pri nedostatku kreditov je zrozumiteľná hláška, nie chyba 500
- [ ] Cudzia agentúra nevie cez `PATCH` zmeniť cudzí draft
- [ ] Sandbox cesta nezapisuje pod reálnu agentúru
- [ ] E2E test prejde v `nightly-playwright.yml`
- [ ] `npx tsc --noEmit` čisté
- [ ] Obe strážne kontroly zelené
- [ ] Zápis do `brain/decisions` s review dátumom

---

## 10. MEMORY UPDATE — po merge zapísať

**`memory/decisions.md`** (review 30. 9. 2026):
- „Draft AI generovania sa ukladá vždy; `output` sa nikdy neprepisuje,
  `edited_output` drží úpravu makléra. Rozdiel je tréningový signál."
- „Maklér dostáva štyri štýlové varianty a mieša ich po kanáloch.
  `chosen_variants` je moat signál — po stovke inzerátov vieme, ktorý štýl
  vyhráva v ktorom okrese. Konkurencia to nezbiera."
- „`CREDITS_ENFORCEMENT` zostáva `off` pre Reality Smolko — jeho Order Form
  neurčuje AI limit a zavedenie kvóty vyžaduje podpísaný dodatok (VOP čl. 3/4)."

**`brain/lessons/`**:
- „Feature bez UI nie je feature. KF1 mal hotový prompt, API, testy aj kreditovú
  väzbu — a maklér sa k nemu nevedel dostať."
- „Pravidlo bez kontroly je prianie. `revolis-api.mdc` dodržiavalo 3–27 % routes."

**`brain/registry`**: nová capability `listing-generator-ui` s odkazom na
`docs/prompts/inzerat-generator-tab.md`.

---

## 11. ČO SA MUSÍ DORIEŠIŤ MIMO KÓDU

1. **Kreditová doložka do Kamzíkovho Order Formu** — kým nie je podpísaný.
   Po podpise nastane to isté, čo pri Smolkovi. **Toto je jediná úloha
   so zatvárajúcim sa oknom.**
2. **Príloha č. 1 k MSA** — MSA na ňu odkazuje trikrát a definuje ňou rozsah
   licencie. Nikto z nás ju nevidel. Ak v nej AI limit je, rozhodnutie 2A sa mení.
3. **Otázka pre advokáta** — je odmena viazaná na prevod vlastníctva realitným
   sprostredkovaním podľa živnostenského zákona? (týka sa cenníkového modelu I3)
