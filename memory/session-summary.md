## Session 2026-09-29 (príjem leadov: pätička, zdroj podľa odosielateľa, diagnostika)

### Dokončené
- **#728 INBOUND-NOTALEAD-01** — `NOT_A_LEAD` log nesie presný dôvod + technické príznaky
  bez osobných údajov (`apps/crm/src/lib/acquire/email-adapter.ts`).
- **#731 revert #370** — produkcia sa nenasadila ~1 h, 4 deploymenty ERROR, main sa nedal
  sparsovať. Overené cez `pg_proc`, že migrácia z #370 sa do PROD nikdy nedostala.
- **#732 pätička „odhlásiť"** — o odhlásení rozhoduje predmet, nie výskyt slova kdekoľvek
  v tele. Nový `unsubscribe-footer.test.ts` padá 4 zo 6 na starom parseri.
- **#739 SOURCE-FROM** — `SOURCE_RULES` má dva nezávislé signály (text + doména
  odosielateľa), varovanie `source_from_sender`, `PARSER_VERSION` 1.3 → 1.4.
  Gmail pull hlavičku `From` mal a zahadzoval ju; teraz ju posiela.
- **PROD kontrola 08:42** — lead o 07:37 vznikol cez e-mailovú bránu (ale `web_form`,
  nie portál). Štyri maily 07:59–08:40 zahodené ako `unknown_source` /`not_inquiry`,
  všetky s `has_sender: true` a `source_detected_by: none`.

### Rozpracované / Pending
- **#743 DIAG-2 je otvorený a zelený** (7/7 checkov) — `sender_domain` v logu namiesto
  `has_sender`, nevytvorený AI návrh na `warn`. Čaká na merge foundera.
- **Lead z 07:37 nedostal AI návrh** — nula aktivít, dôvod neznámy. Odpoveď príde až
  z logov po nasadení #743.
- **`to_unmatched` na všetkých štyroch mailoch** — adresa nie je v `inbound_mailboxes`
  (GO MAILBOX, read-only analýza).
- **Kontrakt Cloudflare Workera mimo repozitára** — určuje agentúru aj makléra, nič ho
  nekontroluje.
- **#370 (atomické kreditové RPC)** čaká na čerstvú, otestovanú implementáciu.
- **`gdpr-advisor` skill neexistuje**, hoci ho CLAUDE.md direktíva 5 vyžaduje. GDPR rozbor
  pre `sender_domain` spravený ručne v popise #743.

### Kľúčové súbory zmenené
- `apps/crm/src/lib/acquire/email-adapter.ts`: `isUnsubscribe` podľa predmetu; `SOURCE_RULES`
  ako tabuľka s `text` + `domain`; `senderDomainOf`; `sender_domain` v diagnostike.
- `apps/crm/src/app/api/acquire/email/route.ts`: posiela `subject` aj `from` do parsera;
  `NOT_A_LEAD` log nesie dôvod a príznaky.
- `apps/crm/src/lib/inbound/gmail-pull.ts`: hlavička `From` ide do payloadu.
- `apps/crm/src/lib/inbound/reply-draft.ts`: nevytvorený návrh na `warn`, vytvorený na `log`.
- Nové testy: `not-lead-reason.test.ts`, `unsubscribe-footer.test.ts`, `source-detection.test.ts`,
  rozšírený `reply-draft.test.ts`.

### Ďalší krok
Zmergovať #743 a z prvých logov po nasadení zistiť, ktorá doména dnes chodí (patrí do
`SOURCE_RULES`, alebo je to bežná pošta?) a prečo lead nedostáva AI návrh.
## Session 2026-09-29 (CHECKOUT-ENV-01 — krok A)
### Dokončené
- **Korekcia stavu:** krok A NIE JE nezačatý — prebehol 2026-09-22 → **0/9**
  (`docs/reports/2026-09-22-stripe-verify-prices.md`). Blokér príjmu je **krok C**.
  `memory/open-tasks.md` opravený.
- `scripts/ops/stripe-expected-prices.json`: 10 cien (pribudol `STARTER_PACK` 47 €, predáva sa na `/balik`, v pôvodných 9 chýbal).
- `scripts/ops/stripe_verify_prices.py`: stránkovanie, `expand product`, kontrola typu/intervalu/per_unit/livemode/EUR, „blízko" dôvody pri MISSING, odmietne test kľúč, `--spec` pre krok C bez kľúča, env patch iba z jednoznačných zhôd.
- Kľúč už nejde do argv (pôvodne `curl -u` → viditeľný v `ps`).
- `apps/crm/tests/verification/stripe-expected-prices.verification.test.ts`: 10 testov, manifest ↔ kód + offline fixtures vrátane reálneho snapshotu z 22. 9. Mutation proof 7× červená → zelená.
### Rozpracované / Pending
- **Krok C (founder):** vytvoriť ceny podľa `bash scripts/ops/stripe-verify-prices.sh --spec`, minimum 3 seat ceny; potom VERIFY → B → D.
- 22. 9. report uvádza, že agent čítal `sk_live_` z lokálneho `.vercel/.env.production.local` — founder zváži rotáciu a restricted key.
- Marketing `/api/starter-pack/checkout` nevaliduje formát price ID (`isValidStripePriceId`) — drobnosť, neopravené.
- Typecheck ratchet: strop 54 → 51 (ubudli 3), nezmenené.
### Kľúčové súbory zmenené
- scripts/ops/stripe-verify-prices.sh: tenký wrapper nad Pythonom
- scripts/ops/stripe_verify_prices.py: nový VERIFY
- scripts/ops/stripe-expected-prices.json: nový manifest
- apps/crm/tests/verification/stripe-expected-prices.verification.test.ts: nový drift + behavior test
- docs/ops/2026-09-21-stripe-verify-kit.md: stav + použitie
- memory/open-tasks.md, memory/decisions.md
### Ďalší krok
Founder: krok C v Stripe live mode (`--spec`), potom spustiť VERIFY a poslať výstup.
## Session 2026-09-29 (UPTM-011 … UPTM-017 — uptm-runner)
## Session 2026-09-29 (DEMAND-D1)
### Dokončené
- Demand Contract v1 + verifikátor + redakcia + extrakcia (Haiku) + `lead_demands` + napojenie na `acquire/email` za flagom: `apps/crm/src/lib/demand/*`, `supabase/migrations/20260929120000_lead_demands.sql`
- Backfill experiment (read-only) + labeling + scoring: `apps/crm/scripts/demand-backfill-experiment.ts`, `lib/demand/backfill-score.ts`
- Oprava maskovania SK mobilov v `lib/ai/sanitize.ts`; koniec vymýšľania „Byt"/„Hypotéka" v `acquire/email`
### Rozpracované / Pending
- Spustiť backfill experiment (founder/Vercel s `ANTHROPIC_API_KEY`) → ručné označenie → `score`
- Oznámenie Smolkovi (Anthropic subprocesor) pred zapnutím flagu; migrácia na PROD; flag
- PR #745 (audit) — nemergovať, oddelené nálezy/rozhodnutia/scope
### Kľúčové súbory zmenené
- `apps/crm/src/lib/demand/`: nový modul Demand Contract v1
- `apps/crm/src/lib/ai/sanitize.ts`: 10-ciferné SK mobily
- `apps/crm/src/app/api/acquire/email/route.ts`: bez vymyslených polí, plánuje extrakciu
- `docs/architecture/demand-contract-v1.md`: spec, GO brány, KPI SQL
- Kolo 2: gold-dataset gate, D4 vstupný kontrakt, plán opravy 42/59 leadov, privacy audit + opravy (#750), Truth Matrix (#745)
### Ďalší krok
Founder spustí `extract` na vzorke 60 leadov a vyplní gold dataset → `score` → PASS/FAIL rozhodne o flagu. Paralelne: merge #750 (P0 privacy).


## Session 2026-09-29
### Dokončené
- CREDITS-RELAND krok 1: `20260804230000_atomic_credit_mutations.sql` aplikovaná na PROD pred kódom, s históriou pod verziou súboru (63 → 64 riadkov). RPC 0 z 3 → 3 z 3.
- Do migrácie doplnený grants blok, ktorý #370 nemal: `ALTER DEFAULT PRIVILEGES` dáva EXECUTE každej novej funkcii aj `anon` a `authenticated`, takže tri SECURITY DEFINER funkcie na pripisovanie kreditov by boli volateľné anon kľúčom z prehliadača. Teraz service_role only (overené `has_function_privilege`).
- Overené, že telá funkcií na PROD sú bajt na bajt zhodné s repo súborom (md5(prosrc) = md5 tiel v migrácii).
- Funkčná sonda na jednorazovej agentúre: purchase / replay / grant / expire / spend / invalid_amount / agency_not_found, invariant platí, upratané v tom istom volaní.
- CREDITS-RELAND krok 2: kód napísaný na aktuálne súbory (nie prehratý z 1cfb6a3, ktorý je sám poškodený). Zachovaná poistka v expiry, ktorú by #370 bol zahodil.
- PR #741 (draft) otvorený, vetva reštartovaná z main po merge #733.
- #733 (revert #370) medzitým mergnutý — produkcia odmrazená, main = a1eba9d.
### Rozpracované / Pending
- #741 čaká na review foundera (peniaze — nemergujem sám).
- `spend_credits` má stále `anon=X | authenticated=X` — prihlásený používateľ vie minúť kredity cudzej agentúry. Nahlásené, neopravené.
- Founder: Stripe KYB + 14 chýbajúcich price ID + rozhodnutie mesačne-plus-kredity; Calendly webhook podľa runbooku.
### Kľúčové súbory zmenené
- apps/crm/supabase/migrations/20260804230000_atomic_credit_mutations.sql: obnovená z 1cfb6a3 + grants blok (service_role only)
- apps/crm/src/lib/credits/mutate-credits.ts: nová, tri RPC wrappery
- apps/crm/src/lib/credits-billing.ts: applyTopupPurchase cez RPC, kompenzačné mazanie ledgeru už netreba
- apps/crm/src/lib/credits/grant-engine.ts: grant aj expiry cez RPC, poistky expiry zachované
- apps/crm/src/lib/starter-pack/redemption.ts: zápis kreditov cez RPC, claim-first poradie nedotknuté
- 4 test súbory: 43/43 zelených
### Ďalší krok
Počkať na merge #741; potom `GO SCHEMA-GAP-RATCHET` — CI test, ktorý padne, keď aplikačný kód volá tabuľku, ktorú nevytvára žiadna migrácia (19 takých dnes ako allowlist).

## Session 2026-09-28/29 (PR-BACKLOG-TRIAGE, TENANT-FAILOPEN-SWEEP, škoda po #370)

### Dokončené
- **PR-BACKLOG-TRIAGE** (#730) — `docs/reports/2026-09-28-pr-backlog-triage.md`.
  Každý otvorený PR meraný dvakrát: či je opravovaný vzor **dnes** na `main`,
  a či sa vetva dá zmergovať (`git merge-tree --write-tree`). Z dvanástich
  platí päť, sedem je prekonaných.
- **TENANT-FAILOPEN-SWEEP** (#730) — vzor
  `if (caller?.agency_id && row.agency_id !== caller.agency_id)` sa pri
  `agency_id = null` skratuje a bránu preskočí. Nie je teoretický:
  `api/invite/route.ts` profily bez agentúry reálne vyrába. Prepísaných
  **12 z 13 miest v 9 súboroch** na `sameAgency()` v **existujúcom**
  `src/lib/tenant-scope.ts`. 21 nových testov, všetky mutačne overené.
- **Brána odbehnutá na vetvách #447, #462, #490** proti aktuálnemu `main`
  (nie proti ich starej báze). Všetky tri: gate PASS, konflikt iba
  v `memory/session-summary.md`. #490 navyše zhasol práve ten test, ktorý
  bol naň napísaný — výnimka v allowliste po ňom prestáva platiť.

### Tri opravy vlastných chýb
1. **Triáž overila zlučiteľnosť stromov, nie či vetva kompiluje.** #370 som
   odporučil na merge; jeho vlastný kód mal tri parsing errors. Keby som na
   `refs/pr/370` pustil lint, vyšli by pred mergom, nie po ňom. Dopísané do
   dokumentu aj s príkazom pre zvyšné PR.
2. **Napísal som, že „safety je v RPC", bez toho, aby som sa do RPC pozrel.**
   Nebola tam. Zmerané na Postgres 16: stará `expire_grant_credits` vrátila
   `{"ok":true,"expired":100}` a vynulovala zostatok, ktorý bol grantom za
   aktuálny mesiac.
3. **Prvé meranie mergovateľnosti bolo nesprávne.** `git diff origin/main <head>`
   tvrdil, že osem PR zmaže 136–841 súborov. `git diff` porovnáva stromy, merge
   berie zmeny od spoločného predka. Skutočný merge: štyri čisté s nulou
   zmazaných, jediný kódový konflikt v #444.

### Čo sa stalo s #370
Founder ho zmergoval; merge bol rozpolený — stará a nová verzia štyroch súborov
zostali v strome vedľa seba bez konfliktných markerov. Tri neparsovali;
`credits-billing.ts` parsoval a padal až za behu (`ReferenceError: supabase is
not defined`) uprostred Stripe top-up webhooku, teda **po** pripísaní kreditov.
Opravil som to, ale iná session #370 medzitým celá revertla (#731). Revert bol
správnejší: moja oprava bola rekonštrukcia zámeru z dvoch prekrytých verzií,
revert vracia stav, ktorý raz preukázateľne fungoval. Vyňal som svoju opravu
a konflikt vyriešil v prospech `main`.

### Nález, ktorý prežíva revert #370
Ak sa #370 bude robiť znova, RPC `expire_grant_credits` **musí** odmietnuť
expiráciu, keď je v ledgeri grant za aktuálny period — inak retry po zlyhanej
expirácii zmaže práve udelený mesačný grant. Text migrácie s guardom aj štyri
odbehnuté scenáre sú v histórii vetvy `claude/epic-mendel-oal1wt`, commit
`6b049cf5`.

### Rozpracované / Pending
- **#490 → #447 → #462** čakajú na merge; brána na všetkých troch overená.
  #490 potrebuje úpravu allowlistu v sweep teste (v tomto PR).
- **#486 sa dá zavrieť** — pokryté sweepom, jeho vlastné testy prevzaté doslova.
- **Zavrieť ako prekonané:** #371, #444, #459, #439, #475.
- **`CHECKOUT-ENV-01`** — bez `STRIPE_PRICE_*_SEAT` v produkcii sa nedá zaplatiť.
  Founderov krok, skript pripravený od #622.
- **90 stashov na jednom disku bez zálohy** — dry-run výpis zo
  `stash-to-branches.ps1` stále neprišiel. Jediná položka, kde hrozí
  nenávratná strata.

### Kľúčové súbory zmenené
- `apps/crm/src/lib/tenant-scope.ts`: `sameAgency()` — fail-closed zhoda tenantov
- 9 route súborov v `apps/crm/src/app/api/`: brány prepísané na `sameAgency()`
- `apps/crm/tests/verification/tenant-failopen-sweep.verification.test.ts`:
  vzor mimo celého `src/app/api`, výnimka viazaná na existenciu migrácie
- `docs/reports/2026-09-28-pr-backlog-triage.md`: triáž + dva dodatky

### Ďalší krok
Founder merguje #490 → #447 → #462 v tomto poradí; potom zavrieť #486, #371,
#444, #459, #439, #475. Paralelne `CHECKOUT-ENV-01` — bez neho je tržba nula
bez ohľadu na zvyšok.

## Session 2026-09-28 (RLS-NULL-ESCAPES aplikované na PROD)

### Dokončené
- **`20260928070000_rls_null_escapes.sql` APLIKOVANÁ NA PROD** pod founder GO.
  Politík s `agency_id IS NULL` na 10 tabuľkách **14 → 0**, politík celkovo 19 → 15
  (štyri `properties_*_agency` zrušené, `properties_tenant` zostala sama).
  Dáta nedotknuté: `ai_action_audit` 226, `properties` 133, nepriradených riadkov 0.
- **Sonda z pohľadu prihláseného používateľa** (`set local role authenticated` +
  reálny `auth.uid()`, celé v `rollback`): nepriradený riadok nasadený service rolou
  je **neviditeľný (0/0/0)**, vlastný insert `agency_id = NULL` → **42501 ×3**,
  insert vlastnej agentúry → **OK**. Čítanie zúžené na tenanta: **64 z 226** audit
  riadkov, **132 z 133** nehnuteľností. Po `rollback` na PROD nezostalo nič
  (overené: 0 testovacích riadkov, 0 temp funkcií, počty 226/133).
- **História pod verziou súboru**: `20260928070000 :: rls_null_escapes`, 62 → 63 riadkov.
  Nezaznamenaných migrácií z AP-024 už len **64** — pôvodne som napísal 63, čo bolo odvodené, nie zmerané: `20260928070000` je nový súbor, ktorý v tých 65 nikdy nebol, takže odpočítať sa dá len `20260827214500`. Premerané nástrojom `reconcile-migration-history.mjs --mode diff`: 121 súborov, 63 riadkov histórie, **64 nezaznamenaných**, 6 duchov.
- **CI na `0cc7cc2` celé zelené** (7/7), vrátane prvého behu `null-escape-rls.test.ts`
  proti reálnemu Supabase stacku a prehratia migrácie na čistej PG 15.
- **Zachytené ticho namiesto červenej**: na heade `03945da` nebežal ani jeden
  `pull_request` workflow, pretože PR bol v konflikte (main sa posunul o #721, #723)
  a GitHub nevie postaviť merge ref. Bez toho merge by migrácia aj test ostali
  neotestované a tvrdil by som opak. Konflikt vyriešený zachovaním oboch strán
  (`170 0` a `155 0` v `--numstat`).

### Rozpracované / Pending
- **`bri_history` NIE JE uzavretá**: `"Enterprise BRI access"` a `"Locked BRI read-only"`
  sú pre rolu `public` bez tenant filtra — ktokoľvek s `account_tier='enterprise'`,
  resp. `tier_locked_at IS NOT NULL`, číta celú tabuľku. Samostatný nález.
- **`GO RLS-ANON-GUARD-TEST`** — statický ratchet proti novým `true`/`IS NULL` politikám.
- **27 tabuliek s RLS a nula politikami** — dnes bez následku (service role).
- **`authenticated` drží na `leads` aj TRUNCATE/REFERENCES/TRIGGER**.
- **`lead_scores_agency`** — nedobehnuté zrušenie, žiadna neskoršia migrácia ju netvorí.
- **404-PATH-01 po hydratácii NEOVERENÉ**; **Calendly webhook** (founder, 5 min);
  **pôvod 6 riadkov v `revolis_zaujemcovia`** (GDPR); cenník + Stripe KYB (founder).
- **PR #720 nie je zmergovaný** — merge je rozhodnutie foundera.

### Kľúčové súbory zmenené
- `docs/reports/2026-09-27-migration-history-reconcile.md`: vsuvka „VYRIEŠENÉ 2026-09-28"
  pri náleze 2 + odškrtnutý druhý ďalší krok.
- `memory/decisions.md`, `memory/session-summary.md`: prepend.

### Ďalší krok
`GO RLS-BRI-HISTORY` — zavrieť dve `public` politiky na `bri_history` bez tenant filtra.
## Session 2026-09-28 (TEST-SPLIT-01, SETUP-NODE-REORDER — a tri opravy vlastných tvrdení)

### Dokončené
- **CI-FASTPATH-01 zmergovaný** (#713, `ddf2ac46`) a **zmeraný trikrát v praxi**:
  411 / 415 / 306 s proti 536 s plnému behu. Päť krokov `skipped`,
  `Note the fastpath` success — teda dôkaz, že klasifikátor vrátil `false`
  na reálnom `pull_request` evente, nie len že beh bol kratší.
- **Wrap-up 2026-09-27 zmergovaný** (#718, `055a9cc3`), vrátane vyriešeného
  konfliktu s #717 tak, že **oba záznamy zostali** (`79 0`, nula zmazaných).
- **TEST-SPLIT-01 nasadený** (#723): `supabase start` ide na pozadie a prekrýva
  sa s prácou, ktorá databázu nepotrebuje. Logika v
  `scripts/ci/wait-for-supabase.sh` so **7 testami**, nie inline v YAML.
- **SETUP-NODE-REORDER** (#723, zmergované ako `dfa805db`): `setup-node` a
  `npm ci` presunuté PRED štart Supabase. Dve merania ukázali, že si s docker
  pullom idú po tom istom hrdle; tretie to potvrdilo tým, že presun kontenciu
  odstránil — `setup-node` **49 → 6 s**, štart Supabase **184 → 110 s**,
  čakanie **38 → 6 s**. **Čisté −63 s.**
  **Behy 4 a 5 to vyvrátili.** −37 s a potom −5 až +17 s (podľa voľby
  baseline). Štart Supabase kolísal **110 → 136 → 178 s** a prekryvné okno
  82–116 s ho nezakryje. Beh 5 mal navyše najpomalší štart a **najčistejší**
  `Lint` (36 s), čo je priamy protipríklad k môjmu vlastnému vysvetleniu
  „kontencia sa presunula na CPU kroky".
  **Preukázané:** `setup-node` 6/6/8 s a `Install` 17/14 s, tri behy
  v baseline — pôvodná kontencia bola reálna a presun ju odstránil.
  **Nepreukázané:** že štart na pozadí niečo ušetrí. Rozsah −63 až +17 s,
  rozptyl väčší než efekt. Otvorené pre foundera: vrátiť štart do popredia?

### Tri opravy vlastných tvrdení — všetky zmerané, žiadna zamlčaná
1. **`npm ci ~3,5 min` bolo nesprávne.** Po krokoch **18 s**; `cache: npm` už
   dlho v workflowe bolo. Odporúčanie na tom postavené **zrušené**.
2. **„Rozptyl jobu je pod 1 %" bolo nesprávne.** Platilo pre dva behy hodinu od
   seba (411/415 s); tretí o deväť hodín neskôr dal **306 s**, teda **26 %**.
   Príčina (PREDPOKLAD): výkon runnera — zrýchlili sa všetky CPU-viazané kroky
   v podobnom pomere, kým sieťovo viazaný štart Supabase sa nepohol. Dôsledok:
   merací plán „jeden beh pred, jeden po" som musel zahodiť.
3. **„Vercel stavia plný preview pre docs diff" bolo nesprávne.** `ignoreCommand`
   je korektný a testovaný; prvý build je jeho **fail-safe** pri neznámom
   `VERCEL_GIT_PREVIOUS_SHA`. Overené skôr, než by podľa toho niekto siahol na
   `vercel.json`.

### Kontencia — zmeraná, nie tušená
| krok | beh 1 | beh 2 | **beh 3** | baseline |
|---|---|---|---|---|
| **setup-node** | 37 | 49 | **6** | 6 / 8 / 7 |
| Install | 15 | 22 | **16** | 18 / 17 / 10 |
| **štart Supabase** | 137 | 184 | **110** | 108 / 113 / 108 |
| Lint | 30 | 37 | 58 | 35 / 33 / 23 |
| Typecheck | 24 | 25 | 34 | 28 / 28 / 16 |

```
beh 1: štart 137s | čakalo sa 19s | čisté -72s
beh 2: štart 184s | čakalo sa 38s | čisté -19s
beh 3: štart 110s | čakalo sa  6s | čisté -63s   <- po presune
```

Po behoch 1 a 2 bol rozptyl **väčší než polovica zisku**, takže „−84 s" by bolo
tvrdenie bez opory. Preto SETUP-NODE-REORDER — a tretí beh diagnózu potvrdil
tým, že príčinu odstránil.

**Kontencia však nezmizla, len sa presunula.** `Lint` a `Typecheck` sú teraz
+29 s nad baseline, lebo ony bežia súbežne s pullom. Sú CPU-viazané, takže
platia menej než sieťovo viazaný npm cache restore. Čisté −63 s je **po**
odpočítaní tých +29 s aj +12 s môjho nového testu; hrubé číslo −104 s
neuvádzam ako výsledok. Zvyšok do stropu 84 s poradie krokov neodstráni —
pull musí s niečím koexistovať.

### Merací princíp, ktorý z toho ostáva
`wait-for-supabase.sh` vypisuje `prekrytych` z **jedného** behu. Podiel v rámci
toho istého behu runner-variance nekriví — na rozdiel od porovnávania celkových
časov medzi behmi, čo je pri ±26 % nepoužiteľné.

### Rozpracované / Pending
- *(#723 zmergované ako `dfa805db` — pozri vyššie, nie je pending.)*
- Dva dokumenty Sol 5.6 (Prompt Stack Compiler / Build Protocol) — nie sú v repe
  a ich presný text už nemám. Buď ich prilepiť znova, alebo napísať
  Revolis-native v0.1 z nameraných čísel (odporúčam druhé).
- Calendly webhook; provenance 6 riadkov v `revolis_zaujemcovia` (GDPR);
  Direction B z AP-023; inventúra funkcií a stĺpcov — všetko nezmerané.

### Kľúčové súbory zmenené
- `.github/workflows/saas-grade-pipeline.yml`: fastpath, štart na pozadí, poradie
- `scripts/ci/wait-for-supabase.sh` + `__tests__/`: čakanie a meranie, 7 testov
- `scripts/ci/classify-diff.sh` + `__tests__/`: fastpath, 19 testov
- `scripts/ci/prepush-gate.sh`: lokálna brána, teraz 7 kontrol
- `apps/crm/scripts/typecheck-baseline.mjs`: počíta zdroj, nie `.next/`
- `memory/decisions.md`: AP-028, AP-029

### Nahlásené, neopravené
- `Test` (vitest) zostáva najväčšou položkou behu.
- `Upload artifact` (18 s, `.next`, 7 dní) — žiadny workflow ho nesťahuje.
- #710 pridalo záznamy na koniec `decisions.md`, hoci log je newest-first.
- Vetva `claude/loving-thompson-0s22ut` je **zdieľaná** — dnes do nej trikrát
  pushol niekto mimo tejto session. Nikdy force-push.

### Ďalší krok
CI je hotová v rozsahu, ktorý dávali dáta: fastpath −123 s na docs PR,
štart na pozadí bez preukázaného zisku (−63 až +17 s naprieč 3 behmi), lokálna brána proti 27 % červených.
Ďalší najväčší cieľ je `Test` (vitest), ale ten sa nedá skrátiť bez zásahu do
pokrytia — to potrebuje vlastnú bránu a vlastné GO, nie prívesok.

## Session 2026-09-27 (AGENTIC-SYSTEM repo + INBOUND-DRAFT-01)

### Dokončené
- **AGENTIC-SYSTEM** (samostatný private repo `onlinovosk-bit/AGENTIC-SYSTEM`): Blueprint v1.0,
  Model Routing Policy v1.0.1, decision matrix, `config/model-routing.yaml` + CI test súladu
  (PR #1 zmergovaná). Nič z toho nežije v Revolis.
- **INBOUND-DRAFT-01** (GO A): AI návrh odpovede pre reálne leady —
  `apps/crm/src/lib/inbound/reply-draft.ts`, napojené v `api/acquire/email` a `api/leads/inbound`.
- **AP-023 smer B triáž** (GO 2): 15 chýbajúcich tabuliek overených v PROD, volajúci
  dotrasovaní (živé / za flagom / mŕtve). Rozhodovacia tabuľka v `memory/decisions.md` (COACH-HONEST).
- **COACH-HONEST**: `api/coaching/insight` + `components/coaching/BrokerCoach.tsx` — žiadne
  vymyslené čísla na dashboarde.

### Rozpracované / Pending
- Founder odpovede k smeru B: starter pack, Calendly webhook, hodnoty `*_ENABLED` flagov.
- `INBOUND_WEBHOOK_SECRET` nie je v project env na Vercel → `/api/webhooks/inbound-lead` vracia 503.
  Nevolá ho nikto; rozhodnúť, či webhook zrušiť.
- Po merge overiť na PROD: nový lead z portálu → v časovej osi „AI návrh odpovede" →
  „Schváliť a odoslať" (log `INBOUND_REPLY_DRAFT`). PostgREST filter approve-draft proti živej DB
  stále neoverený.

### Kľúčové súbory zmenené
- `apps/crm/src/app/api/coaching/insight/route.ts`: bez štatistík žiadny panel, bez zdroja žiadne číslo
- `apps/crm/src/components/coaching/BrokerCoach.tsx`: skryje hodnoty bez zdroja, bez „V regióne Prešov"
- `apps/crm/src/lib/inbound/reply-draft.ts`: nový zdieľaný draft helper + `after()` scheduler + kill switch
- `apps/crm/src/lib/inbound/auto-reply.ts`: `timeoutMs` voľba, `fallback` príznak
- `apps/crm/src/lib/inbound/process-lead.ts`: krok 5 cez helper (správanie bez zmeny)
- `apps/crm/src/app/api/acquire/email/route.ts`, `apps/crm/src/app/api/leads/inbound/route.ts`: napojenie
- `apps/crm/src/lib/agents/agent-specs.ts`: REVOLIS-INBOUND-AUTOREPLY 1.1.0

### Ďalší krok
Po merge: overiť prvý reálny návrh na PROD a že maklér ho vie odoslať.
## Session 2026-09-28 (RLS-NULL-ESCAPES — pripravené, NA PROD NEAPLIKOVANÉ)

### Dokončené
- **`20260928070000_rls_null_escapes.sql`** — `agency_id IS NULL OR …` odstránené
  z tenant politík 10 tabuliek. **Na produkcii zatiaľ NEBEŽALO** (sľúbil som
  predložiť migráciu pred aplikovaním; čaká na samostatné GO).
- **Dôkaz pred/po na lokálnej PG 16** s vernou schémou (`profile_agencies_for_auth()`
  doslovne z PROD, dvaja tenanti, `auth.uid()`): PRED **10/10** A vloží nepriradený
  riadok a B z iného tenanta ho vidí; PO **10/10** insert → 42501 a viditeľnosť → 0.
  Nedotknuté: A vloží riadok svojej agentúry 10/10 OK, A ho číta 10/10, B ho nečíta 10/10.
  Idempotentné + guard overený na DB, kde dve tabuľky chýbajú.
- **Priznaná chyba v prvom harnesse**: chýbal `grant select on profiles to
  authenticated`, takže dve tabuľky vyzerali bezpečne už PRED zmenou. Po doplnení
  (ako na PROD) je PRED 10/10 zneužiteľných.
- **Dvaja zapisovatelia opravení** (`alert-dispatch.ts`, `bri-engine.ts`) — `agency_id`
  nedodávali vôbec a prechádzali len vďaka disjunkcii; bez tejto opravy by zmena
  tichý cross-tenant zápis premenila na tiché zlyhanie.
- **Nález navyše**: `bri_history.profile_id` je `NOT NULL` bez defaultu a kód ho
  nedodával → ten insert **vždy padal na 23502**, ticho (chyba sa zahadzovala).
  Preto má tabuľka 0 riadkov. Doplnené, chyba sa teraz loguje.
- **Test** `apps/crm/tests/rls/null-escape-rls.test.ts` — pripína obe vlastnosti
  (nevyrobíš nepriradený riadok; nevidíš ten, čo už existuje). Lokálne nespustený,
  Docker tu nie je — prvý beh bude v CI.

### Rozpracované / Pending
- **GO na aplikovanie `20260928070000` na PROD** — migrácia je pripravená a dokázaná
  lokálne, na produkcii nebežala.
- **`bri_history` NIE JE uzavretá**: `"Enterprise BRI access"` a `"Locked BRI read-only"`
  sú pre rolu `public` bez akéhokoľvek tenant filtra. Nie je to `IS NULL` únik, takže
  mimo tejto brány — ale netvrdím, že tabuľka je čistá.
- **`GO RLS-ANON-GUARD-TEST`** — statický ratchet proti novým `true`/`IS NULL` politikám.
- **27 tabuliek s RLS a nula politikami** — dnes bez následku (service role), chybou
  sa to stane pri prvom dotaze s tokenom používateľa.
- **`authenticated` drží na `leads` aj TRUNCATE/REFERENCES/TRIGGER** — viac, než migrácia dáva.
- **404-PATH-01 po hydratácii NEOVERENÉ**; **Calendly webhook** (founder, 5 min);
  **pôvod 6 riadkov v `revolis_zaujemcovia`** (GDPR); cenník + Stripe KYB (founder).

### Kľúčové súbory zmenené
- `apps/crm/supabase/migrations/20260928070000_rls_null_escapes.sql`: nová migrácia.
- `apps/crm/src/lib/l99/alert-dispatch.ts`: tenant na `priority_alerts` + log chyby.
- `apps/crm/src/lib/l99/bri-engine.ts`: `agency_id` + `profile_id` na `bri_history` + log chyby.
- `apps/crm/tests/rls/null-escape-rls.test.ts`: nový regresný test.
- `memory/decisions.md`, `memory/session-summary.md`: prepend.

### Ďalší krok
GO na aplikovanie `20260928070000` na PROD (merania pred/po zopakujem na produkcii).

## Session 2026-09-28 (RLS-LEADS-REVOKE)

### Dokončené
- **RLS-LEADS-REVOKE aplikované na PROD** pod founder GO. Príkazy z existujúceho
  `20260827214500_leads_revoke_anon_table_privileges.sql` (ležal v repe od 27. augusta,
  na produkciu nikdy nedobehol). `anon` na `public.leads`: **7 oprávnení → 0**.
  `authenticated` a `service_role` bez zmeny, 511 riadkov a 0 s `agency_id IS NULL`
  nedotknutých, `leads_tenant` nedotknutá. Kontrola 22 tvrdení tej migrácie: 0 nezhôd.
- **Overené z pohľadu `anon`, nie len z katalógu**: `set local role anon` → `SELECT`
  aj `INSERT` vracajú `42501 permission denied`. Pred zmenou `SELECT` vracal prázdny
  úspech — odstránenie práve tohto bolo v komentári migrácie uvedené ako jej dôvod.
- **Bezpečnosť preukázaná, nie odhadnutá**: `leads` má jedinú politiku `leads_tenant`
  pre `authenticated`, takže na `anon` sa nevzťahovala žiadna → bol už odmietnutý RLS.
  Dotrasované aj na volajúcich: všetky verejné cesty zapisujúce leady idú cez service role.
- **História opravená pod verziou SÚBORU**, nie novo razenou (ekvivalent
  `supabase migration repair`). `apply_migration` cez MCP si razí vlastnú pečiatku —
  a to je mechanizmus driftu z AP-024; opravovať drift spôsobom, ktorý vyrobí ďalšieho
  ducha, by bolo absurdné. História 61 → 62, nezaznamenaných migrácií 65 → 64.
- **PR #720 (AP-024)** zelené na `0f8458e`, mergeable; do PR stiahnutý main (#713, #715,
  #717, #719). Prvý base merge mal konflikt v memory súboroch (obe strany prependovali) —
  vyriešený zachovaním oboch strán, overené `--numstat` aj počtami riadkov.

### Rozpracované / Pending
- **`GO RLS-NULL-ESCAPES`** — 10 tabuliek s `IS NULL` únikom na `INSERT`/`ALL` pre
  `authenticated`. Každú premerať zvlášť pred zmenou; dnes 0 riadkov s `NULL`.
- **`GO RLS-ANON-GUARD-TEST`** — statický ratchet proti novým `true`/`IS NULL` politikám
  pre `public`/`anon`. Nie je to duplikát `schema-governance-guard.mjs` (ten kontroluje
  mená tabuliek).
- **Otvorené, nie potichu opravené**: `authenticated` drží na `leads` aj `TRUNCATE`,
  `REFERENCES`, `TRIGGER` — viac, než migrácia dáva. Migrácia to nerevokuje, tak som
  to nerevokoval ani ja.
- **106 zo 111 tabuliek** stále dáva `anon` plné DML; RLS je na nich jediná brána.
- **27 tabuliek s RLS a nula politikami** — dnes bez následku (všetci volajúci idú cez
  service role), chybou sa to stane pri prvom dotaze s tokenom používateľa.
- **404-PATH-01 po hydratácii NEOVERENÉ** — sieťová politika odmieta `app.revolis.ai:443`.
- **Calendly webhook** — founder check, 5 min.
- **Pôvod 6 riadkov v `revolis_zaujemcovia`** — GDPR.
- Cenník + Stripe KYB — founder.

### Kľúčové súbory zmenené
- `docs/reports/2026-09-27-migration-history-reconcile.md`: datovaná vsuvka „VYRIEŠENÉ
  2026-09-28" pri náleze 1 + odškrtnutý prvý ďalší krok. Meranie ponechané ako bolo.
- `memory/decisions.md`, `memory/session-summary.md`: prepend.

### Ďalší krok
`GO RLS-NULL-ESCAPES` — 10 tabuliek, kde ktokoľvek s účtom môže vyrobiť nepriradený
riadok viditeľný všetkým nájomníkom.

## Session 2026-09-27 (MATCHING-ZERO)
### Dokončené
- Matching číta cez klienta volajúceho, prázdne čítanie nemaže zhody:
  `apps/crm/src/lib/matching-store.ts`, `matching-hooks.ts`, routy leads/properties; 6 nových testov.
### Rozpracované / Pending
- Founder rozhodnutie: ako dostať dopyt do 439 importovaných kontaktov (matching bez neho nič nenájde).
- Denný matching cron (`ai/matching-engine`) — vlastný návrh.
- Stripe VERIFY; B.1 znova proti `app.revolis.ai`.
### Kľúčové súbory zmenené
- `apps/crm/src/lib/matching-store.ts`: čítania so `scoped`, guard proti zmazaniu pri prázdnom čítaní
- `apps/crm/src/lib/matching-hooks.ts`: `scoped` parameter až po recalculate aj aktivitu
### Ďalší krok
Founder: po merge spustiť raz „Prepočítať matching" a rozhodnúť o dopyte importovaných kontaktov.

## Session 2026-09-27 (CONCIERGE-SECRET-FAIL-CLOSED nasadené)

### Dokončené
- **#716 `9c72fa1a`** — `conciergeSecretOk` je fail-closed. Bez
  `CONCIERGE_SHARED_SECRET` vracia `false`, nie `true`. Päť testov podľa vzoru
  `cron-auth.test.ts`, opravený zastaraný komentár v `proxy.ts`.
- **Zápis vyššie v tejto session („Ďalší krok: až keď je secret vo Vercele")
  bol prekonaný a je to KOREKCIA môjho tvrdenia.** Dôkaz, na ktorom stálo,
  pokrýval len `callback` (0 leadov) — `properties` ani `freebusy` lead
  nevytvárajú. Po domeraní `usage_metrics_daily` (0 riadkov pre `concierge%`
  proti kontrolnej celej tabuľke: 54 riadkov, 6 metrík, zápis dnes) je jasné,
  že tie routy neboli v produkcii nikdy zavolané, takže nasadenie pred
  premennou nemá čo rozbiť.
- **Typecheck ratchet: 64 proti 69 na maine.** Prvá verzia testov ich pridala
  tri; typovaný helper `env()` ich odstránil a ešte dve staršie zmazal.

### Rozpracované / Pending
- **HUMAN: `CONCIERGE_SHARED_SECRET`** — founder generuje a vkladá; hodnota
  nesmie prejsť konverzáciou. Vercel → Voiceflow (`x-concierge-secret`) →
  redeploy. Do tej chvíle tri concierge routy vracajú 401 **zámerne**.
- **HUMAN: Google OAuth consent (B08)** — publikovať app (Testing režim zabíja
  refresh token po 7 dňoch), potom `CONCIERGE_GOOGLE_PROFILE_ID` + redeploy.
- **HUMAN: `scripts/ops/stripe-verify-prices.sh`** — späť len `n/9 resolved`.
- Diera W1: lead bez telefónu, ktorého jediná adresa je adresa kancelárie.

### Kľúčové súbory zmenené
- `apps/crm/src/lib/concierge/agency.ts`: fail-open → fail-closed.
- `apps/crm/src/lib/concierge/__tests__/concierge.test.ts`: 5 testov + `env()`.
- `apps/crm/src/proxy.ts`: komentár — secret je required, nie optional.

### Ďalší krok
Po founderovom nastavení secretu overiť cez `filter_project_envs`, že premenná
je v produkcii, a až potom hlásiť Concierge ako zapojiteľný.

---

## Session 2026-09-27 (BASELINE-BENCHMARK-01, CI-FASTPATH-01, TEST-SPLIT-01 zmerané)

### Dokončené
- **BASELINE-BENCHMARK-01** (#709) — zmeraný menovateľ, ktorý chýbal na to, aby
  bolo tvrdenie Compilera o zrýchlení vôbec overiteľné:
  `docs/reports/2026-09-26-baseline-benchmark.md` + 5 zmrazených dátových sád
  v `docs/reports/assets/2026-09-26-baseline-benchmark/` + merací skript
  `scripts/ops/measure-prompt-stack.mjs`. Beh agentného tasku median **88 s
  (3,5 % PR cyklu)**, CI **549 s (22 %)**, PR created→merged **42 min (n=40)**.
  Zvyšných ~74 % je čakanie. Compiler optimalizuje tie 3,5 %.
- **CI-FASTPATH-01** (#713) — diff výhradne v `docs/`/`memory/`/`.ai/` preskočí
  Build, artifact a Playwright: **155 s z 586 s (−26 %)** na 9 z 40 PR (22,5 %).
  `scripts/ci/classify-diff.sh` + 19 testov, fail-safe na plný beh.
  `Test` sa nepreskakuje nikdy — vitest číta 30+ ciest v `docs/`.
- **Lokálna brána** `scripts/ci/prepush-gate.sh` — 43 s proti zmeraným **27 %
  červených behov** (8 z 30). Vypisuje povinné NEOVERENÉ.
- **ONBOARDING-ANON-01** (#709) — anon `FOR ALL` policy na `onboarding_sessions`
  dropnutá, aplikované na PROD, merané `anon` 5 → 0.
- Overený fastpath **proti reálnemu merge refu** (`git fetch --depth=2 origin
  refs/pull/713/merge`): `HEAD^1`/`HEAD^2` dá presný diff PR →
  `app_touched=true`, `reason=mimo docs/memory: .github/...`. Teda správna
  vetva, nie fail-safe.

### Opravené vlastné chyby (obe zmerané, nie zamlčané)
- **AP-027 tvrdil `npm ci ~3,5 min ← najväčšia položka`. Nesprávne.** Po krokoch
  je to **18 s** (so setup-node 26 s = 4 %); `cache: npm` v workflowe už dlho je.
  Odporúčanie „cache npm ci → −38 % CI" **zrušené**. Report opravený v §2.1.1,
  pôvodné tvrdenie v ňom citované ako nesprávne, nie vymazané. Tá istá chyba,
  akú AP-027 vyčítal Compileru, o úroveň vyššie.
- **`typecheck-baseline.mjs` počítal `.next/types/**`** → lokálne 66 vs baseline
  54, padalo na artefaktoch po #708. A v mojej oprave **druhá chyba**: regex
  `/^([^\s(][^(]*)\(/` sa zastaví na prvej zátvorke, takže route groups
  (`src/app/(dashboard)/...`) nezmatchoval vôbec a chyby v celom segmente by
  z počtu zmizli. Zachytené tým, že súčet nesedel (54 + 8 ≠ 66). Opravené na
  `/^(\S.*?)\(/` a zafixované fixture testom, ktorý proti starému regexu padá.

### Rozpracované / Pending
- **#713** čaká na dobehnutie `Lint, test, build` a merge (GO daný).
- **TEST-SPLIT-01** (GO daný) — zmerané, ale **mechanizmus sa musel zmeniť**:
  rozdelenie testov podľa grepu je **nespoľahlivé** —
  `tests/rls/rls-tenant-isolation.test.ts` používa `createServiceClient()`
  a nezmatchuje ho žiadny vzor (`createClient(`, `TEST_SUPABASE`, `SERVICE_ROLE`…).
  Namiesto toho: `supabase start` na **pozadí**, prekrytý s npm ci + lint +
  typecheck. Strop **min(84,115) = 84 s ≈ 14 %** na každom behu, bez oslabenia
  brán. Mechanika overená (prekryv 7 s vs 11 s, zlyhanie → exit 1, zaseknutie →
  exit 124 + log). Implementácia po merge #713, na čistej vetve.
- Calendly webhook — 5-minútová kontrola foundera; `demo_bookings` v PROD neexistuje.
- Provenance 6 riadkov v `revolis_zaujemcovia` — GDPR, rozhodnutie foundera.
- Direction B z AP-023 (14 tabuliek, ktoré app volá a v PROD nie sú) + inventúra
  funkcií a stĺpcov — nezmerané.
- Dve dokumenty Sol 5.6 (Prompt Stack Compiler / Build Protocol) — nie sú v repe
  a ich presný text už nemám; buď ich prilepiť znova, alebo napísať
  Revolis-native v0.1 z nameraných čísel (odporúčam druhé).

### Kľúčové súbory zmenené
- `docs/reports/2026-09-26-baseline-benchmark.md`: baseline + §2.1.1 oprava
- `docs/reports/assets/2026-09-26-baseline-benchmark/`: 5 zmrazených sád
- `scripts/ops/measure-prompt-stack.mjs`: mechanické meranie stacku (nie agentom)
- `scripts/ci/classify-diff.sh` + `__tests__/classify-diff.test.sh`: fastpath, 19 testov
- `scripts/ci/prepush-gate.sh`: lokálna brána, 43 s
- `apps/crm/scripts/typecheck-baseline.mjs`: počíta zdroj, nie `.next/`
- `.github/workflows/saas-grade-pipeline.yml`: fetch-depth 2, classify step, 5 gated krokov
- `apps/crm/supabase/migrations/20260926090000_onboarding_sessions_anon_lockdown.sql`

### Nálezy nahlásené, nie opravené
- `Test` 183 s + `Supabase start` 115 s = **51 % behu** — najväčší zostávajúci cieľ.
- `Upload artifact` (`.next`, 18 s, 7 dní retencie) — **žiadny workflow ho nesťahuje**.
- `find-dead-exports.mjs` v `code-contract-guard.yml` je dormantný krok čakajúci
  na PR #358, ktoré nikdy neprišlo.
- #710 pridalo svoje dva záznamy na **koniec** `decisions.md` (r. 3265), hoci log
  je inak newest-first. Nechané tak — cudzie záznamy nepresúvam.
- Vetva `claude/loving-thompson-0s22ut` je **zdieľaná** (dnes do nej dvakrát
  pushol niekto mimo tejto session). Nikdy do nej force-push.

### Ďalší krok
Domerať #713 a zmergovať, potom TEST-SPLIT-01 na čistej vetve — a keďže wrap-up
je `memory/`-only diff, bude to **prvý reálny beh rýchlej vetvy fastpathu**:
zmerať skutočnú úsporu z krokov jobu a zapísať ju, nie strop.

## Session 2026-09-27 (ACTIVITY-CLIENT-01)
### Dokončené
- Serverové `createActivity` volania dostali klienta: `api/scheduled-events/*`, `api/properties/[id]`,
  `lib/billing-store.ts` (Stripe webhook), `lib/outreach-store.ts`; guard test v `tests/verification/`.
### Rozpracované / Pending
- PROD runbook B/C: foundrov test (B.1 200/draftCreated, B.2 OK) sa **nedostal do PROD DB ani do
  PROD logov**, takže neoverené. Čaká na URL a leadId z odpovede.
- Stripe VERIFY (CHECKOUT-ENV-01 krok A) — founder.
- Dlh: 5 lib súborov s unscoped `createActivity` (zoznam v teste).
### Kľúčové súbory zmenené
- `apps/crm/src/app/api/scheduled-events/{route.ts,[id]/route.ts}`: scoped klient, aktivita nefatálna
- `apps/crm/src/lib/billing-store.ts`: service-role klient pre billing aktivity
- `apps/crm/tests/verification/server-activity-client.verification.test.ts`: nový guard
### Ďalší krok
Founder: Stripe VERIFY výstup; B.1 znova proti `app.revolis.ai` s celou odpoveďou.

## Session 2026-09-27 (Concierge fail-open, B08 stav overený)

### Dokončené
- **Overený skutočný stav B08 namiesto opakovania návodu.** Consent neprebehol
  (`profile_google_calendar` = 0 riadkov), takže `CONCIERGE_GOOGLE_PROFILE_ID`
  nie je z čoho odvodiť. Produkcia pritom **na B08 kóde beží** — `main` `f90e6032`
  (#708), posledný production deploy `READY`, `calendar-auth.ts` aj scope
  `calendar.events.freebusy` sú na maine. Blokátor je ľudský: OAuth app v režime
  Testing vráti `403 access_denied` a v tom režime Google zabíja refresh token
  po 7 dňoch.
- **Nájdené: Concierge endpointy sú v produkcii bez autentifikácie.**
  `conciergeSecretOk` je fail-open (`if (!expected) return true`) a vo Vercel
  produkcii nie je žiadna `CONCIERGE_*` premenná. Tri routy sú v `proxy.ts`
  mimo session brány. Repo pritom rovnakú triedu chyby **už raz opravilo** —
  `isAuthorizedCronBearer` je fail-closed a má na to test. Detail v `decisions.md`.
- **Odmeraný dopad:** 0 leadov so `source = 'website-concierge'` za celú dobu,
  widget podľa reportu z 2026-09-17 nikdy nebol zapojený. Expozícia reálna,
  nevyužitá — a preto je teraz najlacnejší moment ju zavrieť.

### Rozpracované / Pending
- **HUMAN: `CONCIERGE_SHARED_SECRET`.** Founder ho generuje a vkladá sám —
  hodnota by inak prešla konverzáciou. Poradie: Vercel → Voiceflow → redeploy.
- **HUMAN: Google OAuth consent** — publikovať app, potom pripojiť účet
  a nastaviť `CONCIERGE_GOOGLE_PROFILE_ID`.
- **KOREKCIA v poradí krokov:** nastavenie env premennej JE tá zmena správania,
  nie následná zmena kódu. Pôvodné tvrdenie Clauda bolo opačné a nesprávne.

### Kľúčové súbory zmenené
- `memory/decisions.md`, `memory/session-summary.md`: tieto zistenia. Kód nezmenený.

### Ďalší krok
`GO CONCIERGE-SECRET-FAIL-CLOSED` — až keď je secret vo Vercele aj vo Voiceflow.

---
## Session 2026-09-27 (MIGRATION-HISTORY-RECONCILE)

### Dokončené
- **AP-024 / MIGRATION-HISTORY-RECONCILE** — história migrácií PROD zmierená
  s repozitárom **per objekt**, nie per tabuľka. 120 migrácií v repe, 61 riadkov
  v histórii, 65 nezaznamenaných. **784 tvrdení** o objektoch zmeraných na PROD
  (politika, stĺpec, index, trigger, funkcia, constraint, oprávnenie).
  Výsledok: **46 zo 65 nezaznamenaných migrácií nechýba po nich nič**; 19 áno,
  s 120 nálezmi — 33 chýba správne, **10 je odstránenie, ktoré PROD nedostal**,
  77 je objekt, ktorý PROD nemá. Report:
  `docs/reports/2026-09-27-migration-history-reconcile.md`.
- **Šesť „duchov" vysvetlených.** Spárované podľa názvu, nie verzie: 4 sú ten istý
  súbor pod inou verziou (migrácia cez Supabase MCP si razí vlastnú pečiatku — to je
  mechanizmus driftu), 2 sú necommitnutá oprava `scheduled_events`, ktorej koncový
  stav sa však presne zhoduje s `20260527143000_event_scheduler_phase1.sql`.
- **Nástroj, nie jednorazové tvrdenie** — `scripts/ops/reconcile-migration-history.mjs`
  (`--mode diff` a `--mode sql`). Meranie sa dá zopakovať kýmkoľvek.
- **Kontrola baseline súboru**: 63 tvrdení z `20260925210000_baseline_prod_only_tables.sql`,
  **0 nezhôd** — baseline je verný. Overené aj to, že `"Allow anon access"` sa
  vo baseline a v lockdowne zhoduje vrátane veľkosti písmen, takže na čistej DB je
  koncový stav správny.
- **Opravená moja vlastná chyba v metóde** — extraktor prevádzal názvy politík na
  malé písmená (správne pre necitovaný, nesprávne pre citovaný identifikátor).
  Vyrobilo 7 falošných nálezov; po oprave 0. Popísané v reporte, nie zamlčané.

### Bezpečnostné nálezy — zmerané, NIČ nemenené (každý má vlastnú bránu)
- **`anon` má na `public.leads` všetkých 7 oprávnení** (511 riadkov). Neuniká nič
  (jedna politika `leads_tenant` pre `authenticated`), ale `20260827214500` nedobehol.
  107 zo 111 tabuliek dáva `anon` plné DML → RLS je všade jediná brána.
- **26 politík s `IS NULL` únikom v 16 tabuľkách.** 11 mŕtvych (vedú cez
  `leads.agency_id`, ktorý je `NOT NULL`). **10 tabuliek dosiahnuteľných**:
  vlastný nullable `agency_id` + únik na `INSERT`/`ALL` pre `authenticated`
  (`ai_action_audit`, `ai_actions`, `bri_history`, `client_dna`, `deal_moments`,
  `deal_risk`, `lead_events`, `lead_scores`, `priority_alerts`, `properties`).
  Riadkov s `NULL` dnes: 0. Zápisová sonda **nespúšťaná** — brána bola read-only.
- **27 tabuliek: RLS zapnutá, nula politík** (`credit_ledger`, `decisions`,
  `exclusivity_outcomes`, `ai_sourced_deals`). **Dnes to nie je chyba** — dotrasované,
  všetci volajúci idú cez `createServiceRoleClient()`.
- **`lead_scores_agency`** — nedobehnuté zrušenie, žiadna neskoršia migrácia ju netvorí.

### Rozpracované / Pending
- **`GO RLS-LEADS-REVOKE`** — dobehnúť `20260827214500` na PROD. Najvyššia hodnota
  na najmenšej ploche: jeden `REVOKE`, bez zmeny chovania aplikácie.
- **`GO RLS-NULL-ESCAPES`** — 10 tabuliek, každú premerať zvlášť pred zmenou.
- **`GO RLS-ANON-GUARD-TEST`** — statický ratchet v CI proti novým `true`/`IS NULL`
  politikám pre `public`/`anon`, s povolenkou pre historické súbory.
- **404-PATH-01 po hydratácii NEOVERENÉ** — sieťová politika odmieta `app.revolis.ai:443`.
- **Calendly webhook** — founder check, 5 min.
- **Pôvod 6 riadkov v `revolis_zaujemcovia`** — GDPR.
- **Smer B z AP-023** — 14 tabuliek, ktoré kód volá a v PROD nie sú (tento report
  ich potvrdil vrátane ich indexov, politík a oprávnení).
- Cenník + Stripe KYB — founder.

### Kľúčové súbory zmenené
- `docs/reports/2026-09-27-migration-history-reconcile.md`: nový — AP-024, meranie per objekt.
- `scripts/ops/reconcile-migration-history.mjs`: nový — zopakovateľné zmierenie histórie.
- `docs/reports/2026-09-25-schema-drift-inventory.md`: odkaz na nadväzujúci AP-024.
- `memory/decisions.md`, `memory/session-summary.md`: prepend.

### Ďalší krok
`GO RLS-LEADS-REVOKE` — odobrať `anon` oprávnenia na `public.leads`.

## Session 2026-09-26 (ONBOARDING-ANON-01)

### Dokončené
- **ONBOARDING-ANON-01**: `20260926090000_onboarding_sessions_anon_lockdown.sql`.
  Dropnutá policy `"Allow anon access"` (`FOR ALL TO anon USING(true) WITH CHECK(true)`).
  **Aplikované na PROD** pod founder GO: `anon` 5 → 0 riadkov, service role stále 5,
  policies 0, RLS zapnutá. Overené lokálne na oboch tvaroch DB + idempotencia.

### Rozpracované / Pending
- **404-PATH-01 po hydratácii NEOVERENÉ** — sieťová politika prostredia odmieta
  `app.revolis.ai:443` pre headless browser (403 na CONNECT). Server HTML a deploy
  overené; post-hydratačný stav nie. Buď povoliť tú doménu, alebo klik foundera.
- **Calendly webhook** — founder check, 5 min.
- **Pôvod 6 riadkov v `revolis_zaujemcovia`** — GDPR.
- **Smer B z AP-023** — 14 tabuliek, ktoré kód volá a v PROD nie sú.
- **Inventúra funkcií a stĺpcov** — 3. a 4. rozmer driftu, oba nezmerané.
- **UGKK-QUERY** — nedokončené.

### Kľúčové súbory zmenené
- `apps/crm/supabase/migrations/20260926090000_onboarding_sessions_anon_lockdown.sql`: nový

### Ďalší krok
Calendly webhook (founder) alebo inventúra stĺpcov naprieč schémou.

---

## Session 2026-09-25 (RLS vlna dokončená, CI attribution, PR-6, BSM retired)
### Dokončené
- **RLS-OUTREACH-LOGS** — `apps/crm/supabase/migrations/20260925230000_outreach_logs_tenant_parity.sql`.
  Nález nie je nová diera, ale drift: `20260616124500_rls_wave_a_leak_closure.sql` túto
  policy definuje od júna, v histórii PROD nie je a jej efekt tiež nie. Merané ako `anon`
  na zasadenom nepriraditeľnom riadku: PRED SELECT 1/1, INSERT ALLOWED, **DELETE ALLOWED**
  (dal sa mazať outreach audit log); PO 0/1, 42501, 0 riadkov. Aplikované na PROD.
- **RLS-LATENT-3** (#702, merged) — `20260925140000_rls_latent_anon_writes.sql`:
  `lead_property_events`, `leads_demo`, `bsm_reforma_leads`.
- **CI attribution** — `scripts/ci/supabase-start.sh` už neobviňuje registry zo zlyhaní,
  ktoré registry nespôsobil. 9/9 testov v `scripts/ci/__tests__/supabase-start.test.sh`.
- **PR-6** — `apps/crm/src/app/api/leads/[id]/contact-attempt/route.ts` (nový, 12 testov)
  + napojenie tlačidiel Zavolať/Email v lead detaile. Enterprise bránu som **nepoužil**,
  nie obišiel: nová negated routa, lebo C1 nesmie byť vlastnosť cenníka.
- **BSM funnel retired** — zmazaná `(public)/bsm-reforma/page.tsx` a `api/bsm-reforma/lead`.
- **HOURLY-TRIGGER-UNTRACK** — `memory/hourly-summary.ps1` píše do gitignorovaného
  `memory/hourly-trigger.local.md`, cesta z `$PSScriptRoot`.
### Rozpracované / Pending
- **`properties` má rovnaké `agency_id IS NULL` escapy** pre `authenticated`
  (`properties_select_agency`, `_update_agency`, `_delete_agency`) vedľa správnej
  `properties_tenant`. Dnes 0 riadkov s NULL → latentné, nie živé. Mimo brány, neopravené.
- **Migračná história PROD je nespoľahlivá:** 118 migrácií v repe, 59 v histórii, 65 chýba,
  6 „ghost" (v histórii, nie v repe). Absencia v histórii ≠ absencia efektu — overené oba
  prípady v jeden deň (`profiles_platform_admin` chýba a funguje; `rls_wave_a_leak_closure`
  chýba a nefunguje). Jediná cesta je merať per objekt.
- Nič ešte **nečíta** contact attempts do funnel čísla. Zámerne — počet príde, keď bude čo počítať.
- Founder: pricing (mesačne + kredity vs bez kreditov, onboarding 99 → 49 €), Stripe KYB.
### Kľúčové súbory zmenené
- `apps/crm/supabase/migrations/20260925230000_outreach_logs_tenant_parity.sql`: telo policy verbatim z Wave A
- `scripts/ci/supabase-start.sh`: klasifikácia zlyhania pred retry, PIPESTATUS namiesto $?
- `scripts/ci/__tests__/supabase-start.test.sh`: stub berie FAIL_MESSAGE, +5 prípadov
- `apps/crm/src/app/api/leads/[id]/contact-attempt/route.ts`: negated zápis pokusu o kontakt
- `apps/crm/src/app/(dashboard)/leads/[id]/page.tsx`: `logContactAttempt`, keepalive fetch
- `memory/hourly-summary.ps1` + `.gitignore`: nudge už nešpiní trackovaný súbor
- `docs/runbooks/workspace-audit-handover.md`: riadok o hardcoded ceste preškrtnutý
### Ďalší krok
Rozhodnúť o `properties` escapoch (GO RLS-PROPERTIES-ESCAPES) — posledný známy `IS NULL`
escape na tenant tabuľke, dnes latentný. Potom zvážiť RLS-ANON-GUARD-TEST ako ratchet,
aby sa celá trieda nevracala po jednom.

## Session 2026-09-25 (Outreach náhľad textu)
### Dokončené
- Outreach dvojkrok: `apps/crm/src/app/api/outreach/preview/route.ts` (nový), `send`/`approve`
  cez `lib/inbound/approve-draft.ts`, `lib/outreach-store.ts` (`prepareOutreachDraft`,
  `sendApprovedOutreach`, `sendAiOutreachEmail` vždy odmietne), UI panel s náhľadom.
### Rozpracované / Pending
- PROD runbook B/C (founder): schválenie + kill switch test; teraz aj outreach náhľad → odoslanie.
- Agent Factory cez Ústavu — čaká na GO (odporúčanie BACKLOG).
### Kľúčové súbory zmenené
- `apps/crm/src/lib/outreach-store.ts`: draft + approved sender, žiadny generate-and-send
- `apps/crm/src/lib/inbound/approve-draft.ts`: outreach v SEND_ACTIONS, `expectAgentId`, lazy outreach sender
- `apps/crm/src/lib/inbound/insert-agent-draft.ts`: vracia `activityId`, `auditExtras`
- `apps/crm/src/components/outreach/outreach-send-panel.tsx`: náhľad → schválenie
- PROD runbook B/C, read-only časť: 0 návrhov v PROD; `messages` v PROD neexistuje, takže
  outreach limit prešiel na `ai_action_audit` s fail-closed (#704).
### Ďalší krok
Founder overí Shared env (RESEND_API_KEY, OUTREACH_FROM_EMAIL, INBOUND_WEBHOOK_SECRET),
potom spustí runbook B/C a pošle výsledok.
## Session 2026-09-25 (pokračovanie — baseline, GDPR, drobnosti)

### Dokončené
- **SCHEMA-BASELINE-01**: `20260925210000_baseline_prod_only_tables.sql` (996 r.)
  — 30 PROD-only tabuliek + 27 FK + 42 indexov + 30× RLS + 29 policies + 2 triggery
  + 2 chýbajúce funkcie. Vernosť dokázaná zhodou 7/7 md5 hashov s PROD.
- **GDPR posúdenie** časti C: `docs/reports/2026-09-25-gdpr-orphan-tables.md`.
  AP-024 — `gdpr-advisor` skill neexistuje, Direktíva 5 je nevykonateľná.
- **404-PATH-01**: `NotFoundPath.tsx` (client) číta reálnu cestu cez `usePathname`.
  Predtým každý návštevník videl natvrdo `app.revolis.ai/team/permissions`.
- **CLAUDE.md**: `session-summary.md` je PREPEND, nie replace — rozpor, ktorý
  ma dnes zviedol k zmazaniu 1339 riadkov histórie.

### Rozpracované / Pending
- **Pôvod 6 riadkov v `revolis_zaujemcovia`** — founder check, minúty.
- **Calendly webhook** — stále neoverený. 14 tabuliek, ktoré kód volá a v PROD
  nie sú (smer B z AP-023), baseline NERIEŠI.
- **Inventúra funkcií** — tretí rozmer driftu, nezmeraný.
- **Inventúra stĺpcov** — štvrtý rozmer (AP-025), nezmeraný. Vieme o
  `profiles.tier_locked_at`, lebo naň spadla CI.
- **UGKK-QUERY** — nedokončené.

### Kľúčové súbory zmenené
- `apps/crm/supabase/migrations/20260925210000_baseline_prod_only_tables.sql`: nový
- `docs/reports/2026-09-25-gdpr-orphan-tables.md`: nový
- `apps/crm/src/components/NotFoundPath.tsx`: nový
- `apps/crm/src/app/not-found.tsx`: reálna cesta namiesto zadrôtovanej
- `CLAUDE.md`: prepend pravidlo pre session-summary

### Ďalší krok
Zatvoriť `onboarding_sessions` anon dieru a overiť pôvod `revolis_zaujemcovia`.

## Session 2026-09-25

### Dokončené
- **METRICS-ACCESS-01** (#699, `531b1cac`): brána `/internal/metrics` uznáva
  `is_platform_admin`; položka „Metriky zakladateľa" v menu (`platformAdminOnly`);
  `not-found.tsx` zbavený vnoreného `<html>/<body>` — **overené na živej produkcii**,
  404 už renderuje kartu, nie bielu plochu.
- **CI-UNBLOCK-01** (#700, `364b08cd`): `20260925110000_rls_anon_lockdown.sql` obalený
  do `to_regclass(...) IS NULL → RETURN`. `main` bol červený a blokoval každý PR.
  Overené na lokálnom PG16 (čistá DB + PROD-tvar) aj reálnym zeleným CI behom.
- **SCHEMA-DRIFT-INVENTORY**: `docs/reports/2026-09-25-schema-drift-inventory.md`,
  AP-023. Read-only, žiadne DDL na PROD.

### Rozpracované / Pending
- **Calendly webhook** — founder má overiť, či je `/api/webhooks/calendly` nastavený.
  Ak áno, `demo_bookings` neexistuje → 500 → strata atribúcie dema. Najvyššia priorita
  z celej inventúry.
- **5 tabuliek s osobnými údajmi** (časť C reportu) — pôvod a právny základ neustálené.
  Kandidát na `gdpr-advisor`. Nemazať, kým sa nevie, čo to je.
- **Baseline dump PROD schémy** do migrácie — rieši 30 chýbajúcich naraz. Vlastná brána.
- **CI gate proti regresii driftu** — test padne, keď kód volá tabuľku bez migrácie.
- **404-PATH-01** — `not-found.tsx:51` má natvrdo `app.revolis.ai/team/permissions`.
- **UGKK-QUERY** — nedokončené. CRZ ukazuje zmluvy ÚGKK s komerčnými subjektmi, čo
  je v rozpore s `master-data-sourcing-map.md` ZHLUK 3.
- Founder-only lokálne: `git push --force-with-lease origin 272810f8:fix-usage-telemetry`,
  `branch-cleanup.sh` (111 vetiev).

### Kľúčové súbory zmenené
- `apps/crm/supabase/migrations/20260925110000_rls_anon_lockdown.sql`: existenčné guardy
- `apps/crm/src/lib/metrics/access.ts`: `canViewFounderMetrics` rešpektuje platform admina
- `apps/crm/src/types/navigation.ts`: `NavItem.platformAdminOnly` + položka `internal-metrics`
- `apps/crm/src/app/not-found.tsx`: bez vnoreného `<html>/<body>`
- `apps/crm/src/app/(dashboard)/internal/metrics/page.tsx`: presunuté pod `(dashboard)`
- `docs/reports/2026-09-25-schema-drift-inventory.md`: nový

### Ďalší krok
Founder overí Calendly webhook. Ak je nastavený, `demo_bookings` je strata akvizičných
dát a má prednosť pred baseline dumpom aj pred CI gate.

## Session 2026-09-24 (COST-BASELINE → AI nákladová telemetria end-to-end)

> **PRVÁ VEC PRE NOVÚ SESSION:** cenový pivot na 199 €/kancelária je zapísaný
> (`DEC-20260924-001`), ale **kód ho ešte nepozná** — `computeMrrBreakdown()` stále
> počíta seat/program model. Otvorená úloha `PRICING-MODEL-01`.

### Dokončené

- **#682** — `callOpenAI()` zapisuje skutočné `prompt_tokens + completion_tokens` do
  `usage_metrics_daily`. Jeden chokepoint pokryl všetkých 11 volajúcich namiesto
  deviatich falošných `delta: 0`.
- **#686** — `agencyId` dotiahnutý na zvyšných 9 volajúcich. 6 bez dotazu navyše,
  2 presunom poradia, 2 jedným lookupom na AI ceste s nemým zlyhaním.
- **#688 / AP-010** — `ai_action_audit` dostalo `cost_eur`, `credits_spent`, `model`,
  `latency_ms`. Migrácie na ne existovali od júna, neboli aplikované; insert padal do
  `console.warn`. Registrované ako `20260924183806`. Dôkaz: insert so všetkými štyrmi
  prešiel v transakcii s rollback, 0 testovacích riadkov zostalo.
- **MARGIN-VIEW-01** — `ai_cost_daily` prepísaný na skutočný náklad; marža sa počíta
  z `computeMrrBreakdown()`; `costGap` drží dlaždicu na „—", keď akcie prebehli bez
  zapísaného nákladu. `security_invoker = true`.
- **Owner Dashboard neexistoval ako otvorená otázka** — plocha už bola nadrôtovaná
  (`FounderMetricsDashboard` + `lib/metrics/fetch.ts`), chýbal jej len pravdivý vzorec.

### Opravené vlastné omyly

- Navrhol som „A) migrácia — dolepiť 4 stĺpce" bez toho, aby som najprv pozrel, či
  migrácie existujú. **Existovali.** Skutočná príčina bola neaplikovanie, nie chýbajúci
  súbor. A ani nález nebol môj — `persist-cost-telemetry.ts` to má v docstringu.
- Pri BRANCH-CLEANUP som tvrdil, že mŕtve vetvy stoja Vercel deploye. Nestoja — Vercel
  deployuje na push, nie na existenciu vetvy.
- „main je červený na typecheck-baseline" — moje zlé meranie: gate počíta aj
  `.next/types/**` a ja som ho púšťal po `next build`. Bez nich presne 54.

### Rozpracované / Pending
- **Dead-lead + outreach za kontraktom, correlation_id, agent spec pre 4 agentov (GO ×3):**
  PR na vetve `claude/keen-lovelace-ih8ej3`, čaká na merge. Po merge sú všetky 4 cesty
  AI → klient za schválením aj kontraktom.
- **PROD overenie (runbook B/C) stále chýba.** Implementované sú 4 cesty, overených
  naživo 0.
- **Follow-up sweep → iba návrhy (GO 2026-09-25):** PR na vetve `claude/keen-lovelace-ih8ej3`.
  Cron neodosiela; maklér schvaľuje e-mail/SMS cez spoločný approve path a kontrakt.
  Pred merge treba vedieť: ak mal PROD `FOLLOWUP_MODE=send`, automatické follow-upy
  po merge prestanú a zostanú len návrhy (zámer).

- **`PRICING-MODEL-01`** — migrovať `computeMrrBreakdown()` na plochých 199 €/kancelária.
  Dopad na vykazovaný MRR: 278 € → 597 € pri 3 aktívnych kanceláriách. Founder GO.
- **`UGKK-QUERY`** — CRZ ukazuje zmluvy ÚGKK s komerčnými subjektmi (napr. U.S. Steel)
  a VÚGK publikuje licenčné podmienky. **Protirečí to
  `master-data-sourcing-map.md` ZHLUK 3**, ktorý tvrdí „pre komerčné subjekty neexistuje
  oprávnený záujem ani API". Treba doriešiť aj to, či sa vlastnícke dáta smú použiť na
  marketingový outreach (GDPR nad rámec zmluvy). Nedokončené.
- **`AP-021`** — migračný drift **vedie F2B (#687)**, nie táto session. Môj údaj
  113/53 bol neskorší a hrubší než jeho 111/48; neuvádzam ho ako konkurenčný.
  AP-010 doň prispieva len ako prvý prípad, kde drift stál funkčnosť.
- **Osirelý commit `9eff0b29`** na vetve `fix-usage-telemetry` (obsah je v #686).
  Upratať lokálne: `git push --force-with-lease origin 272810f8:fix-usage-telemetry`
  — harness mi force-push zamietol.
- Nezmenené: CHECKOUT-ENV-01 krok A (Stripe VERIFY, founder-side),
  `BUS-YAML-BOM-TOLERANCE`, `branch-cleanup.sh` (111 vetiev, founder spúšťa lokálne).

### Kľúčové súbory zmenené

- `apps/crm/src/lib/ai/openai.ts` — `agencyId` param, zápis skutočných tokenov
- 11 volajúcich `callOpenAI()` — `agencyId` dotiahnutý (#686)
- `apps/crm/supabase/migrations/20260924183806_ai_action_audit_cost_columns.sql` — AP-010
- `apps/crm/supabase/migrations/20260924200000_ai_cost_daily_view.sql` — pohľad bez fikcie
- `apps/crm/src/lib/metrics/{types,compute,fetch}.ts` — marža z MRR, `costGap`
- `apps/crm/src/components/metrics/FounderMetricsDashboard.tsx` — dlaždice bez kreditov
- `.claude/settings.json` — `mcp__Supabase__execute_sql` v allow-liste

### Ďalší krok

`PRICING-MODEL-01` — bez neho dashboard ukazuje maržu proti seat MRR, hoci cenník je
199 €/kancelária. Je to jediná vec, ktorá dnes drží Owner Dashboard v nesúlade
s rozhodnutím foundera.

## Session 2026-09-24 (Agentic System Blueprint v1.0 → Revolis System Spec v1.0)

### Dokončené
- Blueprint v1.0 uložený doslovne: `docs/architecture/agentic/agentic-system-blueprint-v1.0.md`
- Revolis System Spec v1.0, vyplnený z kódu so stavmi LIVE/DEFINED/MISSING:
  `docs/architecture/agentic/revolis-system-spec-v1.0.md`
- Rozhodnutie zapísané v `memory/decisions.md`; odkazy v `docs/architecture/MAPA.md`
- PR #689 zmergovaná (squash, 0d01c8a): iba dokumentácia

### Rozpracované / Pending
- **Tier-3 brána + „Schváliť a odoslať“ sú na `main`** (squash `ebb55b1`, PR #690, 20:07Z; obsah overený diffom). Na PROD ešte treba overiť `INBOUND_WEBHOOK_SECRET` a `OUTREACH_FROM_EMAIL`. Či prebehol test na preview, nie je známe.
  Pred merge treba overiť, že `INBOUND_WEBHOOK_SECRET` je nastavený na PROD.
  Bez neho endpoint po merge vracia 503.
- **„Schváliť a odoslať" (GO)** je v tej istej PR #690: route, `approve-draft.ts`,
  `draft-view.ts`, tlačidlo v časovej osi leadu a 24 nových testov (commit f302a63 chybne uvádza 31). Na preview
  treba overiť, či PostgREST filter `.or('meta->>approval_state.is.null,…')`
  funguje na živej DB.
- `TASK-SEC-002` je `done`: obsah je na `main` a overený.
- **Control Contract je v živej ceste (PR #692):** registrovaná akcia
  `inbound.reply.email.send`, autorita v `approve-draft.ts`, kill switch
  `AGENT_KILL_SWITCH`. Čaká na merge.
- PROD, read-only kontrola (20:15Z): `ebb55b1` beží na produkcii (READY). Runtime
  logy za 7 dní obsahujú len 12 riadkov, takže prevádzku webhooku z nich nevyčítam.
- PR #495 (pôvodný nález) nechaj otvorený, kým founder neprijme kartu.

### Kľúčové súbory zmenené
- `docs/architecture/agentic/*`: nové, Blueprint a System Spec
- `memory/decisions.md`: záznam o prijatí Blueprintu a verdikt Ústavy
- `docs/architecture/MAPA.md`: pridané dva odkazy
- `apps/crm/src/app/api/webhooks/inbound-lead/route.ts`: povinný secret (503/401),
  porovnanie v konštantnom čase
- `apps/crm/src/lib/inbound/process-lead.ts`: service-role klient, `agency_id`,
  AP-010, iba draft a audit, žiadny send
- `apps/crm/src/lib/inbound/auto-reply.ts`: `AUTO_REPLY_PROMPT_VERSION`
- nové testy v `apps/crm/src/lib/inbound/__tests__/` a
  `apps/crm/src/app/api/webhooks/inbound-lead/__tests__/` (16 testov)
- `.ai/bus/tasks/TASK-SEC-002.md`: pridaná sekcia Resolution

### Ďalší krok
1. Overiť `INBOUND_WEBHOOK_SECRET` a `OUTREACH_FROM_EMAIL` na PROD.
2. Na preview poslať testovací lead, potom kliknúť „Schváliť a odoslať".
3. Merge PR #690.

---

## Session 2026-09-24 (UPTM governance — uptm-runner)

> **PRVÁ VEC PRE NOVÚ SESSION:** Founder dal **GO na UPTM-018a**. Vetva
> `claude/map-q3-record-contradiction` je založená z `origin/main` (`5dfb832`),
> **bez commitov**. Nič nie je rozpracované na disku — začni preregistráciou
> špecifikácie (P4), viď „Ďalší krok".

**Repozitár:** `onlinovosk-bit/uptm-runner`, klon v `/home/user/uptm-runner`.
Primárny pracovný adresár session je `/home/user/RealitkaAI`.
**UPTM rozhodnutia patria do `uptm-runner`, nie do RealitkaAI.**
### Dokončené

- **UPTM-006 / PS-R1, PS-R2** — enforcement cesty pre strážcu APS-001
  (`runner/enforcement.py`). Zmergované (PR #19 → #18 → `main`).
- **`NON_PRINCIPLE_GUARDS`** — nové stojace pravidlo: každá skupina ciest mimo
  `ENFORCED` princípov musí byť deklarovaná s napísaným dôvodom, inak padne
  coverage test. Zmergované.
- **`REDUNDANT_GUARDS`** — zápis vyvrátenej predpovede o PS-R1 (drží ho
  required-field list *aj* binding validátor, každý samostatne). Zmergované.
- **DEC-UPTM-APS** — `docs/decisions.md`: APS-001 je *guard*, nie princíp.
  Zmergované (PR #20 → `main` = `7aa25b9`).
- **Evidence Rule A** (`runner/provenance.py`, `docs/evidence-rule-a.md`,
  `tests/test_evidence_rule_a.py`, `.github/workflows/pytest.yml`,
  DEC-UPTM-RULEA, oprava `governance-map.md`) — hotové, otestované, CI zelená.
  **ALE NIE JE NA `main`** — viď Riziká.

### Rozpracované / Pending

- **PR #22** `dec-uptm-aps → main` — draft, zelená, clean. Merge je founderov
  akt. Toto je jediná otvorená PR.
- **Otvorené founderove rozhodnutia:**
  - `evidence_expiry_days` — nenastavené, drží **P12 na `PARTIAL`**.
    `expires_at` je `null` a manifest čestne píše prečo.
  - Štyri zvyšné governance otázky z `docs/architecture/governance-map.md`
    (otázka 4 = Rule A je odteraz zodpovedaná): či wave gate musí spĺňať
    kapitálovú ústavu; ktorého repa verdikt vyhráva pri nezhode; ako súvisí
    €700 a €750; ktorý wave slovník je kanonický.
- **W8** — špecifikácia prijatá s dodatkami P2/P13 (`onlinovosk-bit-uptm#28`,
  zmergované). **Implementácia naďalej odmietnutá**: P2 nie je nikde vynútené,
  takže harness postavený teraz opisuje cestu, ktorú reálny beh neprejde.

### Riziká — prečítaj pred akoukoľvek prácou

**„Merged" sa nerovná „na `main`".** PR #21 (Rule A) bola vetvená z
`dec-uptm-aps`. O 07:37:35Z sa `dec-uptm-aps` zmergovala do `main` (#20),
a o 07:37:55Z sa #21 zmergovala do `dec-uptm-aps` — teda do vetvy, ktorú už
nikto nemergoval. GitHub ukazuje #21 ako merged; `main` z nej nemá nič:

```
git merge-base --is-ancestor 193f17d origin/main   -> NIE
git ls-tree -r main | grep provenance.py           -> nič
```

Stranded commity: `ff9d261`, `193f17d`, `5967fec`. PR #22 ich dostane na `main`.
Stackovanie vetiev bola moja voľba, takže aj táto medzera.

**Oprava tohto pravidla, 12:10Z — pôvodne tu stálo „vždy over
`merge-base --is-ancestor`, nie farbu na GitHube". To je nesprávne.** Overil som
ním merge tejto PR (#679) a vyhlásil „NIE — nie je na main", hoci obsah na `main`
bol. Dôvod: #679 sa zlúčila **squashom**, takže head commit vetvy nie je predkom
`main`, ale jej zmeny áno. `--is-ancestor` dá falošný poplach pri každom squash
a rebase merge — a to je v tomto repozitári bežný režim.

Správne pravidlo: **over OBSAH, nie rodokmeň.** Diffni dotknuté súbory proti
`origin/main`, alebo nájdi squash commit (`git log origin/main --oneline | grep '(#679)'`).
`--is-ancestor` použi len ako doplnok — jeho „NIE" znamená „preveruj ďalej",
nie „nepristálo".

Zmerané na #679: `merge-base --is-ancestor 1a13ac4 origin/main` → NIE,
`ff59d14 memory: session summary … (#679)` na `main`, 46 sekcií, súbor
byte-identický s vetvou. Obsah pristál; rodokmeň nie.

**Paralelné session bez zdieľaného nároku na prácu** (`DEC-UPTM-DUP`) sa dnes
prejavili už tretíkrát — raz ako duplicita (UPTM-003 postavené dvakrát), raz ako
opomenutie (APS-001 strážca hodinu bez cesty). Problém je stále otvorený.

**Tri moje tvrdenia za dva dni vyvrátilo meranie:** P10-R2 conditional guard,
PS-R1 predpoveď, a „manifest si vie dosvedčiť vlastnú čerstvosť" v governance
mape. Vzorec je zakaždým rovnaký — vierohodná úvaha, vyslovená s istotou, nikdy
nespustená proti tomu, čo opisovala. Všetky tri zostávajú zapísané v kóde a
v mape, nie potichu opravené.

### Kľúčové súbory zmenené

- `runner/provenance.py`: nový — `read_head()` číta evaluated head z repa,
  `--expect-head` je krížová kontrola, nie zdroj; špinavý strom / žiadne repo =
  `null` s uvedeným dôvodom, nikdy vierohodný default.
- `runner/enforcement.py`: `manifest()` berie `HeadProvenance` namiesto
  `commit`; pribudli `NON_PRINCIPLE_GUARDS`, `REDUNDANT_GUARDS`, PS-R1, PS-R2.
- `runner/cli.py`: `--commit` odstránený, `--expect-head` pridaný; `ok` je
  `false` pri akomkoľvek probléme s provenienciou.
- `.github/workflows/pytest.yml`: krok enforcement-evidence už neodovzdáva
  commit — CI nemôže artefaktu povedať, čo dokazuje.
- `docs/evidence-rule-a.md`: nový — ktorá polovica Rule A platí a prečo tá druhá
  nie (podmienečne, s testom ako poistkou). Vrátane nameraného faktu, že na PR
  builde je `evaluated_head` pominuteľný merge commit.
- `docs/architecture/governance-map.md`: otázka 4 zodpovedaná; presilené tvrdenie
  opravené **na mieste, s pôvodným znením ponechaným viditeľne**.
- `docs/decisions.md`: DEC-UPTM-APS, DEC-UPTM-RULEA.
- `tests/test_evidence_rule_a.py`: nový, 9 testov.

### Stav systému (zmerané, nie predpokladané)

```
uptm-runner main = 7aa25b9      343 passed (po merge #22)
enforcement-evidence  ok: true, tree_clean: true
                      routes_reaching_pass: [], unproven_claims: []
P8  ENFORCED    P10 ENFORCED    P12 PARTIAL (chýba evidence_expiry_days)
LIVE_TRADING = false            CONSTITUTION-CAPITAL.md v1.0 LOCKED
19 enforcement routes, APS-001 deklarovaný v NON_PRINCIPLE_GUARDS
```

### Ďalší krok

Zmergovať **PR #22** (`dec-uptm-aps → main`), aby Evidence Rule A reálne
pristála. Potom: founder nastaví `evidence_expiry_days` → P12 sa dá posunúť na
`ENFORCED` rovnakou cestou ako P8 a P10 (preregistrované kritériá, potom
meranie). Žiadna implementácia bez explicitného GO.

---

### Dokončené — všetko zmergované na `main`

`main` = **`5dfb832`**, strom čistý, **830 passed**, `mutation-gate` **32 mutácií,
`ok: true`**, `baseline_error: None`, `enforcement-evidence` `tree_clean: true`,
`unproven_claims: 0`.

| # | čo | PR |
|---|---|---|
| UPTM-011 | kontrakt pre Bearish Quasimodo; šesťosový status rebrík (`source, rules, implementation, no_leakage, stats, performance`) | #43 |
| UPTM-012 | **definícia swingu** — `runner/swing.py`, `Swing(index, price, kind, confirmed_at)`, invariant `confirmed_at = index + pivot_bars`; plató nedá swing; nič sa spätne nereviduje | #44 |
| UPTM-013 | ES/MES do sourcing mapy — `runner/data_sources.py`, stavy `NOT_IN_MAP → MAPPED_UNVERIFIED → VERIFIED_TERMS → LICENSED → CONNECTED`; `research/data_sources/es_mes_bars.json` | #45 |
| UPTM-014 | **pravidlo rollu** — `runner/roll.py`; zmerané, že back-adjusted séria **precení už potvrdené swingy** (105 → 115), preto je neprípustná | #46 |
| UPTM-015 | MAP-Q1 + MAP-Q2 zatvorené; `runner/cross_repository.py` (nezapojené do `gates.py` zámerne) | #47, #48 |
| UPTM-016 | MAP-Q5 zatvorené; `runner/wave_names.py`, kvalifikované ID `uptm-runner:W<n>` | #49 |
| — | **oprava červeného `main`** — časovaná bomba v `tests/test_kill_switch_detector.py` | #50 |
| UPTM-017 | **`at_risk` = risk-to-stop; účet je podlaha pod tranžou**; VC-I5 + VC-I6; MAP-Q3 zatvorené | #51 |

**Všetkých päť governance otázok (MAP-Q1…Q5) je rozhodnutých.**

#### UPTM-017 detailne (posledný blok)
- **VC-I5** — `capital.at_risk_basis` musí byť deklarovaný; prijíma sa len
  `risk_to_stop`. Zamietnuté: `notional` (700 notionalu nekúpi ES ani MES —
  strop, ktorý nepovolí žiadny test, nie je veľkosť testu) a `margin`
  (artefakt brokera/burzy, hýbe sa s volatilitou). Nedeklarovaný = `UNKNOWN`,
  nie `FAIL`.
- **VC-I6** — `cumulative_realised_loss` je strop len ak naň účet dosiahne.
  `account_equity < amount` → FAIL. Chýbajúca equity = `UNKNOWN`, pomenuje kľúč.
  **Žiadne číslo sa nevymýšľa.**
- Súbory: `runner/detectors/validation_capital.py`,
  `tests/test_at_risk_unit_and_floor.py` (28 testov, U1–U8),
  `runner/mutation_gate.py` (+`at-risk-basis-unchecked`, `account-floor-unchecked`;
  `map-q3-marked-decided` prenamierený na `map-q3-turned-into-a-ceiling`),
  `docs/architecture/governance-map.md`, `docs/decisions.md` (DEC-UPTM-017).

---

### Rozpracované / Pending

- **UPTM-018a — GO DANÉ, nezačaté.** `governance-map.md` si protirečí o Q3:
  - riadok **112**: „**DEC-UPTM-MAP-Q3 leaves that relation unadopted.**"
    (napísal PR #38, zarezervoval si label pre *otvorenosť*)
  - riadok **166**: „**DECIDED (DEC-UPTM-MAP-Q3, 2026-09-29): THE ACCOUNT IS A
    FLOOR UNDER THE TRANCHE.**"
  Nadpis Q3 je doslova *„How do €700 and €750 relate?"* — tá istá dvojica, nie
  dve rôzne otázky. **Kód je v poriadku** (VC-I6 číta `capital.account_equity`
  z packu, nie €750 z druhého repa; P11 drží). Chybný je len záznam rozhodnutia.
  **Prečo to nechytil test:** `test_map_q3_is_decided_as_a_floor_and_copies_no_number`
  overuje len, že rozhodnutie *je* v dokumente — nie že tam nie je zároveň opak.
  Guard je jednostranný.

- **Čaká na foundera, nezačaté:**
  - **Dve čísla pre UPTM-018:** `capital.account_equity` a
    `validation_capital.amount`. Bez nich VC-I5/VC-I6 končia na `UNKNOWN`.
    (700 EUR je dnes len fixture v testoch, nie rozhodnutie.)
  - **Štyri vendor otázky k ES/MES dátam** — egress blokovaný 3× na
    `databento.com`, `cmegroup.com`, `interactivebrokers.com`, `firstratedata.com`
    (403/407 z proxy = org policy). Nikdy som si podmienky nevymyslel.
    Diskvalifikačná otázka: *„dodávate surové per-contract dáta?"* (nie
    back-adjusted — UPTM-014 zmeral, prečo).
  - ebook strany pre Quasimodo + pp. 27–30; Hafez primárny zdroj;
    migrácia `mechanical_break_retest_hafez.json` na rebrík;
    183 packov, ktoré evidence schéma nepozná;
    zastaraná próza `founder_parameter_required` v `constitution/capital-rules.json`
    (ponúknuté, GO nedané).

---

### Kľúčové súbory zmenené

- `runner/detectors/validation_capital.py`: VC-I5 (`AT_RISK_BASIS`) + VC-I6 (podlaha)
- `runner/swing.py`, `runner/roll.py`, `runner/data_sources.py`, `runner/wave_names.py`,
  `runner/cross_repository.py`, `runner/pattern_contract.py`: nové moduly UPTM-011…016
- `runner/mutation_gate.py`: 32 mutácií
- `docs/architecture/governance-map.md`: všetkých 5 otázok DECIDED (**+ rozpor, viď UPTM-018a**)
- `docs/decisions.md`: DEC-UPTM-011 … DEC-UPTM-017, DEC-UPTM-MAP-Q1/Q2/Q3/Q5

---

### Stojace pravidlá (neporušiteľné)

1. **Žiadna implementácia bez explicitného GO.**
2. **Merge je akt foundera** — len na explicitné „merguj N". GO menujúce už
   zmergovanú PR **nie je** GO pre inú otvorenú; pýtaj sa, nesubstituuj.
   (Stalo sa 2× — „merguj 43" po merge #43.)
3. **Preregistrácia pred implementáciou (P4)** — spec vo vlastnom commite.
4. **Guardy sa prenamierujú, nemažú**, keď sa fakt zmení; docstring povie prečo.
5. **„Derived, never typed"** — množiny sa merajú, nie píšu.
6. **Čísla, ktoré sú apetítom na riziko, nevymýšľaj.** Founder ich stanovuje.
7. `LIVE_TRADING` zostáva `false`; bezpečnostná obálka sa nerozširuje.
8. **Merge overuj obsahom na `origin/main`**, nie zeleným odznakom.
9. Vzdialené vetvy: `git ls-remote origin refs/heads/...` — tento klon
   netrackuje `origin/<branch>`, `git rev-parse origin/X` fatalne padne.
10. **403/407 z proxy = org policy.** Nahlás blokovaný host, neobchádzaj,
    nikdy nevypínaj TLS verifikáciu ani `HTTPS_PROXY`.
11. `pytest`/`mutation-gate` **nikdy súbežne** — brána mutuje súbory na disku,
    paralelný pytest číta zmutovaný strom a hlási falošné red. (Stalo sa.)
12. `pyproject.toml` má `addopts = "-q"` → súhrnný riadok „N passed" sa nezobrazí
    pri `-q`; spusti bez neho, ak chceš počet.
13. Mutation-gate JSON má kľúč **`mutations`**, nie `cases`.

---

### Ďalší krok

**UPTM-018a** (GO dané): preregistruj spec, potom:
1. prepíš odsek na r. 112 `governance-map.md` tak, aby hovoril, čo
   DEC-UPTM-MAP-Q3 rozhodol (vzťah = *podlaha*; `account_equity` je deklarovaný
   údaj packu, **nie** €750 z druhého repa, ktoré `uptm-runner` nesmie prepísať);
2. pridaj **obojstranný test**: dokument nesmie niesť „unadopted" aj „DECIDED"
   pod tým istým labelom;
3. jeden mutation case;
4. draft PR, **nemergovať** bez „merguj N".
