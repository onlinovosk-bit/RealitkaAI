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
- **`onboarding_sessions` anon diera** — `TO anon USING(true) WITH CHECK(true)`.
  Nový nález z baseline. Nepokryli ju #697 ani #702. Vlastná brána.
- **Pôvod 6 riadkov v `revolis_zaujemcovia`** — founder check, minúty.
- **Calendly webhook** — stále neoverený. 14 tabuliek, ktoré kód volá a v PROD
  nie sú (smer B z AP-023), baseline NERIEŠI.
- **Inventúra funkcií** — tretí rozmer driftu, nezmeraný.
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

> **PRVÁ VEC PRE NOVÚ SESSION:** `uptm-runner` PR #22 je otvorená a čaká na
> founderov merge. Bez nej **Evidence Rule A nie je na `main`**, hoci PR #21 je
> na GitHube označená ako merged. Detail nižšie v „Riziká".

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

## Session 2026-09-23 (WALL W1 kontaktná garda + WALL B / B08 Concierge kalendár + odblokovanie CI)

### Dokončené
- **W1 — kontaktná garda v ingeste (#659).** Lead z e-mailu už nedostane ako
  kontakt adresu samotnej agentúry. `apps/crm/src/lib/acquire/email-adapter.ts`
  filtruje adresy makléra, doménu agentúry a `revolis.ai`; verejní poskytovatelia
  (gmail, zoznam, seznam…) sa z odvodených domén agentúry vylučujú, inak by
  osobný gmail makléra zablokoval každého gmail kupca. Overené proti produkčnému
  leadu z 05:47, kde kontaktný e-mail bol presná zhoda s `profiles.email`.
  Lookup agentúry je fail-soft: stratiť lead kvôli chybe lookupu je horšie
  než pustiť slabší kontakt.
- **Zrušený `/blueprint` (#665).** Stránka nehovorila, čo Revolis robí ani pre koho.
- **B08 — Concierge freebusy cez refresh-token flow (#668, na `main` ako `3b03bfc6`).**
  Nový `apps/crm/src/lib/concierge/calendar-auth.ts`: väzba na PROFIL
  (`CONCIERGE_GOOGLE_PROFILE_ID`), nie na krátkodobý token v env. Refresh token
  nikdy nejde do env. Dôvody zlyhania sú konštanty typu, nie prepošlané OAuth
  hlášky — `invalid_grant` sa nedostane do odpovede ani do logu. Upstream
  zlyhanie nevracia pole `busy`, aby sa prázdne `busy: []` nedalo čítať ako
  „celý deň voľný". Pridaný scope `calendar.events.freebusy` (najužší, ktorý
  `freebusy.query` pokrýva — `calendar.events` ho NEpokrýva; zdroj je discovery
  dokument Calendar API v3, dokumentácia Google je z tohto prostredia blokovaná).
  22/22 testov, `next build --webpack` OK.
- **Odblokované CI (#673, `015e7e85`).** `supabase/setup-cli` exportuje
  `SUPABASE_INTERNAL_IMAGE_REGISTRY=ghcr.io` a ghcr.io teraz škrtí pull
  (`toomanyrequests, allowed: 44000/minute`) aj PRIHLÁSENÝ. Prihlásenie ten
  limit neobchádza — overené na behu `a41f6d57`, kde `docker login` prešiel
  a `supabase start` aj tak padol. Riešenie: step-level `env` s `docker.io`
  (job-level by nestačil, keby akcia premennú exportovala cez `$GITHUB_ENV`).
  Dôkaz: všetkých šesť images sa stiahlo z docker.io, nula `toomanyrequests`.
  **Platný stav je ale #671 (`959b251a`), nie toto:** krok už volá
  `scripts/ci/supabase-start.sh`, ktorý strieda registry a vedie `public.ecr.aws`.
  Step-level `env` je preč. Detail a odôvodnenie sú v `decisions.md`.

### Rozpracované / Pending
- **HUMAN_ACTION_REQUIRED (B08):** Google OAuth consent pre nový scope
  `calendar.events.freebusy` + nastaviť `CONCIERGE_GOOGLE_PROFILE_ID`.
  Bez toho freebusy vracia `oauth_missing` / 503 — čestne, nie vymyslený slot.
- **Zvyšková diera W1:** lead bez telefónu, ktorého jediná adresa je adresa
  klienta, ju stále dostane. Vedomé rozhodnutie — alternatíva je zahodiť lead.
- Mojibake v `TASK-BUS-RUNNER-2D` (čistá verzia na `bafd47eb`).
- `main` používa `NextResponse.json` tam, kde zadanie hovorilo `errorResponse` —
  ponechané zámerne (#660 → #665), lebo tvar odpovede je verejný kontrakt widgetu.

### Kľúčové súbory zmenené
- `apps/crm/src/lib/acquire/email-adapter.ts`: kontaktná garda + `agencyDomainsFrom`.
- `apps/crm/src/lib/concierge/calendar-auth.ts`: NOVÝ — `resolveConciergeAccessToken`.
- `apps/crm/src/app/api/concierge/freebusy/route.ts`: token z profilu, nie z env.
- `apps/crm/src/app/api/integrations/google/auth/route.ts`: +1 scope.
- `.github/workflows/saas-grade-pipeline.yml`, `nightly-playwright.yml`:
  `SUPABASE_INTERNAL_IMAGE_REGISTRY: docker.io` na úrovni kroku — **už neplatí**,
  #671 to nahradilo skriptom `scripts/ci/supabase-start.sh` (vedie `public.ecr.aws`).

### Ďalší krok
Google OAuth consent + `CONCIERGE_GOOGLE_PROFILE_ID`. Až potom má B08 čo overovať.

---

## Session 2026-09-06 (Reality Smolko Voiceflow correction)
### Dokončené
- Verejný audit potvrdil, že `realitysmolko.sk` už hostuje Voiceflow widget „Poraďte sa!“; nejde o Revolis dashboard surface.
- Odstránený chybný interný CRM chatbot z `/revolis-ai` vrátane endpointu, engine, metriky, registry a jeho testov.
- Pripravený presný trojkrokový Voiceflow canvas bez zberu kontaktu: typ nehnuteľnosti → kúpa/prenájom/predaj → lokalita.
- Targeted registry test 12/12 a lint prešli. Full suite: 280 pass, 5 RLS/integration testov blokujú chýbajúce `TEST_SUPABASE_*`; build blokuje existujúci import chýbajúceho balíka `uuid` v onboarding.
### Rozpracované / Pending
- Zmena Voiceflow canvasu čaká na prihlásenie/invite vlastníka existujúceho projektu. Nevytvárať nový účet ani druhý chatbot.
### Kľúčové súbory zmenené
- `docs/voiceflow/reality-smolko-property-guide-v1.md`: kopírovateľný konverzačný tok.
- `docs/reports/2026-09-06-smolko-voiceflow-audit.md`: dôkaz umiestnenia a overenie.
- `apps/crm/src/app/(dashboard)/revolis-ai/RevolisAIClient.tsx`: odstránený nesprávny panel.
### Ďalší krok
Po sprístupnení Voiceflow projektu vložiť canvas z `docs/voiceflow/reality-smolko-property-guide-v1.md`, otestovať tri vetvy na `realitysmolko.sk` a až potom publikovať.

---

## Session 2026-09-06 (Inter-Agent Bus v1.0)
## Session 2026-08-18

### Dokončené
- ZISTI: GPT Sol ↔ Opus 5 autonomous communication searched in repo + Cursor Cloud scope.
- Report: `docs/reports/2026-08-18-gpt-sol-opus5-comms-zisti.md`
- Verdict: not found in repo SSOT; likely external Notebook/chat unless founder supplies artifact.

### Rozpracované / Pending
- If founder wants to continue: draft canonical contract `docs/architecture/gpt-sol-opus5-autonomous-communication.md`.
- Do not implement autonomous model-to-model automation before contract + GO.

### Kľúčové súbory zmenené
- `docs/reports/2026-08-18-gpt-sol-opus5-comms-zisti.md`: evidence + next safe gate.
- `memory/session-summary.md`: current handoff.

### Ďalší krok
Founder GO: create contract draft for GPT Sol ↔ Opus 5 roles, transport, state machine, safety, and audit trail.
## Session 2026-09-06

### Dokončené
- First manual GPT Sol ↔ Opus 5 protocol trial completed.
- Trial: `docs/ai-comms/2026-09-06-trial/`
- Report: `docs/reports/2026-09-06-gpt-sol-opus5-manual-trial.md`
- Decision: D-2026-09-06-01 — manual format PASS, runtime automation STOP.

### Rozpracované / Pending
- Contract branch `cursor/gpt-sol-opus5-contract-dabc` is still stacked/open relative to main.
- Runtime/provider automation remains blocked.
- Optional next: add reusable templates or apply Sol↔Opus to one real high-risk PR review.

### Kľúčové súbory zmenené
- `docs/ai-comms/2026-09-06-trial/00-brief.md`: trial brief.
- `docs/ai-comms/2026-09-06-trial/01-sol-draft.md`: Sol draft.
- `docs/ai-comms/2026-09-06-trial/02-opus-review.md`: Opus review.
- `docs/ai-comms/2026-09-06-trial/03-sol-revision.md`: Sol revision.
- `docs/ai-comms/2026-09-06-trial/04-verdict.md`: PASS/STOP verdict.

### Ďalší krok
Founder GO: add reusable `docs/ai-comms/_template/` files, or use the protocol on one real high-risk PR review.
## Session 2026-09-22 (broker ingest atribúcia + čitateľnosť landing page + WBEP v0.1)

### Dokončené
- **WBEP v0.1** (#613 → `fe24b871`): `docs/prompts/multi-agent-protocol-v0/07-work-block-execution-protocol.md`,
  19 sekcií. Hlavička hovorí **NÁVRH v0.1 — NIE JE V PLATNOSTI**: je na `main`, ale záväzný
  nie je, kým to founder nepovie. Kľúčový nález v ňom zapísaný: **per-step GO režim nikdy
  nebol v protokole.** `03-human-decision-gate.md` má šesť stop-triggerov; commit na vlastnú
  vetvu, push na vlastnú vetvu, draft PR, test, lint ani read-only dopyt medzi nimi nie sú.
- **Broker ingest — atribúcia leadov maklérovi** (#633 → `1723969a`).
  `apps/crm/src/app/api/acquire/email/route.ts`: `normalizeMailbox` → `resolveMailboxOwner`
  (`inbound_mailboxes` → `profiles`, obe filtrované na `agency_id`) → insert s reálnym
  `assigned_profile_id` / `assigned_agent` namiesto natvrdo `null` / „Nepriradený".
  `backfillLeadOwner` dopĺňa vlastníka aj keď dedup zahodí kópiu, ktorá niesla signál —
  bez toho by preteky dvoch doručení ticho zožrali priradenie. `markMailboxReceived`
  beží pri každom doručení, nie len pri vzniku leadu, takže `last_received_at` je heartbeat
  prijímacej adresy, nie dátum prvého leadu.
- **9 prijímacích adries zapísaných do produkcie** (GO TEST-ROW → GO INGEST-ROWS),
  z toho **8 namapovaných na profil makléra**, 1 bez profilu (ostáva nepriradená, nie falošne
  priradená). Bez mien a bez adries — v repozitári sú len počty.
- **Legalizačná migrácia `inbound_mailboxes`**
  (`apps/crm/supabase/migrations/20260921195500_legalize_inbound_mailboxes.sql`) —
  tabuľka existovala len v produkcii, CI na čistej DB padalo na
  `relation "public.inbound_mailboxes" does not exist`. Migrácia reprodukuje **nameranú**
  produkčnú podobu; RLS zapnuté bez politík (deny-all, prísnejšie než prod).
  Druhá migrácia premenovaná na `20260921200851_inbound_mailboxes_profile_id.sql`, aby
  sedela s verziou zapísanou v produkcii a nekolidovala timestampom.
- **Overené v produkcii, nie odvodené:** `owner_backfilled` v logoch = nový kód je živý;
  heartbeat sa aktualizuje aj pri `NOT_A_LEAD`; `Reset DB` v behu 1970 prešiel.
- **#636** (zmergovaný, `d575990c`): `noticeGradient` do `slate-horizon-theme.ts` — žltý warning panel
  na `/upgrade` nahradený modrým gradientom z pracovného menu. Test na kontrast pridaný:
  každý stop gradientu drží 4.5:1 proti `brandDeep`.
- **#635** (zmergovaný 2026-09-22): čitateľnosť landing page — 44 cielených zväčšení fontu,
  base 17px → 18px, hero na jeden riadok, cockpit sekcia prepísaná na dvojstĺpcové
  porovnanie **bez jediného literálneho čísla** (všetko z `COCKPIT_PRODUCTS`,
  `COCKPIT_LITE_MIN_SEATS`, `ownerCockpitPriceEur()`), vykanie.
- **E-mail pre Smolka — dva varianty, pripravené, NEODOSLANÉ.** Founder ho skontroluje
  a odošle sám. Obsahuje self-service postup pre maklérov aj plný rozpis toho, čo obnáša
  cesta cez dodávateľa webu (vrátane toho, že si zaň môže vypýtať odmenu).

### Opravy vlastných chýb v tejto session (zapísané, lebo sa opakujú)
- **„všetko chodí na office@" bola nesprávna premisa.** Na túto adresu chodia len dopyty
  jedného makléra. Porovnanie 3 : 1, ktoré som z toho postavil, bolo neplatné; skutočná
  miera záchytu je niekde medzi 50 % a 16 % a **nie je nameraná**.
- **Zovšeobecnenie z 3 maklérov na 9.** Pýtal som si čísla od troch a robil závery za
  celú kanceláriu. Oprava nie je „lepší odhad", ale opýtať sa všetkých deviatich —
  preformulované na overenie po zapojení.
- **Nekryté číslo vo WBEP §15** („~200 vzdialeným vetvám", v skutočnosti 517) —
  odstránené úplne, nie opravené na iné nekryté číslo.
- **Takmer som sľúbil atribúciu, ktorá neexistovala.** `assigned_profile_id` bol v tom
  čase natvrdo `null`. Poradie otočené: najprv kód, potom e-mail.
- **Nadhodnotená GDPR námietka** proti preposielaniu — filter na zdroji rieši minimalizáciu.
  Námietku som výslovne stiahol.

### Rozpracované / Pending
- **#635, #636 aj #638 zmergované** 2026-09-22. Otvorené ostávajú #639 a #640.
- **E-mail pre Smolka founder odoslal 2026-09-22.** 8 krokov self-service postupu v ňom
  je napísaných z dokumentácie poskytovateľa, nie z vlastnej obrazovky — neboli preklikané.
  Tým sa rozhodujúci test atribúcie (`TASK-INGEST-VERIFY-ENVELOPE`) stáva časovo tlačeným:
  prvá preposlaná správa je zároveň odpoveďou. Detaily a dva nové nálezy: #639.
- **`email.to` = envelope recipient je predpoklad, nie dôkaz.** Pre skutočne preposlanú
  poštu neoverené. Ak by to bola hlavička a nie obálka, atribúcia sa tichým spôsobom
  posunie na pôvodného príjemcu.
- **RLS politiky na `inbound_mailboxes` v produkcii nikdy nenamerané.** Migrácia je
  prísnejšia než prod, čiže CI nepovie, keď je prod voľnejší.
- **Parser #599 stále neoverený v produkcii.**
- Otvorené founder rozhodnutia: či sa WBEP v0.1 stane záväzným; čo Owner Cockpit ponúka
  nad rámec grantu 100 kreditov; či pripnúť verziu `supabase/setup-cli` a vypnúť
  `cancel-in-progress` na `main` (oboje `.github/workflows` = tvrdá hranica, bez GO nie).
- Vercel narazil na denný strop deploymentov.

### Kľúčové súbory zmenené
- `apps/crm/src/app/api/acquire/email/route.ts`: `resolveMailboxOwner`, `backfillLeadOwner`,
  `markMailboxReceived` pri každom doručení; insert s reálnym vlastníkom
- `apps/crm/supabase/migrations/20260921195500_legalize_inbound_mailboxes.sql`: nová legalizácia
- `apps/crm/supabase/migrations/20260921200851_inbound_mailboxes_profile_id.sql`: premenovaná
- `apps/crm/src/lib/slate-horizon-theme.ts`: `noticeGradient` (+ test na kontrast každého stopu)
- `apps/marketing/app/landing-v2.css`: typografia, scope media query na `.landing-v2`,
  `.landing-v2 h1..h4 { color: var(--text) }`, hero `em` na jeden riadok
- `apps/marketing/components/landing/PricingSection.tsx`: cockpit porovnanie z kanonického zdroja
- `docs/prompts/multi-agent-protocol-v0/07-work-block-execution-protocol.md`: WBEP v0.1

### Ďalší krok
Founder: rozhodnúť o merge #635 a o GO na `TASK-CONTACT-GUARD-FIX` (#639, nálezy A a B).
Až po zapojení ďalších maklérov sa dá zmerať skutočná miera záchytu dopytov — dovtedy
je akékoľvek číslo o „koľko leadov nám uniká" odhad, nie meranie.

## Session 2026-09-21/22 (BUS runner 2D + bus do CI + cockpit price integrity)

### Dokončené
- **KROK 2D** (#617, merged `e6a2ddc`): always-on runner, 60 s poll loop s backoffom do 10 min,
  graceful shutdown, denný strop 100 vykonaní / 24 h rolling window
  (`packages/bus-core/src/execution-cap.ts`), blocker dedup bez zatvárania tasku.
  `handledTaskIds()` už nezapočítava blockery — raz odmietnutý task dostane druhú šancu.
- **Bus do CI**: `bus:typecheck` ako kroky v BUS jobe (#620, cudzia session),
  `bus:validate` ako krok (#622, `0cd66f3`). BUS job má teraz tri nezávislé stráže:
  runtime (testy), dáta (envelopes), typy. Každá overená zavedenou chybou, nie argumentom.
- `packages/bus-core/tsconfig.json` + `npm run bus:typecheck` (#617/#622).
- **Oprava rozsahu Stripe VERIFY** (#622): tri → **deväť** price objektov.
- `scripts/ops/stripe-verify-prices.sh` — kľúč z `STRIPE_SECRET_KEY`, nie z argumentu.
- Cockpit price integrity (#627, cudzia session) + zjednotenie stráže a gate na
  `isOwnerCockpitPurchasable` (#630, otvorené).

### Opravy predchádzajúcich záznamov v tomto súbore
- **„overit pät price objektov (seat x3 + cockpit x2)"** (blok 2026-09-21 revenue blocker)
  je **nesprávne v oboch smeroch**. Správne je **deväť**: seat ×3 + cockpit ×2
  (`OWNER_COCKPIT` + `OWNER_COCKPIT_FOUNDER`, **nie** `_PRO` — ten má `enabled: false`)
  + top-up ×4 (`areTopupCheckoutPricesConfigured` je samostatná brána).
  Dôvod, prečo na tom záleží: `checkoutAvailable` je **OR**, nie AND — po nastavení len
  troch seat cien banner zmizne, ale sekcia top-upov sa ticho nevykreslí.
- **„D2 (`bus:validate` ako CI krok) … stále otvorené"** už neplatí — zmergované v #622.

### Rozpracované / Pending
- **Stripe VERIFY ostáva na founderovi** — `bash scripts/ops/stripe-verify-prices.sh`
  s `STRIPE_SECRET_KEY`. 9/9 → krok B (env patch), akýkoľvek MISSING → krok C (STOP + GO).
- Produkčný env prečítaný znova 2026-09-21 večer: 85 premenných, päť `STRIPE_PRICE_*`,
  všetky zo starého program modelu. Seat/cockpit/top-up kľúče: **nula**. Bez zmeny.
- **Dve rozhodnutia z 2D** (`DEC-20260921-002`) čakajú: (a) blocker už task neumlčí natrvalo —
  zmena správania, nie prídavok; (b) task zaparkovaný stropom ostáva `NEEDS_FOUNDER`
  aj po uvoľnení 24 h okna, odparkuje ho founder.
- PR #630 otvorený, CI celá zelená vrátane Vercel preview.
- `bus:typecheck` v CI **nekontroluje** `.ai/bus` envelopes a `bus:validate` **nekontroluje** typy —
  sú to tri oddelené stráže, nie jedna.
- `typecheck-baseline` hlási 48 chýb oproti stropu 69; CI samo pýta zníženie stropu.
- 2E (read-only capabilities pod Policy B) nezačaté — vlastná GO brána.
- `TASK-BUS-RUNNER-2D` (#621) je adversariálny audit runnera, owner **cursor**, nie ja.

### Kľúčové súbory zmenené
- `packages/bus-core/src/execution-cap.ts`: nová policy vrstva denného stropu (bez fs/siete)
- `packages/bus-core/src/consumer.ts`: `handledTaskIds` ignoruje blockery, `reportedRefusals`
- `scripts/bus/consume.ts`: `runWatch`, `FileExecutionCounter`, SIGINT/SIGTERM
- `.github/workflows/saas-grade-pipeline.yml`: BUS job = Test + Validate envelopes + Typecheck
- `docs/reports/2026-09-21-upgrade-checkout-config-root-cause.md`: §VERIFY opravená na deväť
- `apps/crm/src/lib/credits-billing.ts`: cockpit stráž = rovnaký predikát ako UI gate

### Ďalší krok
Founder: Stripe VERIFY (deväť cien, nie päť). Bez toho sa `/upgrade` nepohne.

## Session 2026-09-21 (revenue blocker /upgrade — root cause + DEC seat model)
### Dokoncene
- Prod smoke `/upgrade` na prihlasenej session: **FAIL** — "Checkout momentalne nedostupny"
- Root cause overeny read-only: `STRIPE_PRICE_{SOLO,TEAM,OFFICE}_SEAT` a
  `STRIPE_PRICE_CREDITS_*` **neexistuju** vo Vercel `realitka-ai` (85 env, citane bez decrypt).
  Pritomne su STARTER/PRO/MARKET_VISION/PROTOCOL_AUTH = stary program model.
- Zistene, ze prod Stripe stoji na program modeli a kod na seat modeli — `CHECKOUT-ENV-01`
  a `FUNNEL-PRICING-01` su dva symptomy tej istej nedokoncenej migracie
- Novy nalez `CHECKOUT-ENV-02`: Owner Cockpit checkbox pripocitava cenu v UI
  (`upgrade/page.tsx:225-234`), ale line item sa ticho vynecha ak price ID chyba
  (`credits-billing.ts:77-82`) — vybuchlo by hned po nastaveni len troch seat premennych
- Founder GO: `DEC-20260921-001` — kanonicky je **seat model** 79/71/63 EUR na maklera
- PR #606 **MERGED** (`46a5769`), CI zelene
### Rozpracovane / Pending
- **Krok A (founder): Stripe VERIFY** — read-only curl pripraveny v reporte §VERIFY;
  overit **pat** price objektov (seat x3 + cockpit x2) proti akceptacnym kriteriam
  (7900/7100/6300 eur, recurring month, per-seat, active, live mode)
- Krok B env patch / krok C STOP+GO na vytvorenie cien — podla vysledku A
- Krok D deploy + prihlaseny smoke; krok E `/porovnanie-programov` cleanup (samostatne)
- `#369` nie je prod-verified ani v jednom smere (symptom identicky pred aj po)
- Cursor zamerne bez ulohy; `#537` (notification digest cross-tenant) drzany do zavretia revenue blockera
### Kluc subory zmenene
- `docs/reports/2026-09-21-upgrade-checkout-config-root-cause.md`: root cause + VERIFY kriteria + CHECKOUT-ENV-02
- `docs/reports/2026-09-18-upgrade-prod-smoke.md`: doplneny skutocny vysledok founder checku (FAIL)
- `memory/open-tasks.md`: CHECKOUT-ENV-01, CHECKOUT-ENV-02, FUNNEL-PRICING-01 + kroky A-E
- `memory/decisions.md`: DEC-20260921-001 (seat model kanonicky, VERIFY pred CREATE)
### Dalsi krok
Founder: spustit VERIFY curl s live Stripe klucom, poslat vystup. Podla neho krok B alebo C.
Ziadny agent nevytvara Stripe Products/Prices.

## Session 2026-09-21 (UPTM governance chain + BUS fix)
### Dokončené
- `uptm-runner` main `c9ae2aa`, 134 testov: PR #3 ústava CP+CC (P1–P14), #4 preregistrácia
  fabrication kritérií, #5 canonical `PASS/FAIL/UNKNOWN` resolver, #6 detektor (13 kontrol,
  34 acceptance cases), #7 zapojenie detektora do gate cesty
- `fabricated_market_data` / `fabricated_pnl`: `DECLARATIVE` → `PARTIAL` s dvoma zapísanými
  limitmi (`omission_bypass`, `local_consistency_only`); strop `PARTIAL`, nikdy `ENFORCED`
- Dve vlastné nadsadenia znížené po čítaní kódu: P5 a P11 `ENFORCED` → `PARTIAL`
- BUS: id/`created_at` integrity bug opravený, authority boundary ako executable invariant,
  107/107 testov (`cb1e7d8`, `47b243d`) — **nepushnuté, 403**
- Audit evidence #1: `SyntaxError` v `onlinovosk-bit-uptm` `uptm/risk.py:77` — 4 test moduly
  sa nenazbierali, teda `UNKNOWN`, nie `FAIL`
### Rozpracované / Pending
- **HUMAN:** doinštalovať Claude GitHub App pre `onlinovosk-bit/RealitkaAI` → push + PR
- **HUMAN:** BUS deploy podľa `docs/ops/bus-handshake-runbook.md` → synthetic handshake
- **HUMAN 30s:** Revolis P0 — prihlásený `/upgrade` → `checkout.stripe.com`
- Bez GO: `UPTM-002d` (omission bypass), `UPTM-002b` (CP failure reclassification), `UPTM-AUDIT`
### Kľúčové súbory zmenené
- `packages/bus-core/src/envelope.ts`: `idDateFor()` — id dátum z `created_at`, nie z hodín
- `packages/bus-core/src/http.ts`, `scripts/bus/cli.ts`: obe cesty používajú `idDateFor`
- `packages/bus-core/tests/authority-boundary.test.ts`: nový — invariant „správa je len súbor"
- `packages/bus-core/tests/envelope.test.ts`: dátumovo nezávislé guardy
### Ďalší krok
Founder: GitHub App pre RealitkaAI → push 2 commitov → PR → merge → až potom deploy BUS.
## Session 2026-09-21 (hranica autonómie zmeraná)
### Dokončené
- Overené proti GitHub API: #593 merged (`ab67567`, 2026-09-18 20:35:43Z), #594 merged (`afc6145`, 20:45:32Z) — krok „stabilizovať a mergnúť Consumer V1" je hotový
- Správa na BUS o merge #594: `bus/main` `0a2cbb6` → `17f30d4`, `.ai/bus/outbox/MSG-20260919-001-pr-594-merged.md`
- Zmeraná a zapísaná hranica autonómie (`memory/decisions.md`): obe strany vedia písať aj čítať, ani jedna sa nezobudí sama
- Rozhodnutie: hodinový monitor **nezapínať** — workaround, nie architektúra
### Rozpracované / Pending
- D1 (review #593) na SOL — post-merge review; nálezy patria do follow-up PR, nič neblokuje
- `TASK-20260918-001` visí v `.ai/bus/inbox` ako `open`, hoci consumer to vlákno už zodpovedal (`already_handled`) — neodpovedať znova, len hygiena fronty
- Pozorovanie bez overenia: `evidence.urls: "[object Object]"` v `MSG-20260918-001-d1-znovu-otvorene-...` — niekde `String(obj)` namiesto URL; zdroj nezistený
- Krok 2 (persistentný runner / poll loop) a krok 3 (SOL agent mimo ChatGPT) — obidva GO REQUIRED, neotvárať naraz
### Kľúčové súbory zmenené
- `memory/decisions.md`: zápis hranice autonómie + poradie ďalších krokov
### Ďalší krok
Bez GO nič. Krok 2 je ďalší v poradí, ale vyžaduje samostatné founder GO.

## Session 2026-09-19 → 2026-09-21 (Control Plane — CP-P0-4 merged, migrácia 20260817220000 overená)

### Dokončené
- **`GO CP-P0-4` — Control Contract. PR [#598](https://github.com/onlinovosk-bit/RealitkaAI/pull/598) zmergovaný** foundrom 2026-09-20 14:08 UTC (`09bdb74`, 28 súborov, +3 205 / −1). Prvá **implementačná** brána Control Plane; predtým boli všetky brány read-only alebo spec-only.
- **`packages/control-contract`** — nový balík, 19 sledovaných súborov (11 src modulov + 4 testovacie), **0 dependencies**, vynútené CI guardom. Mimo `apps/crm` zámerne: cron, `.ai/bus` a budúce služby musia vedieť importovať kontrakt bez CRM.
- **`ActionMetadata` registry — U-L uzavreté ako zdroj `reversible`.** 9 akcií. Dve pravidlá z neho robia nosný prvok, nie dokumentáciu: (1) akcia bez záznamu sa **nedá** autorizovať (fail-closed → `FORBIDDEN`), (2) **registry, nie volajúci, je pravda** pre `capability/reversible/externallyVisible/risk`. U-J je v ňom zapísané ako vynútiteľné pole: Resend `probable` + `retentionHours: 24`, Twilio Messages `unknown` ⇒ `deliveryGuarantee = at_least_once`.
- **`resolveAuthority` s OD-9 authority floor.** Čistá funkcia, policy ako dáta. `irreversible` → `APPROVAL_REQUIRED`, **nikdy** `FORBIDDEN`; test dokazuje, že founder approval nezvratný e-mail odomkne, a že policy podlahu nevie znížiť. OD-10 zostáva CONDITIONAL — `externallyVisibleOverride` existuje ako typ, cesta nie je implementovaná.
- **Runner so 6 fázami** (`OBSERVE → DECIDE → AUTHORIZE → ACT → REPORT OUTCOME → LEARN`). Päť terminálnych stavov; každý okrem `no_observations`/`no_decision` vyrobí `OutcomeRecord` — I-006 vynútené štrukturálne. I-007 vynútené dvakrát: `applyApproval` nezmení `FORBIDDEN`, a runner **znovu vyhodnotí autoritu tesne pred ACT**.
- **Migrovaný `followup` agent** — `apps/crm/src/lib/agents/followup/controlled.ts`, `RECOMMEND`, jediná akcia `followup.draft`, nikdy neposiela. `POST /api/followup` **nedotknuté**. Record ids sa odvodzujú z `correlationId`, nie z `runId` ⇒ retry prepočíta rovnaký idempotency key.
- **Nová CI job `Control Contract (authority + closed loop)`** — Node 22, bez ephemeral DB, s guardom na nulové dependencies. Autoritný engine je zelený nezávisle od toho, či CRM job vie naštartovať Supabase. Testy: 56 v balíku (`node --test`, bez inštalácie) + 11 vitest.
- **Suitability report (OD-8)** — `docs/reports/2026-09-19-CP-P0-4-followup-suitability.md`. Verdikt **SUITABLE so štyrmi podmienkami**.
- **`GO MIGRATION-VERIFY`** (2026-09-19) — read-only kontrola migrácie `20260817220000`. Zistené: **aplikovaná len spolovice** — `profiles.is_platform_admin` + index áno, `leads.last_contact_at` / `bri_score` / `dossier` nie, riadok v histórii chýbal, `schema_migrations` = 49.
- **`GO MIGRATION-VERIFY-2`** (2026-09-21) — po ručnom dobehnutí cez Dashboard. Výsledok nižšie.

### Opravené / korigované
1. **„Registry je pravda, nie volajúci."** §3.4 CP-SPEC bral `reversible` z `AuthorityContext`, teda **od volajúceho**. Agent, ktorý by svoj nezvratný send vyhlásil za zvratný, by prešiel popod OD-9 podlahu — celý authority engine by bol dekorácia. Oprava: `resolveAuthority` znovu prečíta registry a pri nezhode vráti `FORBIDDEN` (`context_registry_mismatch`). Pokryté testami.
2. **Root cause 240 decisions / 0 outcomes.** Doterajší zápis viedol I-006 ako porušený invariant bez príčiny. Jeden read-only SELECT na PROD ju dokázal: **240 decisions cez 48 distinct leadov = presne 5 na lead**, a **0** z tých 48 leadov nikdy nedosiahlo terminálny status. `resolveOpenDecisionsForLead` sa volá jedine z `PATCH /api/leads/[id]:150` a jedine pri terminálnom statuse. **Outcome writer nie je pokazený — nikdy nebol dosiahnuteľný.** Dva štrukturálne nálezy: agent nemá vlastný terminálny stav (F-1) a nemá idempotenciu (F-2).

### MIGRATION-VERIFY-2 — výsledok (read-only, PROD `ypgajkhqtbriqqmyawyv`)
- Migrácia **`20260817220000` je na PROD kompletná**: všetky 3 stĺpce `leads` + `profiles.is_platform_admin` + oba indexy, definície sedia. `leads.last_contact` (text, NOT NULL) nedotknuté.
- **`schema_migrations` = 50**, riadok `20260817220000` prítomný s menom `p0_schema_alters_leads_profiles`. **Táto migrácia je overená.**
- **Drift sa tým NEZATVÁRA: 50 migration rows vs 103 migration files v repe.** Táto migrácia pokryla jednu položku, nie ten rozdiel.
- 509 leadov: `last_contact_at` populated = **0**, `bri_score != 0` = **0**, `dossier` populated = **0**. Stĺpce existujú, dáta v nich nie sú.
- **Riziko `42703` je odstránené** — `lib/operator/gather.ts` už nemá na čom spadnúť.
- **Význam NULL výsledku v Operator konzumentovi je stále UNKNOWN.** `gather.ts:116` robí `.gte("last_contact_at", cutoff14d)`, čo na samých NULL vráti prázdno. Či sa to prejaví ako poctivé „unavailable" alebo ako číslo `0` (teda tvrdenie „žiadny kontakt" namiesto „nevieme"), **nebolo overené**. Nesmie byť prezentované ako potvrdený bug.
- Vedľajší efekt: týmto je zodpovedaná brána **G4** zo session wrap-upu 2026-09-20 (#600), ktorá žiadala presne toto read-only overenie.

### Rozpracované / Pending
- **CP-P0-4 acceptance #4 a #5 — persistence.** Uzavretá slučka je dokázaná v procese a v testoch (9 eventov, jeden `correlation_id`), **nie je perzistovaná**. Spine v2 stĺpce na PROD neexistujú. Zápis control eventov do dnešného `platform_events` bez v2 stĺpcov by vyrobil ten tichý-v1 stav, na ktorý existuje I-014.
- **U-J — Twilio idempotency.** Otvorené. `Idempotency-Key` je doložená pre Conversations Orchestrator a Monitor Alarms, **nie pre Messages create**, ktoré Revolis reálne volá. Dovtedy SMS/WhatsApp = at-least-once. *(U-K je RESOLVED produkčným precedensom `public.spend_credits`. U-L je RESOLVED a vedené ako **P1**, nie otvorený P0.)*
- **U-M** — prečo follow-up cron spravil presne 5 behov a 25. 6. prestal. Vyžaduje Vercel cron históriu, nedostupnú z agentskej session.
- **U-N** — či tých 48 leadov malo dosiahnuť terminálny status. Interpretácia klientskych dát, mimo architektonickej kontroly.
- **Migration drift 50 / 103.** Schéma sa mení mimo histórie, takže `schema_migrations` nie je spoľahlivý zdroj pravdy o PROD schéme.
- **F-3 až F-6 zo suitability reportu.** F-3 `estimatePrediction` vracia literály (0.22/0.18, 420/310, 0.62/0.55) — prenesené nezmenené s provenance, nie vylepšené. F-4 `POST /api/followup` je jednotenantný konštantou (`FOLLOWUP_AGENCY_ID = DEMO_AGENCY_ID`). F-5 `buildDraftBody` má meno referenčného klienta natvrdo v každom drafte pre každého tenanta (multi-tenancy bug + Stealth Mode). F-6 `capabilities/_shared/audit-log.ts` je druhá in-memory diera po I-008.
- **`last_contact_at` zostáva prázdny** (0 / 509).
- **Interpretácia prázdneho `last_contact_at` v Operatore = UNKNOWN**, viď vyššie.

### Kľúčové súbory zmenené
- `packages/control-contract/**`: nový balík — kontrakt, registry, authority engine, runner, 4 testovacie súbory
- `apps/crm/src/lib/agents/followup/controlled.ts`: migrovaný agent (RECOMMEND, `followup.draft`)
- `apps/crm/src/lib/control-plane/run-context.ts`: platformová továreň na `RunContext` (agent si ju nesmie vyrobiť sám)
- `apps/crm/src/lib/agents/followup/__tests__/controlled.test.ts`: dôkaz uzavretej slučky, I-011/I-012/I-009
- `.github/workflows/saas-grade-pipeline.yml`: nová job `Control Contract (authority + closed loop)`
- `apps/crm/tsconfig.json`, `apps/crm/vitest.config.js`: alias `@revolis/control-contract`
- `docs/reports/2026-09-19-CP-P0-4-followup-suitability.md`: read-only suitability check + root cause 240/0
- `memory/decisions.md`: záznam CP-P0-4

### Ďalší krok
**`GO CP-P0-1A`** (Safe Spine Foundation) — primárna ďalšia brána. Bez nej sa acceptance #4/#5 nedajú dokončiť. Pred implementáciou treba presne vyriešiť, čo durable persistence znamená, lebo práve to blokuje event-spine A. Rozsah: A1 kanonická v2 schéma · A2 `scope` diskriminátor · A3 tenant isolation · A4 correlation/causation/run sémantika · A5 idempotency · A6 versioning · A7 invariant enforcement · A8 migration ownership. **Žiadny produkčný PII backfill** — to je CP-P0-1C.
`CP-P0-2` (durable approvals) zostáva ako **alternatívny následný** gate — nie je vykonaný ani aktuálny a neotvára sa súbežne, aby nevznikli dve meniace sa P0 osi naraz.

## Session 2026-08-25
### Dokončené
- Critical bug hunt (correctness): 4 HIGH/CRITICAL — `docs/reports/2026-08-25-critical-bug-hunt.md`
- Critical AUTH hunt: 3 HIGH — HubSpot/analyze null-agency admin IDOR; cron `Bearer undefined` fail-open — `docs/reports/2026-08-25-critical-auth-bug-hunt.md`
### Rozpracované / Pending
- `GO FIX-HUBSPOT-ANALYZE-TENANT-GATE` — require caller agency before admin sync/persist
- `GO FIX-CRON-SECRET-FAIL-CLOSED` — `if (!cronSecret)` on fail-open cron/admin routes
- `GO FIX-CHECKOUT-AGENCY-ID` — refuse seat/top-up when `agency_id` null
- Grant ledger orphan / gmail 25-cap / matching 500-cap (sibling report)
### Kľúčové súbory zmenené
- `docs/reports/2026-08-25-critical-auth-bug-hunt.md`: auth/tenant hunt
- `docs/reports/2026-08-25-critical-bug-hunt.md`: correctness hunt (prior commit)
### Ďalší krok
Founder `GO FIX-HUBSPOT-ANALYZE-TENANT-GATE` (1 PR); do not bundle cron fail-closed.

## Session 2026-08-24
## Session 2026-09-16 (critical bug hunt — sales-funnel admin gate)
### Dokončené
- HIGH: sales-funnel update-status + page lacked platform-admin gate → fix + tests + report
- MEMORIES: removed merged #559; remaining open tracked PRs unchanged
### Rozpracované / Pending
- Founder merge sales-funnel platform-admin PR
- Residual: saas_leads RLS still open at DB layer
- Noted (not fixed): team/users INSERT RLS hole; management SSR unscoped lists
### Kľúčové súbory zmenené
- `apps/crm/src/app/api/sales-funnel/update-status/route.ts`: requirePlatformAdmin
- `apps/crm/src/app/(dashboard)/sales-funnel/page.tsx`: notFound for non-admins
- `apps/crm/src/lib/sales-funnel-store.ts`: scoped listSaasLeads/getSalesFunnelData
### Ďalší krok
Founder: review/merge sales-funnel admin gate; next candidate team/users INSERT or saas_leads RLS (GO).
## Session 2026-09-18 (/upgrade Stripe revenue-blocker)

### Dokončené
- #369 rebasnuté na main + squash merge → `30a1ba906` (`data.result?.url` + `d.seatCheckoutAvailable`)
- #586 docs prod-smoke evidence → `ed45d5188` na main
- Vercel `realitka-ai` Ready pre merge SHA; anon `GET /upgrade` → 307 `/login` (očakávané)

### Rozpracované / Pending
- **Jediné otvorené:** human 30s — prihlásený klik `/upgrade` → `checkout.stripe.com` (agent nemá prod session)
- Ak PASS → uzavrieť `docs/reports/2026-09-18-upgrade-prod-smoke.md` ako PASS; ak FAIL → druhý nález pod tým istým CTA

### Kľúčové súbory
- `apps/crm/src/app/(dashboard)/upgrade/page.tsx` — okResponse consumer fix
- `apps/crm/tests/verification/billing-credits.verification.test.ts` — flattened contract lock
- `docs/reports/2026-09-18-upgrade-checkout-okresponse-fix.md`
- `docs/reports/2026-09-18-upgrade-prod-smoke.md`

### Ďalší krok
Founder: prihlás sa na app.revolis.ai → `/upgrade` → „Pokračovať do Stripe“.
## Session 2026-09-18c (critical bug hunt — assign-lead agency)
### Dokončené
- HIGH: assignLeadToProfile cross-tenant profileId stamp → fix + tests + PR #596
- MEMORIES cleanup: deleted merged #369 #537; recorded #596
- Report: `docs/reports/2026-09-18-assign-lead-cross-tenant.md`
### Rozpracované / Pending
- Review/merge #596; open stack still awaiting: #370 #443 #444 #447 #462 #486 #490 #495 #545 #563 #582
### Kľúčové súbory zmenené
- `apps/crm/src/lib/team-store.ts`: same-agency gate on assignLeadToProfile
- `apps/crm/src/lib/__tests__/assign-lead-same-agency.test.ts`: unit coverage
- `apps/crm/tests/verification/assign-lead-same-agency.verification.test.ts`: live-spec
### Ďalší krok
Founder: review/merge #596; next candidate matching recalculate wipe (#444) or HubSpot fail-open (#486).
## Session 2026-09-18c (Founder Control Plane — päť read-only brán, PR #585 merged)

### Dokončené
- **Brána 1 — konfrontácia tézy s repom.** `docs/architecture/founder-control-plane-v1-repo-confrontation.md`. Ústava dala **dva verdikty, nie jeden**: Control Plane ako produktová plocha = 4/12 + veto Q8 (príliš skoro) + veto Q1 (klient nezaplatí) → **STRATEGIC BACKLOG** (ADR-004 prah „Center: 5 platiacich"; dnes 1). Control Plane substrát → **BUILD**, rezaný na 4 kusy.
- **Brána 2 — `GO CP-EVIDENCE`.** `docs/reports/2026-09-18-CP-EVIDENCE-REPORT.md`. Read-only PROD audit (`ypgajkhqtbriqqmyawyv`, 08:58–09:05 UTC). Uzavrel P0 otvorené od 17. 8.: **`leads.last_contact_at` na PROD NEEXISTUJE** (len `last_contact` text) → `lib/operator/gather.ts` dá 42703. Ďalej: `lead_events` = 0 riadkov · `decisions` 240 / `exclusivity_outcomes` 0 · migrácia `20260728140000` nie je v `schema_migrations` (49 history riadkov vs 102 súborov v repe).
- **Brána 3 — `GO U1`.** `docs/reports/2026-09-18-U1-lead-events-write-path-report.md`. Root cause **PROVEN** (nižšie).
- **Brána 4 — `GO CP-SPEC` + `GO CP-SPEC-HARDEN`.** `docs/architecture/founder-control-plane-cp-spec-v1.md`, v1.1, `status: hardened-draft`, 1 299 riadkov. Desať rozhodnutí D-01..D-10, FINAL INVARIANT REGISTER I-001..I-015, 27 adversariálnych testov, dvojosová GO matica.
- **Brána 5 — `GO PROVIDER-IDEMPOTENCY-EVIDENCE` + `RPC-TRANSACTION-EVIDENCE` + `REVERSIBILITY-EVIDENCE`.** `docs/reports/2026-09-18-U-JKL-evidence-report.md`.
- **PR [#585](https://github.com/onlinovosk-bit/RealitkaAI/pull/585) zmergovaný** foundrom. Po ceste: merge konflikt v `memory/decisions.md` (append-only log, zachované obe strany), jeden CI beh spadol na externý GitHub API rate limit pri `supabase/setup-cli@v1` `version: latest` (re-run na tom istom commite prešiel), jeden push nedostal `pull_request` event a CI sa spustilo ručne cez `workflow_dispatch`.

### Tri vyvrátené / korigované tvrdenia (CP-EVIDENCE vs konfrontácia)
1. **`ai_action_audit` nemá cost stĺpce.** Tvrdenie pochádzalo z kódu (`lib/ai-action-audit.ts:83`), nie zo schémy. Na PROD `cost_eur`, `credits_spent`, `model`, `latency_ms` neexistujú.
2. **cost → outcome nie je „jeden view".** 0/146 riadkov má cost (ani v stĺpci, ani v `meta`), 0/146 má `lead_id` (`lib/ai/persist-cost-telemetry.ts:66` píše `null` natvrdo), `lead_conversions` na PROD neexistuje, `deal_outcomes` = 1 riadok.
3. **`public.events` = 0 riadkov.** Reálny produkčný spine je `platform_events` — 1 417 riadkov, 2026-04-12 → 2026-09-15, **100 % vyplnené `agency_id`**.

*(Štvrtá korekcia prišla až v U1 a týka sa CP-EVIDENCE: `platform_events.payload` **obsahuje osobné údaje** — trigger zapisuje `'name', new.name`. Predchádzajúci záver „PII neobsahuje" bol nesprávny.)*

### PROVEN root cause — `lead_events` = 0
`lead_events` sa v produkcii nezapisuje, pretože v `apps/crm/src` **neexistuje produkčný caller/writer** pre `POST /api/ai/lead-events` a endpoint je navyše **Enterprise-gated** (`isEnterpriseSalesIntelligenceEnabled()` → 403; žiadna zo 6 agentúr na PROD nemá plán `enterprise`). Produkčné eventy namiesto toho vznikajú **cez DB trigger** `trg_leads_platform_events` → `emit_platform_event()` → `platform_events`.

Vylúčené samostatným meraním: RLS (`with_check` insert povoľuje) · schema (PROD == migrácia `20260418`, žiadny drift) · tiché zlyhanie (route vracia 400/403) · zápis inam. Nezávislé potvrdenie: celý Enterprise klaster prázdny (`lead_events`, `lead_scores`, `client_dna`, `deal_moments`, `ai_recommendations` = 0 riadkov každá).

Vedľajší nález: trigger ani `emit_platform_event` **nie sú v žiadnej repo migrácii** — repo to priznáva v `20260509000000_rls_lead_scores.sql:9`.

### Dve opravené chyby v CP-SPEC (hardening v1.0 → v1.1)
1. **Nezvratnosť ≠ `FORBIDDEN`.** v1.0 mapovalo `risk = irreversible` na `FORBIDDEN`, čo podľa I-007 znamená „ani s ľudským schválením" — agent by teda nikdy nesmel odoslať e-mail. Oprava: nezvratnosť je **minimálna podlaha autority = `APPROVAL_REQUIRED`**, ktorú policy nesmie znížiť; `FORBIDDEN` je výhradne explicitný DENY_LIST. Zapísané ako **OD-9**.
2. **Kanonický počet stĺpcov.** v1.0 uvádzalo „ADD COLUMN × 8" proti 11 stĺpcom v cieľovej schéme. Opravené novou kanonickou tabuľkou §4.2.1: **v1 = 5 + v2 = 12 → spolu 17**.

### Tri neznáme otvorené hardeningom a ich stav po evidence reporte
Prevzaté presne z `docs/reports/2026-09-18-U-JKL-evidence-report.md`.

| Neznáma | Priorita pri otvorení (CP-SPEC §14) | Stav po evidence reporte |
|---|---|---|
| **U-J** Resend idempotency | P0 | **PROBABLE — nie RESOLVED** (primárny zdroj nedostupný) |
| **U-J** Twilio idempotency | P0 | **UNKNOWN — REQUIRES VERIFICATION** |
| **U-K** RPC transakčná atomicita | P0 | **RESOLVED** — dokázané produkčným precedensom |
| **U-L** zdroj `reversible` | **P1** (nie P0) | **RESOLVED ako neexistujúci** — registry treba vytvoriť |

- **U-J:** egress proxy blokovala `resend.com`, `www.twilio.com`, `cdn.jsdelivr.net` aj `docs.postgrest.org`; `node_modules` nebolo nainštalované. Podľa AP-005 preto nevyhlásené RESOLVED. Twilio `Idempotency-Key` je doložená pre Conversations Orchestrator a Monitor Alarms, **nie pre Messages create**, ktoré repo reálne volá → SMS/WhatsApp = **at-least-once**. Resend drží kľúč **24 h**, čo je kratšie než životnosť nášho deterministického `idempotencyKey`.
- **U-K:** `public.spend_credits` (plpgsql, SECURITY DEFINER, cez `supabase.rpc()`) robí v jednom volaní idempotency check → `SELECT ... FOR UPDATE` → 2× INSERT do `credit_ledger` → UPDATE `agencies`. Spravuje peniaze; navrhované `T1` teda nie je nový vzor.
- **U-L:** grep na `reversible|irreversible|nezvratn|undoable|can_undo` naprieč `apps/crm/src` = **0 zásahov v kóde**. Návrh: `ActionMetadata` registry v `packages/control-contract`.

### Rozpracované / Pending
- **`CP-P0-4` Control Contract** — GO možné, čaká na explicitný founder GO. Súčasťou je `ActionMetadata` registry (U-L).
- **`CP-P0-2` Durable Approvals** — GO možné; rieši dnes porušený I-008.
- **`CP-P0-1` rozdelené na A/B/C** (OD-4 + founder rozhodnutie): **A** Safe Spine Foundation (GO možné) · **B** Event Production (blokované U-A/U-B/U-C/U-D) · **C** Historical/Legacy Migration vrátane `PII-SCRUB-BACKFILL` (nezvratné, NO-GO).
- **OD-10 CONDITIONAL** na U-J/U-K/U-L — blokuje len override cestu, nie default `APPROVAL_REQUIRED`.
- **Tri invarianty sú dnes porušené:** I-006 (240 decisions / 0 outcomes) · I-008 (approvals v `new Map()`) · I-011 (1 417 riadkov s menami v payloade).
- **Migrácia `20260817220000`** (#437, PREP ONLY) pridáva `leads.last_contact_at`, `bri_score`, `dossier`, `profiles.is_platform_admin`. Merané 20:51 UTC: **na PROD stále neaplikovaná**, history row chýba, `schema_migrations` = 49. Founder ju aplikuje cez Dashboard SQL Editor.
- **Vercel deployment rate limit** (`api-deployments-free-per-day`, >100/deň) — preview deploymenty nefungujú ~24 h od 18. 9. 20:11 UTC. Nesúvisí s kódom.
- **`GO CI-PIN-SUPABASE`** — patch na pripnutie verzie `supabase/setup-cli` navrhnutý, nepushnutý; samostatný PR.

### Kľúčové súbory zmenené
- `docs/architecture/founder-control-plane-v1-repo-confrontation.md`: nový — konfrontácia tézy s repom, [EXISTING]/[DESIGNED]/[TARGET]
- `docs/reports/2026-09-18-CP-EVIDENCE-REPORT.md`: nový — read-only PROD audit, tri opravy konfrontácie
- `docs/reports/2026-09-18-U1-lead-events-write-path-report.md`: nový — PROVEN root cause `lead_events` = 0
- `docs/architecture/founder-control-plane-cp-spec-v1.md`: nový — CP-SPEC v1.1 hardened-draft
- `docs/reports/2026-09-18-U-JKL-evidence-report.md`: nový — U-J/U-K/U-L evidence
- `memory/decisions.md`: +6 záznamov vrátane OD-1..OD-10 a rozdelenia CP-P0-1 na A/B/C

### Ďalší krok
**`GO CP-P0-4`** — Control Contract. Poradie v rámci brány: `ActionMetadata` registry → `resolveAuthority` + testy → typy kontraktu → read-only suitability check na `lib/agents/followup` → migrovaný agent ako dôkaz uzavretej slučky (Definition of Done, OD-8).

## Session 2026-09-18b (D1 = GO — dogfood transport rozhodnutý)
### Dokončené
- #589 merged: bus-core (v1 envelope, digest, file + GitHub store, HTTP handler) + CLI + `serve.ts` + OpenAPI
- #590 merged: `scripts/bus/handshake.ts` (BUS-001 transport / BUS-002 return path / BUS-003 founder gate) + `docs/ops/bus-handshake-runbook.md`
- Founder D1 = **GO**: Cloudflare Tunnel ako dogfood/validation transport, **nie** produkčná infra; A/B/C (tunel → stabilný host → robustnejšia infra) — C sa dnes nerozhoduje
- BUS-003 adversariálne: `GO REQUIRED` prežije `ack` (vrátane pokusu prepašovať `gate: AUTO-SAFE` v ack tele); žiadna approve/execute/merge route neexistuje
### Rozpracované / Pending
- **Founder-side runbook (kroky 1–7)** — token, PAT, `bus/main`, `bus:serve` (over `store: github`), `cloudflared`, `bus:handshake --url`
- `GitHubBusStore` neoverený proti reálnemu GitHub API — 401 z cloud kontajnera nie je dôkaz ani jedným smerom
- Custom GPT Action až po tom, ako prejde `BUS → GitHub`
- D2 (`bus:validate` ako CI krok) a D3 (migrácia pre-v1 správ, odporúčanie: nie) stále otvorené
### Kľúčové súbory zmenené
- `memory/decisions.md`: zápis D1 = GO + otvorený risk GitHubBusStore + token pravidlá
### Ďalší krok
Founder spustí runbook na svojom stroji. Ak `GitHub write failed` → konkrétny technický problém na opravu. Ak prejde → Custom GPT Action. Founder-free komunikácia zatiaľ **nedokázaná**.

## Session 2026-09-18 (Inter-Agent Bus — transportná vrstva v1)
### Dokončené
- `packages/bus-core/` — v1 envelope + YAML podmnožina + validácia (vrátane detekcie credentials), digest, FileBusStore, GitHubBusStore, HTTP handler. 0 runtime závislostí, beží na natívnom Node type-strippingu.
- `scripts/bus/cli.ts` — `npm run bus -- send|pull|read|digest|ack|validate`; dogfood: výsledok tejto session je v `.ai/bus/outbox/MSG-20260918-001-bus-transport-v1.md`
- `scripts/bus/serve.ts` — standalone HTTP server (node:http), fail-closed bez `REVOLIS_BUS_TOKEN`
- `docs/prompts/revolis-bus-openapi.yaml` — schéma pre ChatGPT Custom GPT Action
- ADR + decisions.md zápis; `.ai/bus/README.md` a `message.schema.md` povýšené na v1
- Testy: `npm run bus:test` 61/61 (vrátane regresie nad reálnymi `.ai/bus` súbormi a reálneho HTTP round-tripu); `npm run bus:validate` 0 errors
### Rozpracované / Pending
- **D1 (blokuje odstránenie copy-paste):** kde beží HTTP transport — tunel / samostatný host / mount v `apps/crm`; + vydať `REVOLIS_BUS_TOKEN`
- D2: `bus:validate` ako povinný CI krok na PR
- D3: migrácia 35 pre-v1 správ (odporúčanie: nie)
### Kľúčové súbory zmenené
- `packages/bus-core/src/{types,yaml,envelope,digest,store,github-store,http}.ts`: nový transport
- `scripts/bus/{cli,serve}.ts`: CLI + HTTP entrypoint
- `docs/architecture/adr-2026-09-18-inter-agent-bus-transport-v1.md`: rozhodnutie, scope, bezpečnostný model, meranie
- `package.json`: `bus`, `bus:serve`, `bus:validate`, `bus:test`
### Ďalší krok
Founder rozhodne D1 a vydá `REVOLIS_BUS_TOKEN` — dovtedy bus funguje len lokálne (CLI) a ChatGPT sa naň nedostane.

## Session 2026-09-14 (ADR Soft Factory V1 Minimum)
### Dokončené
- Ingest founder ADR z Downloads → `docs/architecture/adr-2026-09-11b-software-factory-v1-minimum.md`
- Kontrolór check vs `origin/main` @ `97655763b`: TASK-0008 schema gap overený; expectedFileHash/BUS-004 hash dôkaz na tip main neoverený
- Report: `docs/reports/2026-09-14-adr-software-factory-v1-minimum.md`
### Rozpracované / Pending
- Founder GO na rozhodnutia #1 (V1 Minimum) a #4 (Judge = spúšťač kontrol); potom schema `acceptance`+`budget` + runner + ledger
- Dohľadať artefakt BUS-004 / expectedFileHash hardening (nie na tip main)
### Kľúčové súbory zmenené
- `docs/architecture/adr-2026-09-11b-software-factory-v1-minimum.md`: NÁVRH V1 Minimum
- `docs/reports/2026-09-14-adr-software-factory-v1-minimum.md`: ingest + verification
### Ďalší krok
Founder merge spec PR; paging len po `GO SEARCH-PAGING`; AC/pricing runtime až po vlastných GO frázach.
Founder: rozhodni #1 a #4 (V1 Minimum + Judge-as-runner). Bez GO neimplementovať.
## Session 2026-08-18

### Dokončené
- Kontrolor review PR #439: found remaining unknown-commit retry duplicate risk.
- Follow-up branch `cursor/acquire-email-idempotency-dabc`: deterministic `leads.id` from acquire dedup key.
- Report: `docs/reports/2026-08-18-acquire-email-idempotency-followup.md`

### Rozpracované / Pending
- Verify/push/open PR for `cursor/acquire-email-idempotency-dabc`.
- Open critical-bug PRs awaiting review: #369, #370, #371, #374, #392, #401, #427, #438, #439
- Stage 1 acquisition — only on explicit founder GO

### Kľúčové súbory zmenené
- `apps/crm/src/app/api/acquire/email/route.ts`: deterministic lead id + existing-lead response on primary-key retry.
- `apps/crm/src/app/api/acquire/email/__tests__/route.test.ts`: unknown commit retry test.
- `apps/crm/tests/verification/acquire-email-gateway.verification.test.ts`: live-spec for deterministic idempotency.

### Ďalší krok
Run targeted tests, push branch, open draft PR. Do not merge #439 without idempotency follow-up.
## Session 2026-09-15 (critical bug hunt — match status scoped)
### Dokončené
- #510 / #511 merged (roadmap overlay + Launch Pack V0 docs)
- Mapper-depth amendment: `mapTransaction` P0, zlé 13/14, PREDANÉ v title, governance riadky≠správnosť
### Rozpracované / Pending
- Founder: vyžiadať Realvia číselník (category + transaction)
- Mapper P0 + backfill — samostatné GO (nie teraz)
- Launch Pack implement — až po mapper P0 + `GO IMPLEMENT…`
### Kľúčové súbory zmenené
- `docs/reports/2026-09-03-realvia-mapper-depth-amendment.md`
- `docs/reports/2026-09-03-property-launch-pack-integration.md` (doplnené)
### Ďalší krok
Oficiálny číselník od Realvie; žiadny GO IMPLEMENT Launch Pack.
- HIGH: match status PATCH cookie-less write drop → fix + tests + PR
- Report: `docs/reports/2026-09-15-match-status-scoped-client.md`
### Rozpracované / Pending
- Founder merge fix/match-status-scoped-client
- Noted (not fixed): team/users INSERT RLS hole; /management SSR unscoped lists
- Tracked open bug PRs still awaiting review (#369 #370 #443 #444 #447 #462 #486 #490 #495 #537 #545 #548)
### Kľúčové súbory
- `apps/crm/src/lib/matching-store.ts`: scoped arg on updateLeadPropertyMatchStatus
- `apps/crm/src/app/api/leads/[id]/matches/[matchId]/route.ts`: thread client + fail-closed agency
- `apps/crm/src/lib/leads-store.ts`: addLeadActivity scoped forward
### Ďalší krok
Founder: review/merge match-status PR; next candidate team/users INSERT path (GO).

﻿## Session 2026-09-15 (north-star W2 measurement amendments)
### Dokončené
- Founder GO `north-star-backfill-nalezy.md` → `docs/reports/2026-09-15-north-star-backfill-nalezy.md`
- SQL: `leads_new_real` / `leads_new_seed` v `scripts/sql/north-star-day.sql` + founder_batch `queries-to-run.sql`
- `docs/ops/config-changelog.md` (FOUNDER_EMAILS ~2026-09-10); schéma + atribúcia v START-HERE
- Metrics jsonl: `config_changes_that_day` na 2026-09-10; `lead_split=pending_founder_batch_re_run` (bez vymyslených per-day real/seed)
- Push na otvorené PR #558
### Rozpracované / Pending
- Founder re-batch `queries-to-run.sql` → nový `results.json` → jsonl s `lead.new_real` / `new_seed`
- Founder merge #558 (NEMERGE agentom)
### Kľúčové súbory
- `docs/reports/2026-09-15-north-star-backfill-nalezy.md`
- `docs/ops/config-changelog.md`
- `scripts/sql/north-star-day.sql`
- `.ai/bus/metrics/north-star-2026-0{8,9}.jsonl`
### Ďalší krok
Founder: spustiť aktualizovaný founder_batch SQL (SELECT) a uložiť results; potom GO na rebuild jsonl.
## Session 2026-09-15 (north-star W2 COMPLETE)
### Dokončené
- LOOP+W2: 31 dní metrics (2026-08-17..09-16), founder_batch results
- Judge ACCEPT TASK-NS-001 `RUN-20260915185203-TASK-NS-001`
- PR #558 docs/metrics north-star backfill (NEMERGE bez founder GO)
- QUALIFICATION/INTENT/OUTREACH/VIEWINGS/CLOSED_WON = nula každý deň (dôkaz v report)
### Rozpracované / Pending
- Founder merge #558
- Typecheck paydown loop stále NOT_LAUNCHED (oddelený balík)
### Kľúčové súbory
- `.ai/bus/metrics/north-star-2026-0{8,9}.jsonl`
- `docs/reports/2026-09-15-north-star-backfill.md`
### Ďalší krok
Founder: merge #558; potom rozhodnúť o typecheck paydown launch.
## Session 2026-09-15 (typecheck paydown package PREPARED)
### Dokončené
- Balík `docs/overnight/2026-09-16-typecheck-paydown-loop/` nainštalovaný; PR #556
- Hard gate: #554+#555 merged on main; launch-record NOT_LAUNCHED
### Rozpracované / Pending
- Founder podpis launch-record → LAUNCH_AUTHORIZED → W0
### Ďalší krok
Founder: vyplň start_at/deadline_at/runner + podpis; potom GO na W0.
## Session 2026-09-14 (CI billing local evidence)
### DokonÄŤenĂ©
- LokĂˇlny nĂˇhradnĂ˝ dĂ´kaz za zablokovanĂ© GitHub Actions (billing lock) pre #548/#549/#550
- Report: `docs/reports/2026-09-14-ci-billing-local-evidence.md`
- Code Contract + Memory Engine PASS lokĂˇlne; Lint/test/build ÄŤiastoÄŤne (RLS/build neoverenĂ© v sandboxe)
### RozpracovanĂ© / Pending
- Org owner: odomknĂşĹĄ GitHub billing, potom re-run CI
- Merge #548/#549/#550 aĹľ po zelenom CI alebo explicitnom GO s tĂ˝mto dĂ´kazom
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `docs/reports/2026-09-14-ci-billing-local-evidence.md`: nĂˇhradnĂ˝ dĂ´kaz
### ÄŽalĹˇĂ­ krok
Founder: fix GitHub billing â†’ re-run CI â†’ merge HIGH fix PR.

---

## Session 2026-09-05 (Ruflo overnight â€” branch docs/ruflo-overnight-prepared)
### DokonÄŤenĂ©
- Overnight package + research run on this branch: PREPARED â†’ run 20260905T2304 â†’ **VALIDATE_FIRST / NO_GO_IMPLEMENTATION**
- Package: docs/overnight/2026-09-05-ruflo-swarm/
- Reports under docs/reports/ and output/overnight/ artifacts on this branch
### RozpracovanĂ© / Pending
- Founder review of overnight handoff / PR #536 after rebase onto current main
- No implementation from overnight recommendations without separate GO
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- docs/overnight/2026-09-05-ruflo-swarm/*
- overnight reports / amendments on this docs branch
### ÄŽalĹˇĂ­ krok
Founder review PR #536; do not treat research as implementation authorization.

---

## Session 2026-09-06 (Inter-Agent Bus v1.0)
### DokonÄŤenĂ©
- REVOLIS Inter-Agent Bus v1.0 vytvorenĂ˝ ako Phase 1 copy-paste protocol pre GPT/SOL â†” Claude Code.
- Scope zĂˇmerne docs-only: STACK 0/2/3/4/7 + Execution Result + Decision Artifact; bez message store/MCP/orchestratora.
- Founder review GO 9/10 zapracovanĂ˝: role boundary Founder â†’ SOL/GPT â†’ Bus â†’ Claude Code â†’ Result/Evidence â†’ SOL â†’ Founder, Evolution Rule a friction log.
- Report: `docs/reports/2026-09-06-revolis-inter-agent-bus-v1.md`
### RozpracovanĂ© / Pending
- Real Handoff #1 ÄŤakĂˇ na konkrĂ©tnu engineering Ăşlohu; Phase 2 automatizĂˇcia ostĂˇva blokovanĂˇ pred 3 reĂˇlnymi pouĹľitiami.
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `docs/prompts/revolis-inter-agent-bus-v1.md`: copy-paste-ready master prompt pre SOL/GPT a Claude Code + ĹˇablĂłny.
- `docs/reports/2026-09-06-revolis-inter-agent-bus-v1.md`: rozhodnutie, scope, overenie, rizikĂˇ.
- `memory/decisions.md`: decision memory + Engineering justification pre novĂ˝ governance prompt.
### ÄŽalĹˇĂ­ krok
PouĹľiĹĄ `docs/prompts/revolis-inter-agent-bus-v1.md` ako povinnĂ˝ formĂˇt pri najbliĹľĹˇom konkrĂ©tnom engineering handoffe a vyplniĹĄ friction log; neautomatizovaĹĄ Phase 2 pred 3 reĂˇlnymi pouĹľitiami.

---

## Session 2026-09-06 (PR #473 CI)
### DokonÄŤenĂ©
- #471 MERGED. RovnakĂ˝ 42501 fail na #473 (docs operator audit, stale main)
- Merge `origin/main` (`a8929c9a`) do `cursor/operator-dashboard-audit-db1f`
- Report: `docs/reports/2026-09-06-pr473-ci-fix.md`
### RozpracovanĂ© / Pending
- Founder merge #473 â€” agent nemerguje
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `docs/reports/2026-09-06-pr473-ci-fix.md`: 42501 + merge main + CI PASS
### ÄŽalĹˇĂ­ krok
Founder merge #473.

---

## Session 2026-09-06 (PR #471 CI)
### DokonÄŤenĂ©
- CI `Lint, test, build` na #471: FAIL v `valuation-tenants-rls.test.ts` (42501 vs null) â€” docs PR, oprava uĹľ na main `#489`/`a4f58ff1`
- Merge `origin/main` do vetvy; neskĂ´r **MERGED** ako #471
- Report: `docs/reports/2026-09-06-pr471-ci-fix.md`
### RozpracovanĂ© / Pending
- niÄŤ
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `docs/reports/2026-09-06-pr471-ci-fix.md`: koreĹ 42501 + merge main + CI PASS
### ÄŽalĹˇĂ­ krok
#473 CI.

---

## Session 2026-09-06
### DokonÄŤenĂ©
- InternĂ˝ Smolko CRM chatbot MVP pridanĂ˝ do `/revolis-ai`: tenant-scoped otĂˇzky
  "komu volaĹĄ", "ÄŤo zachrĂˇniĹĄ", "ÄŤo vybaviĹĄ" bez externĂ©ho LLM.
- API: `POST /api/ai/smolko-chat` pouĹľĂ­va existujĂşce `listLeads` + `listTasks`,
  `validateBody` a telemetry `ai_chatbot_queries`.
- CI fix: API contract ratchet NOVĂ‰=0; `/api/ai/smolko-chat` doplnenĂ˝ do
  `REVOLIS_AI_FEATURE_REGISTRY`.
- OverenĂ©: targeted chatbot/registry tests 18/18, chatbot unit + verification
  6/6, `npm run lint`, `npm run build`.
- Report: `docs/reports/2026-09-06-smolko-crm-chatbot-mvp.md`
- ZodpovedanĂ˝ stav poĹľiadavky p. Smolka na chatbota: verejnĂ˝ chatbot / Website Concierge je zachytenĂ˝, ale blokovanĂ˝ cez SMO-B04 aĹľ SMO-B09.
- OverenĂ© `npx vitest run tests/verification/property-launch-pack-v0.verification.test.ts` â€” 5/5 PASS pre najbliĹľĹˇĂ­ Smolko Launch Pack povrch.
- Report: `docs/reports/2026-09-06-smolko-chatbot-status.md`
### RozpracovanĂ© / Pending
- VerejnĂ˝ Website Concierge stĂˇle nie je povolenĂ˝: SMO-B04â€“B09 ostĂˇvajĂş brĂˇny.
- `SMO-B04`: PROD cross-tenant negative test + active/freshness contract pred Concierge preview.
- `SMO-B05`: AI disclosure, privacy/retention text, schvĂˇlenĂ© FAQ a human fallback.
- `SMO-B06`: routing matrix + 10 E2E callbackov.
- `SMO-B07`â€“`SMO-B09`: booking storage drift RCA, Google Calendar OAuth/free-busy, idempotency/notifikĂˇcie.
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `apps/crm/src/lib/smolko-chatbot.ts`: deterministic CRM assistant engine.
- `apps/crm/src/app/api/ai/smolko-chat/route.ts`: authenticated tenant-scoped chat endpoint.
- `apps/crm/src/components/revolis/SmolkoChatbotPanel.tsx`: dashboard chat UI.
- `apps/crm/src/app/(dashboard)/revolis-ai/RevolisAIClient.tsx`: embeds chat panel.
- `apps/crm/src/lib/usage-metrics.ts`: adds `ai_chatbot_queries` usage metric type.
- `apps/crm/src/lib/__tests__/revolis-ai-features.test.ts`: registers `/api/ai/smolko-chat`.
- `apps/crm/src/lib/__tests__/smolko-chatbot.test.ts`: unit coverage.
- `apps/crm/tests/verification/smolko-chatbot.verification.test.ts`: live spec guard.
- `docs/reports/2026-09-06-smolko-crm-chatbot-mvp.md`: implementation report.
- `docs/reports/2026-09-06-smolko-chatbot-status.md`: stav chatbot poĹľiadavky a blokĂˇtorov.
- `memory/session-summary.md`: aktuĂˇlny handoff.
### ÄŽalĹˇĂ­ krok
Founder/Product GO na `SMO-B04` PROD negative test pre verejnĂ˝ Website Concierge;
bez DB/OAuth/booking mutĂˇciĂ­.

---

## Session 2026-09-05 (PR #535 fix-merge-conflicts â€” CI CLEAN)
### DokonÄŤenĂ©
- origin/main merge (clean; 0 textual conflicts)
- onboarding/session api-validate + usage-metrics imports â†’ ratchet NOVĂ‰=0
- CI green + mergeStateStatus CLEAN on tip `f74ada73` (agent did not merge)
- Report: `docs/reports/2026-09-05-pr535-fix-merge-conflicts.md`
### RozpracovanĂ© / Pending
- Founder merge #535
- PROD smoke notification-digest
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `apps/crm/src/app/api/onboarding/session/route.ts`: contract imports only
- `docs/reports/2026-09-05-pr535-fix-merge-conflicts.md`
### ÄŽalĹˇĂ­ krok
Founder GO: merge #535; then PROD digest smoke.

---

## Session 2026-09-12 (critical-bug automation)
### Dokončené
- HIGH: buyer-onboarding `createTask` silent RLS drop — fix + PR #545
- Report: `docs/reports/2026-09-12-buyer-onboarding-create-task-rls.md`
### Rozpracované / Pending
- Founder review/merge #545
- Prior critical fixes still open: #369 #370 #443 #444 #447 #462 #486 #490 #495 #537
### Kľúčové súbory zmenené
- `apps/crm/src/app/(public)/buyer-onboarding/actions.ts`: pass admin into createTask
- `apps/crm/src/app/(public)/buyer-onboarding/__tests__/actions.test.ts`: assert scoped client
### Ďalší krok
Founder GO: merge #545; then review backlog of open critical fix PRs (start with #537 tenant unread wipe — live on main).
## Session 2026-09-13 (critical-bug automation)
### DokonÄŤenĂ©
- Found + fixed silent demo CRM task drop (`createDemoBookingTask` / sales-funnel demo-request)
- PR: https://github.com/onlinovosk-bit/RealitkaAI/pull/546
- Report: `docs/reports/2026-09-13-demo-booking-task-service-role.md`
### RozpracovanĂ© / Pending
- Prior open critical fixes still awaiting review: #369 #370 #443 #444 #447 #462 #486 #490 #495 #537 #545 #546
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `apps/crm/src/lib/demo-booking-store.ts`: service-role for orphan task insert
- `apps/crm/src/app/api/sales-funnel/demo-request/route.ts`: pass service + fail if task fails
- `apps/crm/src/lib/sales-funnel-store.ts`: throw on saas_leads insert error
### ÄŽalĹˇĂ­ krok
Founder review/merge #546 (and backlog of open critical fix PRs).



## Session 2026-09-17 (operating mode B — prvy task, A3 onboarding 401)
### Dokoncene
- Setup rezimu B: push overeny (dry-run OK), patch uz bol na `origin/audit/2026-09-16` (`56e2359`, `git am --3way` -> "already applied"), vetva `docs/operating-mode-b` pushnuta
- PR audit/2026-09-16 -> main uz existoval: #565 — founder ho mergol 2026-09-17 (main -> 1291ae5); protokol 00-06 a DEC-* su teraz na main
- Prvy task v rezime B: handoff (01) + 2 nezavisli reviewri v izolovanych worktrees z origin/main, kluc dokazy re-overene executorom
- FINDING + PROPOSAL k A3 -> PR #566 (draft)
- Founder GO na V1 -> DEC-20260917-003; implementovane: novy proxy-level test drzi 401 ako zamer (mutacne overeny), opravene nepravdive tvrdenia v reporte 2026-09-04 a v rollback runbooku, A3 vyhodnotene fail + deviation accepted_by_founder (desc/verdict nedotknute)
### Rozpracovane / Pending
- Founder: read-only SELECT stavu RLS `onboarding_sessions` v prode (runbook :38-41) — A1/A2 zostavaju unknown
- Founder: Supabase Auth "Confirm email" v prod projekte — rozhoduje, ci 401 zasiahne aj registracnu cestu
### Kluc subory zmenene
- `.ai/bus/handoffs/HANDOFF-20260917-001-a3-onboarding-401.md`: novy handoff packet
- `docs/reports/2026-09-17-a3-onboarding-session-401-finding.md`: FINDING F1-F8 + PROPOSAL V1-V5 + vysledok V1
- `.ai/bus/decisions/DEC-20260917-003-a3-onboarding-401-intended.md`: founderov GO na V1
- `apps/crm/src/proxy-onboarding-session-gate.test.ts`: novy test, 401 = zamer
- `docs/reports/2026-09-04-rls-onboarding-session-api.md`, `docs/runbooks/rollback-onboarding-sessions-anon.md`: korekcie
- `.ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md`: A3 vyhodnotene
### Dalsi krok
Founder: merge #566, potom SAMOSTATNE rozhodnutie o migracii 20260904220000 (stale PREPARED ONLY) — najprv read-only SELECT stavu RLS v prode podla runbooku :38-41.

## Session 2026-09-18 (GTM playbook — predaj RK, 80/20 majiteľa, akvizícia)
### Dokončené
- Syntéza GTM stratégie z dôkazov v repe → `docs/sales/gtm-playbook-2026-09-18.md`
- Nájdený rozpor: VETO na valuačný widget (2026-07-19, „chýba licencovaný zdroj cien") je
  prekonaný písomným povolením NBS (2026-08-10); zostáva len nespárovaná jednotka realizačná/ponuková
- Zdokumentované: 3× nezávislé odmietnutie AI/CRM trhom + kotva 300 €/tip + loop 31 dní na nule
- `memory/decisions.md` doplnený o decision record 2026-09-18
### Rozpracované / Pending
- **Founder GO S2** — rozsah tvrdenia widgetu na NBS dátach (3 otázky v §9 playbooku)
- GDPR gate pre A1 (RPO outreach zoznam) a S4 (audit cudzieho exportu) — `gdpr-advisor` nespustený
- Úlohy s 0 € engineeringom (S1 packaging, S3 segmentácia A/B/C, S8 procesná daň, A4 Únia, A8 sezónnosť) — GO nepotrebujú
### Kľúčové súbory zmenené
- `docs/sales/gtm-playbook-2026-09-18.md`: nový GTM playbook (stratégie, 80/20, akvizícia, 30/60/90)
- `memory/decisions.md`: decision record 2026-09-18 + revízia predpokladu VETO
### Ďalší krok
Founder: rozhodnúť S2 (ponuková úroveň NBS v UI? koeficient ostáva null? znenie atribúcie?).
Bez `GO S2` žiadny kód.

## Session 2026-09-18b (GO S1/S3/S8/A4/A8 — exekucne artefakty; S2 blokovane rozporom)
### Dokoncene
- `docs/sales/positioning-v1-zdroj-predavajucich.md` — S1 packaging (kategoria, hierarchia spravy, zakazany slovnik, smieme/nesmieme tvrdit)
- `docs/sales/segmentacia-a-b-c-outreach.md` — S3 segmenty podla CRM (A=Realvia, B=iny, C=Excel), skripty, kvalifikacia, tracker polia (riesi D5-7), A8 sezonnost
- `docs/ops/founder-time-protocol.md` — S8 triage 54 otvorenych PR do 3 kop + 2 nalezy
- `docs/sales/realitna-unia-druhy-kontakt-draft.md` — A4, NEODOSLANE
- Oprava vlastneho odporucania: auto-merge lane uz existuje (AUTOMERGE-POLICY v1.0 + workflow)
### Rozpracovane / Pending
- **S2 BLOKOVANE:** founder dal "GO S2" ale Q1=nie a Q3=ano su nezlucitelne. Ziadny kod kym sa Q1 neujasni.
- Founder rozhodnutia zo `founder-time-protocol.md` §6: zatvorit kopu 3 (29 PR)? prehodit 12 draftov kopy 1 na ready? overit robota na #189/#191/#192? stav migracie #437?
- `gdpr-advisor` skill nie je v tejto session dostupny — GDPR brana pre A1/S4 formalne nesplnena
### Kluc subory zmenene
- `docs/sales/positioning-v1-zdroj-predavajucich.md`, `docs/sales/segmentacia-a-b-c-outreach.md`
- `docs/ops/founder-time-protocol.md`, `docs/sales/realitna-unia-druhy-kontakt-draft.md`
- `memory/decisions.md`: decision record 2026-09-18 (GO + rozpor S2)
### Dalsi krok
Founder: ujasnit Q1 pre S2 (zobrazuje widget NBS uroven alebo nie?) + 4 rozhodnutia z founder-time-protocol §6.

## Session 2026-09-18c (Founder Acquisition Research Loop — zjednotenie)
### Dokoncene
- `docs/sales/founder-acquisition-loop-2026-09-18.md` — founderov ramec prijaty, konfrontovany s repo dokazmi
- Nalez 1: /proof + leak engine SHIPPED od 2026-07-06, 0 realnych prospectov za 3 mesiace -> hrdlo je navstevnost, nie nastroj
- Nalez 2: NAR cisla su US trh + neoverene -> PREDPOKLAD; lokalny SK dokaz (3 rozhovory) ma prednost
- Nalez 3: Founder Dashboard data-blocked (activities=3/31d, #437 nezmergovany)
- Experiment E0 navrhnuty: split otaracej vety H1 vs H2, rozhodovacie pravidlo vopred
- 30-dnovy Founder-led Acquisition OS po tyzdnoch s metrikami a failure signalmi
### Rozpracovane / Pending
- **E0 je prva uloha** — bez neho je prva veta outreachu hadanie
- Brany: G1 GDPR B2B outreach, G2 GDPR cudzi export, G3 S2 rozsah (stale nezodpovedane), G4 #437 do PROD, G5 suhlas s menovanim
- Founder dismissol obe otazky (S2 rozsah + prehodenie 12 draftov) — cakaju na dalsi pokyn
### Kluc subory zmenene
- `docs/sales/founder-acquisition-loop-2026-09-18.md`: zjednoteny loop + 30-dnovy OS
- `memory/decisions.md`: decision record 2026-09-18 (ramec prijaty, 3 nalezy, E0)
### Dalsi krok
Founder: spustit E0 (zoznam 40 RK segment A + split vety) alebo odpovedat na G3/G4.
## Session 2026-09-17 (open PR stack repro)
### Dokončené
- Reprodukcia 11 otvorených PR na origin/main `6f6381ca0`
- Report: `docs/reports/2026-09-17-open-pr-stack-repro.md`
### Rozpracované / Pending
- Founder: close #374 #480; merge stack MERGNÚŤ po rebase kde treba
### Kľúčové súbory zmenené
- `docs/reports/2026-09-17-open-pr-stack-repro.md`: dôkazová tabuľka
### Ďalší krok
Founder GO: rebase+merge #537/#486/#447 (tenant HIGH); close #374/#480.

## Session 2026-09-18d (ekonomika majitela RK -> akvizicny system)
### Dokoncene
- `docs/sales/owner-economics-acquisition-system-2026-09-18.md` (291 riadkov): retaz penazi a kde Revolis realne siaha (A,B) vs nesiaha (C,D,E); tuzby/strachy/uzke hrdla; 7 spustacov nakupu vratane detekovatelneho T5; mapa 10 namietok s odpovedami; cenova psychologia a 4-vrstvova architektura ponuky; struktura pilotu (Shadow 14 dni -> plateny 60-90 dni); rebrik dokazov 1-6; experimenty E1-E6 s kill kriteriom
- Merge origin/main do vetvy (#437 pritiahnuty)
### Korekcia
- **#588 NIE je merged** — GitHub API `state=open, merged=false`, ziadny zo 6 dokumentov nie je na main. Founder pravdepodobne zamenil cislo.
- Merged bol **#437** (migracia `20260817220000` s `last_contact_at`) -> G4 ciastocne zavreta, ale PROD aplikacia NEOVERENA
### Rozpracovane / Pending
- Founder: merge #588 (stale otvoreny, draft, zeleny)
- Brany: G1 GDPR B2B outreach, G2 GDPR pristup k ich datam (blokuje Shadow), G3 S2 rozsah, G4 PROD overenie migracie, G5 suhlas s menovanim
- E0 stale nespusteny — prva uloha 30-dnoveho OS
### Kluc subory zmenene
- `docs/sales/owner-economics-acquisition-system-2026-09-18.md`
- `memory/decisions.md`: decision record 2026-09-18 (ekonomicky model + korekcia o #588/#437)
### Dalsi krok
Founder: (1) merge #588, (2) read-only SELECT ci je migracia 20260817220000 aplikovana v PROD, (3) spustit E0.

## Session 2026-09-20 (PR #588 MERGED — akvizicny system na main)
### Dokoncene
- **#588 merged** do main ako `aa6e07f`. 7 dokumentov, 1679 riadkov, bez kodu a migracii.
  `founder-acquisition-loop`, `owner-economics-acquisition-system`, `gtm-playbook`,
  `positioning-v1-zdroj-predavajucich`, `segmentacia-a-b-c-outreach`,
  `founder-time-protocol`, `realitna-unia-druhy-kontakt-draft`
- Vetva restartovana z origin/main (merged historia sa uz nepouziva)
- Opraveny popis PR: tvrdil #437 nezmergovany, co uz neplatilo
### Overene fakty (proti primarnym zdrojom)
- #437 merged -> migracia `20260817220000` (`last_contact_at`) je na main; **PROD aplikacia NEOVERENA**
- #537 a #563 medzitym tiez merged (boli v kope "blokuje zakaznika")
- Vercel `ignoreCommand` (#578) NEchrani pred dennou kvotou `api-deployments-free-per-day` —
  kvota sa mini pri vytvoreni deploymentu, nie pri builde; setri build minuty, nie pocet deploymentov
### Rozpracovane / Pending
- **E0 nespusteny** — split otvaracej vety H1 vs H2, prva uloha 30-dnoveho OS
- Brany: G1 GDPR B2B outreach (blokuje tyzden 1), G2 GDPR pristup k ich datam (blokuje Shadow CRM),
  G3 S2 rozsah (NBS na maklerskej strane?), G4 PROD overenie migracie, G5 suhlas s menovanim
- `gdpr-advisor` skill nie je v tejto session dostupny -> G1/G2 formalne nesplnene
### Dalsi krok
Founder: read-only SELECT ci je `20260817220000` aplikovana v PROD (G4). Bez toho ranny zoznam nestoji.

## Session 2026-09-19…21 (Smolko ingest audit, P1 v0.2, parser fix)

### Dokončené
- **Reality Smolko — mailová slučka uzavretá.** 18. 9. 10:10 odoslaný e-mail „Rozšírenie Revolisu o dopyty a prístupy Vašich maklérov"; p. Smolko odpovedal ten istý deň 14:42 a vyplnil všetkých 5 bodov (zoznam maklérov + adresy, súhlas s napojením, Websupport IMAP/SMTP parametre cez webex, admin = iba on). **9 maklérov** na zapojenie vrátane konateľa; **4 účty žiadal deaktivovať**.
- **Produkčná zmena:** 4 profily deaktivované v `public.profiles` (`is_active → false`, `role` nedotknutá, vratné). Pred zápisom overené, že nedržia nič: 0 leadov, 0 úloh, 0 aktivít, 0 eventov. Agentúra `1111…1111` = 9 aktívnych / 4 neaktívni. Bod „admin iba ja" bol už splnený — konateľ má `role: owner`.
- **#584 — `.ai/bus/artifacts/TASK-RLS-ONBOARDING-SESSION/RESULT.md` zmergovaný do main** (`9c6fc4dd`, blob `311f3212`). Odvodený záznam Experimentu 01. Výsledok **`PARTIAL PASS / LOOP-LEVEL FAIL`** zachovaný nezmenený — G0-2…G0-5 PASS (83/83 typovaných položiek), G0-1 PASS vo vnútri behu / FAIL na úrovni slučky.
- **#591 — P1 kontrakt v0.2 rozšírený** o tri body, zmergované do `docs/agent-contract-v0.1` (`066ded51`):
  - **(e) actor / model / role / capabilities** — envelope nerozlišuje aktéra od jeho oprávnení (overené: `git grep 'capabilit|permission'` v kontrakte = 0).
  - **(f) `valid_for` + `on_state_change`** — väzba `DECISION` na stav, nad ktorým vzniklo, cez **všetky** state dependencies, nie len mutovaný ref. `on_state_change` ∈ `abort | re-audit | proceed`, default pri chýbajúcom poli = **`abort`**.
  - **(g) expirácia GO** — ak sa zmení ktorýkoľvek ref z `valid_for.depends_on`, pôvodné GO **automaticky expiruje**.
  - **Permission boundary zapísaná epistemicky presne:** `OBSERVATION:` branch push OK, tag push HTTP 403 · `CAUSE: UNKNOWN` · `HYPOTHESIS:` policy môže rozlišovať druhy refov — **NOT VERIFIED** (diagnostický endpoint proxy nebol dostupný).
- **#599 — oprava acquire parsera zmergovaná do main** (`2a510ba3`, `PARSER_VERSION` 1.2 → 1.3). Koreňová príčina: route skladá `raw = subject + text + html`, takže regexy nad poľami bežali aj nad HTML markupom. Opravené: `htmlToText()`, `cleanName()`, `pickContactEmail()` + parameter `recipient` z `email.to`, `cleanEmail()`. **Idempotencia zámerne nedotknutá** — `rawHash`/`eventId` sa naďalej počítajú z pôvodného `raw`. +7 regresných testov, fixtúry syntetické (PII klientov do repa nepatrí).

### Rozpracované / Pending
- **Atribúcia leadu na makléra — BLOCKED.** Nie je to len nedorobok: dnes **všetky** dopyty prichádzajú na `office@realitysmolko.sk`, takže neexistuje objektívny signál, podľa ktorého priradiť konkrétneho makléra. `inbound_mailboxes` je per agentúra (`smolko-a7f2@revolis.ai`), nie per maklér. Odblokuje sa až napojením individuálnych schránok. Stav dnes: **0 zo 7** živých portálových leadov má `assigned_profile_id`.
- **Napojenie schránok maklérov — odložené.** Čaká na zmeranie objemu: 21. 9. odoslaný e-mail p. Smolkovi s otázkou, koľko dopytov dostali traja menovaní makléri minulý týždeň priamo na svoju adresu. Bez toho čísla nevieme, či sa 8 preposielacích pravidiel + GDPR proces oplatí.
- **RAW STORAGE — nevyriešená technická medzera, bez GO.** Viď decisions.md.
- **Tri otvorené founder `DECISION`:** P1 (a–g), P2 (transport), P3a/P3b (RLS).

### Kľúčové súbory zmenené
- `apps/crm/src/lib/acquire/email-adapter.ts` — HTML normalizácia, výber kontaktnej adresy, čistenie mena (#599)
- `apps/crm/src/lib/acquire/__tests__/email-adapter.test.ts` — +7 regresných testov zo skutočných produkčných zlyhaní, syntetické fixtúry (#599)
- `apps/crm/src/app/api/acquire/email/route.ts` — `parseEmail(raw, receivedAt, { recipient: email.to })` (#599)
- `.ai/bus/artifacts/TASK-RLS-ONBOARDING-SESSION/RESULT.md` — odvodený záznam Gate 0 (#584)
- `docs/reports/2026-09-16-gate0-protocol-validation.md` — sekcia „Amendment 2026-09-18", položky `AE1–AE3`, `A1–A3` (#591)
- `.ai/bus/outbox/MSG-20260918-030-orchestrator-lessons-cleanup-permission-boundary.md` — lessons (#591)
- `public.profiles` (PROD) — 4× `is_active → false`

### Ďalší krok
Čakať na odpoveď p. Smolka s počtom dopytov u troch maklérov. To číslo rozhodne, či má napojenie schránok zmysel, alebo je problém v objeme dopytov a nie v ich zbere.

## Session 2026-09-21 (substrate parity — tri legalizačné brány, CP-P0-1A odblokované)

### Dokončené
- **#619 `777149e` — `platform_events` + `ai_jobs` legalizované** do active migration setu. Obe existovali v PROD, ale `CREATE TABLE` nemali v žiadnej aktívnej migrácii (`platform_events` len v `migrations-archive/`, `ai_jobs` nikde). Migrácia reprodukuje presne nameraný PROD tvar: stĺpce a poradie, typy, defaulty, PK/FK/CHECK, indexy (vrátane partiálneho `ai_jobs_runner_poll ... WHERE status='pending'`), RLS, `platform_events_select_tenant` policy a členstvo v `supabase_realtime`. Dôkaz: **104/104 applied**, fingerprint `3c7b4d60e3a49441aaeff389ade3a5f2` (31 riadkov) zhodný s PROD, idempotencia 3×, zachovanie dát overené.
- **#625 `ee8a361` — producent legalizovaný**: `emit_platform_event()`, `trg_leads_platform_events`, `trg_activities_platform_events`. Bez nich mala CI tabuľky bez toho, kto do nich píše. Dôkaz: **105/105 applied**, fingerprint `329e2f587007c97ff05efd760d1fddbb` (5 riadkov) zhodný s PROD, a **funkčný test v CI** — insert lead → `lead.created`, update status → `lead.status_changed`, insert activity → `integration.activity`, všetky s nenulovým `agency_id`.
- **#628 `1f6ba69` — `leads.agency_id NOT NULL` legalizované.** V PROD platilo, po `db reset` nie; vzniklo mimo migrácií (žiadna zo 106 ho nedoťahuje). Dôkaz: **106/106 applied**, `notnull=true` po CI resete, fingerprint `81bcd45e805f84990b1bbed1be216bcd` (10 riadkov, 9 stĺpcov + definícia FK) zhodný s PROD.
- **Metóda dôkazu naprieč všetkými tromi:** lokálny PostgreSQL 16, čistý cluster, Supabase-like scaffolding, prehratý celý aktívny migration set, potom md5 fingerprint nad `pg_catalog` proti živej PROD DB. Nie tvrdenie, ale porovnanie.
- **Oprava vlastného omylu:** `BUS-TYPECHECK` som opakovane viedol ako `UNKNOWN`; prevzaté z tela #612, ktoré vzniklo pred #620. Overené: `bus:typecheck` beží v `saas-grade-pipeline.yml:308` (`b3d20de` na main). **Položka je uzavretá.**

### Rozpracované / Pending
- **`CP-P0-1A` (event spine v2) — odblokovaná po stránke parity, blokujú ju už len `P-2` a `P-3`.** A3 čaká na P-2, A7 na P-3. Substrátový dôvod, kvôli ktorému bola zastavená, zanikol.
- **`LEADS-AGENCY-FK-CONTRADICTION` — nové, nerozhodnuté.** `leads.agency_id` je `NOT NULL`, ale `leads_agency_id_fkey` je `ON DELETE SET NULL`. **Zmazanie agentúry s leadmi dnes v PROD zlyhá.** Reprodukované v CI po #628. Tri možné odpovede (`CASCADE` / `RESTRICT` / zrušiť `NOT NULL`) majú rôzne dôsledky na dáta → rozhodnutie Foundera.
- **`EMIT-EVENT-PUBLIC-EXECUTE` — nové, security.** `emit_platform_event` je `SECURITY DEFINER` s `EXECUTE` pre PUBLIC (`anon` aj `authenticated`). Ktokoľvek vie zapísať podvrhnutý event do streamu ľubovoľného tenanta; RLS to nezastaví.
- **`PLATFORM-EVENT-NULL-WRITER` — backlog.** `matching-engine.ts:36` posiela `agencyId: null`, writer chybu iba `console.warn`-ne. PROD má 0 NULL riadkov → vetva nikdy úspešne nezbehla.
- **Dizajnový dôsledok pre A2:** `CHECK (agency_id IS NOT NULL)` na `platform_events` by kolidoval s vlastným FK `ON DELETE SET NULL`. A2 treba navrhnúť inak, než pôvodne znelo.
- **Tri otvorené founder `DECISION`:** P1 (a–g), **P2 (transport)**, **P3a/P3b (RLS)** — nezmenené.

### Kľúčové súbory zmenené
- `apps/crm/supabase/migrations/20260921000000_legalize_platform_events_ai_jobs.sql` — tabuľky, indexy, RLS, policy, realtime publikácia (#619)
- `apps/crm/supabase/migrations/20260921190000_legalize_platform_event_triggers.sql` — tri funkcie + oba triggery, triggery guardované na neexistenciu (#625)
- `apps/crm/supabase/migrations/20260921200000_legalize_leads_agency_id_not_null.sql` — guardovaný `SET NOT NULL`, bez backfillu (#628)
- `memory/decisions.md` — záznam brány vrátane princípu „legalizuj substrate as-is" a piatich nálezov
- `memory/session-summary.md` — tento záznam

### Ďalší krok
Uzavrieť **P-2** a **P-3**. Sú to jediné dve veci medzi aktuálnym stavom a `CP-P0-1A`; A3 a A7 sa bez nich nedajú navrhnúť. Tri otvorené nálezy (FK rozpor, PUBLIC EXECUTE, NULL writer) sú reálne, ale spine neblokujú — riešiť ich až po P-2/P-3, každý vlastnou bránou.

## Session 2026-09-23 (FUNNEL-PRICING-01 vykonaný + ratchet dlh zmapovaný)

### Dokončené
- **FUNNEL-PRICING-01** (#647 → `fc381004`): `apps/crm/src/components/billing/ProgramComparison.tsx`.
  Štyri plan-CTA už nie sú odkazy na `/billing` → statický badge „Na roadmape" (`:237`,
  vnútri mapy cez všetky štyri plány). Spodné CTA mieri na `/upgrade` s textom
  „Kúpiť seaty — 79 / 71 / 63 € na makléra →" (`:302-306`). `href="/billing"` má
  v súbore **nula** výskytov. Vykonanie `DEC-20260921-001` v UI.
- **BOM fix** (`.ai/bus/tasks/TASK-BUS-RUNNER-2D.md`): strip `EF BB BF` + zmazanie
  zdvojeného `---`. `bus:validate` 1 error → 0 errors, exit 0. Bola to moja chyba
  z #621; `main` bol kvôli nej červený. Paralelne to opravil aj #648 (`988edf6b`) —
  výsledné súbory sú byte-identické.
- **`RATCHET-API-CONTRACT-01` zmapovaný a zapísaný** do `memory/open-tasks.md`:
  9 nových porušení (540 / 531 baseline), tri tranže s rôznym rizikom, dva komentáre
  na #647 s dôkazmi.
- **Overenie na mergnutom `main`**, nie na vetve: `git diff d57eac1c origin/main`
  na oboch súboroch je prázdny.

### Rozpracované / Pending
- **Krok A — Stripe VERIFY** (founder-only, `sk_live_…` lokálne):
  `STRIPE_SECRET_KEY=sk_live_… bash scripts/ops/stripe-verify-prices.sh`.
  `9/9` → Krok B env patch. `MISSING` / `AMBIG` / `has_more=true` → STOP.
  Bez tohto `/upgrade` nevedie do Stripe; `seatCheckoutAvailable` je `false`.
- **Vercel Ignored Build Step** — founder musí prečítať hodnotu v dashboarde pre
  `realitka-ai` aj `revolis-marketing`. `ignoreCommand` v oboch `vercel.json` je
  empiricky inertný. Žiadna zmena `vercel.json` naslepo.
- **OQ-3** — machine account, PAT, branch protection, `REVOLIS_BUS_BRANCH=bus/main`.
  Founder-only. `scripts/bus/serve.ts:50` má default `"main"`, čo koliduje s ADR §7.
- **GO RATCHET-TRANCHE-1** — udelené a vykonané v **#660**: 3 routy `concierge/*`,
  16 zo 17 `NextResponse.json` → `okResponse`/`errorResponse` + wire test.
  Ratchet **9 → 6** (nie 9 → 4 — trieda `api-response` sú 3 porušenia, nie 5).
  Kontrola je binárna, takže zelená to nie je; zostáva 6: 4× `usage-metrics`,
  2× `api-validate`, oboje čaká na founderovo rozhodnutie.
- **Founder rozhodnutie o `UsageMetricName`** — bez rozšírenia unionu tranža 2 nejde.
  Na `onboarding/session` je to navyše GDPR otázka (`DEC-20260917-005`).
- **Nevysvetlené:** prečo #621 prešlo CI zelené s rozbitým BUS frontmatterom.
- **Nezmenené:** `memory/people.md` — v tejto session sa zloženie tímu ani
  stakeholderov nezmenilo, takže som tam nič nevymýšľal.

### Kľúčové súbory zmenené
- `apps/crm/src/components/billing/ProgramComparison.tsx`: plan-CTA → „Na roadmape",
  spodné CTA → `/upgrade` seat pricing.
- `.ai/bus/tasks/TASK-BUS-RUNNER-2D.md`: strip BOM + zdvojený `---`.
- `memory/open-tasks.md`: FUNNEL-PRICING-01 → VYRIEŠENÉ; nová sekcia
  `RATCHET-API-CONTRACT-01`.
- `memory/decisions.md`: nový záznam `[2026-09-23]` + tri sprievodné nálezy.

### Ďalší krok
Founder spustí **Krok A — Stripe VERIFY** lokálne v live mode a nahlási len `N/9`.
Je to jediná vec, ktorá dnes blokuje príjem; všetko ostatné je naň naviazané.
## Session 2026-09-23 (P-2 + P-3 — RLS model loop tabuliek uzavretý v repe)

### Dokončené
- **#644 `5b2e915` — P-2 konvergencia RLS modelu pre 5 loop tabuliek.** Rozdelenie 2/3 bez zmeny schémy: infra deny-all (`ai_jobs`, `lead_triage_idempotency`) dostalo `COMMENT ON TABLE 'intentional infra deny-all'`, aby `RLS ON, 0 policies` čítal budúci človek ako zámer; tenantné (`credit_ledger`, `decisions`, `exclusivity_outcomes`) dostali SELECT + INSERT pre `authenticated` cez `agency_id`. `DROP POLICY IF EXISTS` + `CREATE`, lebo `credit_ledger` už policies mal z `20260613000000`, ktorá v PROD nikdy nebežala. Dôkaz: replay **110/110**, negatívny INSERT cudzej agentúry zablokovaný na všetkých troch, pozitívny prešiel, SELECT izolácia `vlastné=1 / cudzie=0`.
- **#645 `6ae75ba` — P-3, vetva `agency_id IS NULL` zatvorená natrvalo** v `platform_events_select_tenant`, `ai_action_audit_select_tenant`, `ai_action_audit_insert_tenant`. Podmienka splnená meraním proti živému PROD tesne pred zmenou: `platform_events` **1420 / 0 NULL**, `ai_action_audit` **186 / 0 NULL**. Dôkaz behaviorálny, nie tvarový: so starou policy bol osirený riadok viditeľný (1) a INSERT s `agency_id → NULL` prešiel (`INSERT 0 1`); po P-3 je 0, resp. `ERROR: new row violates row-level security policy`. Replay **111/111**, idempotentná 3×.
- **Odchýlka od zadania, hlásená pred implementáciou:** `current_agency_id()` v repe neexistuje; použitý zavedený `public.profile_agencies_for_auth()`.
- **`BUS` CI blocker diagnostikovaný** — UTF-8 BOM v `.ai/bus/tasks/TASK-BUS-RUNNER-2D.md` z `36ff454` (#624); červené aj na `main`, teda na každom PR. Reprodukované na base vetve, komentár s dôkazom na #644. Opravené iným PR (#647/#648), `bus:validate` zelený.

### Rozpracované / Pending
- **🔴 PROD dieru merge NEZATVORIL.** Obe migrácie sú v aktívnom sete, ale **neaplikované na PROD**. Overené po merge #645: všetky tri policies majú v PROD stále `(agency_id IS NULL) OR …`. **Kým nepríde deploy, hole je v PROD otvorená.** Deploy = samostatná brána, čaká na GO.
- **`BUS-YAML-BOM-TOLERANCE` — ZRUŠENÉ, nebolo čo opraviť.** Túto položku som otvoril na základe nesprávnej diagnózy: tvrdil som, že parser netoleruje vedúci BOM. Netolerancia neexistuje — `parseBusDocument` BOM strihá odjakživa (`envelope.ts:151`). `bus:validate` zhodil **zdvojený `---`**, nie BOM; overené reprodukciou proti parseru (samotný BOM → 0 errors; samotný zdvojený `---` bez BOM → tá istá chyba). Dátovú polovicu opravilo #648, parserovú #653 (hláška pomenuje príčinu + 3 regresné testy).
- **`CP-P0-1A` — P-2 aj P-3 hotové v repe, A3 a A7 sa už dajú navrhnúť.** Substrátové aj policy blokátory zanikli (modulo deploy).
- **CI/PROD divergencia na `ai_action_audit`** — v CI jedna `ai_action_audit_tenant` (`FOR ALL`), v PROD dve menované policies. Dôsledok 60 neaplikovaných migrácií; staršie než P-3, nie je ňou riešené.
- **Nezmenené z minulej session:** `LEADS-AGENCY-FK-CONTRADICTION`, `EMIT-EVENT-PUBLIC-EXECUTE`, `PLATFORM-EVENT-NULL-WRITER`, RLS-suite unseeded-skip, 60 neaplikovaných migrácií.

### Kľúčové súbory zmenené
- `apps/crm/supabase/migrations/20260922190000_p2_loop_tables_rls_model.sql` — infra deny-all komentáre + 3× tenantné SELECT/INSERT policies (#644)
- `apps/crm/supabase/migrations/20260923070000_p3_drop_null_agency_branch.sql` — odstránenie `agency_id IS NULL` vetvy; `ai_action_audit` guardovaný na existenciu policy (#645)
- `memory/decisions.md` — záznam oboch brán vrátane nálezu o CI/PROD divergencii `ai_action_audit`
- `memory/session-summary.md` — tento záznam

### Ďalší krok
Rozhodnúť o **deploy migrácií na PROD**. Kým nepríde, P-2 aj P-3 sú uzavreté len v repe a diera `agency_id IS NULL` je v PROD stále otvorená. Pozor: `supabase db push` aplikuje **všetkých 60+ neaplikovaných migrácií naraz**, nielen tieto dve — preto to nie je rutinný deploy a potrebuje vlastnú bránu s plánom.

## Session 2026-09-23 (CI unblock — Supabase images)

### Dokončené
- **Cesta B zmeraná a zelená.** Beh `35908421737`: `SUPABASE_INTERNAL_IMAGE_REGISTRY:
  public.ecr.aws` + 3-pokusový retry prešiel 5/5. **`Test` a `Build` bežali prvý raz** —
  v každom predošlom behu boli `skipped`, lebo pipeline zomrel na `Start local Supabase`.
- **Dôkaz, že prepnutie registry samo nestačí.** `19:21:32` postgres stiahnutý,
  `19:21:33` `public.ecr.aws/supabase/kong:2.8.1` → `toomanyrequests: Rate exceeded`,
  `pokus 1/3` padol; `19:22:30` **`supabase start OK (pokus 2)`**. Retry bol nosný prvok.
- **Dve triedy zlyhania oddelené:** ghcr.io `allowed: 44000/minute` = zdieľaný objemový
  strop registry, auth ani 3m44s backoff nepomôžu. ECR `Rate exceeded` = pully za sekundu,
  retry proti nemu konverguje, lebo Docker drží stiahnuté vrstvy.
- **Oprava rozbitého merge (`2655f74`).** Niekto zmergoval `main` do
  `claude/upbeat-davinci-t8zjo8` (`8d0fe73`) a krok `Start local Supabase` dostal
  **duplicitné kľúče** `run`/`env`/`working-directory` — moja inline slučka vedľa volania
  wrappera z #670. YAML to ticho zje, posledný kľúč vyhrá, takže reálne bežal `docker.io`
  a retry bola mŕtvy kód. Tretí prípad tichého rozbitia po #660/#662.
- **Konvergencia namiesto súboja:** wrapper `scripts/ci/supabase-start.sh` (#670) je lepšia
  štruktúra než inline slučka — má testy, zoznam registry je dáta. #671 teda berie wrapper
  a prispieva doň: default `ghcr.io docker.io ghcr.io` → `public.ecr.aws docker.io
  public.ecr.aws`; `nightly-playwright.yml` naň napojený (doteraz volal `supabase start`
  priamo, bez jediného retry); mŕtve step-level `SUPABASE_INTERNAL_IMAGE_REGISTRY` preč.
- **Mutation proof:** po zmene skriptu spadli 3/4 testy na presnom zozname registry,
  štvrtý (konfigurovateľnosť) ostal zelený. Až potom upravený test → 4/4.

- **#671 zmergovaný** 2026-09-24 05:31 → `959b251`. Overené na `main`: default registry
  `public.ecr.aws docker.io public.ecr.aws`, oba workflowy volajú
  `../../scripts/ci/supabase-start.sh`, žiadne step-level `SUPABASE_INTERNAL_IMAGE_REGISTRY`,
  žiadne duplicitné YAML kľúče.
- **Posledný beh pred merge je dôležitejší než ten prvý.** Na `2655f74` pokus 1 cez
  `public.ecr.aws` stiahol 9 z 10 images a padol na `edge-runtime:v1.74.3`; pokus 2 cez
  `docker.io` prešiel. Čo CI drží zelené je teda **druhý, nezávisle limitovaný registry**,
  nie poradie. Poradie je zvolené preto, že `ghcr.io` má tri behy a nula úspechov,
  `public.ecr.aws` dva behy a oba nakoniec zelené, `docker.io` jeden dátový bod a ten ako
  druhý pokus s teplými vrstvami.
- **Opravený vlastný omyl:** ECR-first NEšetrí kvótu Docker Hubu. Pokus 2 stiahol z Docker
  Hubu všetkých desať, lebo `public.ecr.aws/supabase/postgres` a `supabase/postgres` sú pre
  Docker rôzne repozitáre — manifest sa ťahá znova. Ušetria sa len vrstvy, teda čas
  (37 s namiesto 84 s), nie limit.

### Rozpracované / Pending
- **Optimálne poradie registry nie je zmerané** a jeden beh na registry nie je vzorka.
  Zoznam je dáta — `SUPABASE_START_REGISTRIES` ho prehodí bez PR.
- **Caveat:** závislosť na cudzom registry sa **presunula, neodstránila**. Ak sa saturujú
  oba, ďalšia páka = cachovanie images v CI, vlastné GO.
- **Delenie vlastníctva s paralelnými sessionmi je reálny problém** — #671/#673 riešili ten
  istý blocker v tých istých dvoch súboroch a do mojej vetvy zasiahol cudzí merge, ktorý ju
  ticho rozbil. Návrh: CI/workflow súbory vlastní naraz jedna session.
- Nezmenené: CHECKOUT-ENV-01 krok A (Stripe VERIFY, founder-side), deploy 60+ migrácií na
  PROD, `BUS-YAML-BOM-TOLERANCE`.

### Kľúčové súbory zmenené
- `scripts/ci/supabase-start.sh` — default registry list vedie `public.ecr.aws`, doplnená diagnóza
- `scripts/ci/__tests__/supabase-start.test.sh` — asercie na nový default + prečo je to meranie
- `.github/workflows/saas-grade-pipeline.yml` — mŕtve step env preč, komentár zaktualizovaný
- `.github/workflows/nightly-playwright.yml` — napojený na wrapper
- `memory/session-summary.md` — tento záznam

### Ďalší krok
CI blocker je uzavretý. Najvyššiu hodnotu má opäť **CHECKOUT-ENV-01 krok A** — read-only
Stripe VERIFY, ktorý spúšťa founder (ja kľúč nemám a mať nebudem). Je to jediná vec, ktorá
dnes blokuje príjem.
