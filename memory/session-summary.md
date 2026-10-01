## Session 2026-10-01 (AUTO-RESPONSE-GATE)
### Dokončené
- #771 zmergovaný a nasadený (`d29b73c`). Prvý reálny lead po dobití (06:46:58 UTC, Bazoš.sk): AI triedenie
  (+1,6 s) aj AI návrh odpovede (+8 s) fungujú; `inbound.auto_response` = `failed_send / domain_not_verified / 403`.
- **Príčina auto-odpovede dokázaná:** Resend doména neoverená. **AUTO-RESPONSE-GATE** (GO foundera, PROD zápis
  07:17:20 UTC): `agencies.auto_response_enabled = false` pre agentúru `11111111-…` (Smolko) — kým nie je schválený
  reply-to, znenie a súhlas Smolka a overená doména. Postup zapnutia: `memory/decisions.md`.
### Rozpracované / Pending
- **Founder:** Resend → doména `revolis.ai` → červené DNS záznamy (screenshot) — oprava je bezpečná, kým je brána vypnutá.
- Rozhodnúť reply-to (`ra***@gmail.com` nepoznáme) a súhlas Smolka s odosielaním; potom zapnúť späť.
- Dashboard cron po #771 (13:00 UTC alebo ručne): `stop_reason`, `failure_reason`, latencia.
- BACKLOG: `auto_response_enabled` predvolene `true` (opt-out) → opt-in; auto-reload + nižší limit v Console.
### Kľúčové súbory zmenené
- `memory/decisions.md`, `memory/session-summary.md` (žiadna zmena kódu); PROD: 1 riadok v `agencies`.
### Ďalší krok
Ďalší lead → `skipped_disabled` (brána drží); founder opraví DNS; rozhodnutie o reply-to.

## Session 2026-10-01 (DASHBOARD-LLM-OUTPUT-FIT)
### Dokončené
- #764 v produkcii; dashboard cron 06:24 UTC: **prvý `llm` v histórii** (7 488 ms, 0,0035 €), + 1× timeout
  (7 501 ms), 1× `bad_output` (6 380 ms). Kredit/kľúč potvrdené. Detail: `memory/decisions.md`.
- **DASHBOARD-LLM-OUTPUT-FIT** (GO foundera): audit nesie `stop_reason` + tokeny (aj pri `bad_output`),
  `max_tokens` 700 → 1000, okno crona 8 → 14 s (3 dávky stihnú `maxDuration` 60 — stráži test).
  Testy + mutation proof 9/9, lint čistý, typecheck 49.
### Rozpracované / Pending
- Po nasadení: ďalší dashboard cron (13:00 UTC alebo ručne) — prečítať `stop_reason`, `failure_reason`, latenciu.
- Prvý reálny lead: triage + návrh odpovede + `inbound.auto_response` (zatiaľ 0 záznamov, lead od nasadenia nebol).
- Founder: auto-reload + nižší mesačný limit v Console; Resend doména `revolis.ai` („Partially Failed").
### Kľúčové súbory zmenené
- `apps/crm/src/lib/ai/dashboard-insights.ts`, `dashboard-insights-cron.ts`,
  `apps/crm/src/app/api/cron/dashboard-insights/route.ts`; testy `dashboard-insights-usage.test.ts` (nový),
  `dashboard-insights-window.test.ts`, `dashboard-insights-cron.test.ts`.
### Ďalší krok
Merge → nasadenie → ručný beh dashboard crona a prečítať `ai_action_audit`.

## Session 2026-10-01 (D1-BACKFILL-A)
### Dokončené
- `--input` pre backfill experiment: historické portálové e-maily cez produkčný parser (`apps/crm/src/lib/demand/backfill-input.ts`, skript)
- #766 MEMORY-GUARD a #769 D4 zmergované 2026-10-01
### Rozpracované / Pending
- Founder: export 40–60 dopytových e-mailov → `extract --agency … --input …` → označiť `labels.csv` → `score`
- Founder/právnik: Anthropic v DPA a `/legal/sub-processors` pred behom
### Kľúčové súbory zmenené
- `apps/crm/src/lib/demand/backfill-input.ts`: MIME čítačka (.eml/.mbox/.txt) + produkčná cesta `parseEmail`
- `apps/crm/scripts/demand-backfill-experiment.ts`: `--input`, deduplikácia, `sources.csv`, `--agency` voliteľné
- `docs/architecture/demand-contract-v1.md`: vstup experimentu + prečo PROD nestačí
### Ďalší krok
Founder spustí experiment s e-mailmi a označí gold dataset; pri PASS migrácie D1+D4 na PROD.

## Session 2026-09-30 (DEMAND-D4)
### Dokončené
- D4 matching na overenom dopyte: engine, tabuľka + RLS, API, karta na detaile leadu, funnel skript (`apps/crm/src/lib/demand/match*.ts`, `supabase/migrations/20260930120000_demand_property_matches.sql`)
- Kontrakt `matching-input-contract-v1.md` doplnený o rozhodnutia v1; Truth Matrix: D4 CODE+VERIFIED, PROD ⏳
### Rozpracované / Pending
- PROD: backfill D1 (founder) → migrácie → flagy → `demand-match-run --apply`
- Mimo v1: dopyt potvrdený maklérom, meranie „maklér otvoril/poslal“, prepočet pri zmene nehnuteľnosti
- #766 MEMORY-GUARD zmergované 2026-10-01
### Kľúčové súbory zmenené
- `apps/crm/src/lib/demand/match.ts`, `match-store.ts`, `store.ts`: engine, zápis, napojenie po D1
- `apps/crm/src/app/api/leads/[id]/demand-matches/route.ts`, `components/leads/demand-matches-card.tsx`: čítanie + UI
- `apps/crm/tests/rls/demand-matches-rls.test.ts`: tenant pin
### Ďalší krok
Backfill D1: PROD má na Smolko ≤8 rozpočtov, ≤6 izieb, ≤8 kúpa/prenájom (regex horná hranica) → brána (support ≥10) na PROD dátach nemôže prejsť. Founder volí A (+ historické portálové e-maily, `--input`), B (shadow mode) alebo C (znížiť support — neodporúčané).
## Session 2026-09-30 (MEMORY-GUARD)
### Dokončené
- MEMORY-GUARD: workflow + skript + 12 testov, prah overený na histórii main a mutačne (`scripts/ci/memory-append-only.sh`, `.github/workflows/memory-guard.yml`)
- Oprava vlastného tvrdenia: merge 9774b2c na #745 nič nezmazal (artefakt diffu zastaranej vetvy), zapísané v decisions.md
### Rozpracované / Pending
- D1 na PROD: backfill experiment (founder), Anthropic v DPA + /legal/sub-processors, migrácia lead_demands
- Štítok `memory-rewrite-approved` vytvoriť v GitHub UI pri prvom použití (netreba vopred)
### Kľúčové súbory zmenené
- `scripts/ci/memory-append-only.sh`: guard (merge-tree, nadpisy, limit 20 riadkov, štítok)
- `scripts/ci/__tests__/memory-append-only.test.sh`: 12 scenárov
- `.github/workflows/memory-guard.yml`: nový workflow; `saas-grade-pipeline.yml`: testy guardu
### Ďalší krok
Backfill experiment D1 (founder) → potom `GO DEMAND-D4` podľa `matching-input-contract-v1.md`.
## Session 2026-10-01 (DASHBOARD-LLM-WINDOW)
### Dokončené
- **DASHBOARD-LLM-WINDOW** (GO foundera): dashboard AI volanie dostalo okno 6 s (cron 7,5 s) namiesto
  natvrdo 800 ms; `maxDuration = 60` na cron route; premenná `DASHBOARD_INSIGHTS_TIMEOUT_MS` teraz skutočne
  riadi okno. 6 nových testov + test crona, mutation proof 8/8, lint čistý, typecheck 49.
### Rozpracované / Pending
- Prvý `source: llm` z dashboard crona (06:00 UTC alebo ručné spustenie) — dôkaz, že model v okne odpovie.
- Overiť, že build preview prijal `maxDuration = 60` na Hobby.
- PR #764 (teraz nesie aj túto zmenu) čaká na „merguj 764"; auto-reload + nižší limit v Console; Resend doména.
### Kľúčové súbory zmenené
- `apps/crm/src/lib/ai/dashboard-insights.ts`, `dashboard-insights-cron.ts`,
  `apps/crm/src/app/api/cron/dashboard-insights/route.ts`; testy `dashboard-insights-window.test.ts` (nový),
  `dashboard-insights-cron.test.ts`.
### Ďalší krok
Merge → nasadenie → prečítať `ai_action_audit` po behu crona o 06:00 UTC (`source`, `failure_reason`).

## Session 2026-09-30 (PO DOPLNENÍ KREDITU)
### Dokončené
- Kredit doplnený (Console, 20 USD); `billing` zmizlo — dashboard cron 20:07 UTC (spustil Cursor)
  vrátil `timeout` (latencia ~800 ms), nie `billing`. Samotný `llm` úspech zatiaľ NEVIDENÝ.
- Nájdená príčina „dashboard nikdy `llm`": tvrdé 800 ms okno pri Haiku volaní s `max_tokens: 700`
  (`dashboard-insights.ts` ~237); `DASHBOARD_INSIGHTS_TIMEOUT_MS` ho neovplyvní.
### Rozpracované / Pending
- **GO DASHBOARD-LLM-WINDOW** (parameter okna + `maxDuration`, test + mutation proof).
- Dôkaz AI: Console Usage (Haiku po 20:00 UTC) alebo ďalší lead; kontrola naplánovaná 1. 10. 07:10 UTC.
- **PR #764 čaká na „merguj 764"**; auto-reload + nižší limit v Console; Resend doména `revolis.ai`.
### Kľúčové súbory zmenené
- `memory/decisions.md`, `memory/session-summary.md`: záznam (žiadna zmena kódu).
### Ďalší krok
GO DASHBOARD-LLM-WINDOW; `merguj 764`.

## Session 2026-09-30 (READ-REASON)
### Dokončené
- **READ-REASON** (read-only): AI volania odmieta Anthropic s dôvodom `billing` (HTTP 400,
  `invalid_request_error`) — 3 × `ai.call_failed` (triage 13:02 a 18:36, návrh odpovede 18:36 UTC)
  + dashboard cron 13:35 UTC. Teda **nedostatok kreditu**, nie kľúč ani kód. Detail a request-id:
  `memory/decisions.md`.
### Rozpracované / Pending
- **Founder (2 min):** Anthropic Console → Billing: doplniť kredit, zapnúť auto-reload + upozornenie.
- Po doplnení: read-only overenie (nový lead má `ai_triage_at`; `ai.call_failed` neprirastá).
- **PR #764 čaká na „merguj 764"** — nesie aj SSE filter (kým nie je na PROD, tenant môže vidieť
  `ai.call_failed` v hlavičke Playbooku). Potom prvý `inbound.auto_response`.
- Resend: doména `revolis.ai` „Partially Failed", `mg.revolis.ai` neexistuje (príčina auto-odpovede,
  nedokázaná). Backfill triage pre leady od 22. 9. — až po doplnení kreditu, vyžaduje GO.
### Kľúčové súbory zmenené
- `memory/decisions.md`, `memory/session-summary.md`: záznam (žiadna zmena kódu).
### Ďalší krok
Founder doplní Anthropic kredit → overiť ďalší lead; `merguj 764`.

## Session 2026-09-30 (AUTO-RESPONSE-VISIBLE)
### Dokončené
- **AUTO-RESPONSE-VISIBLE** (GO foundera): každý pokus o auto-odpoveď zapíše jeden záznam
  `platform_events` `inbound.auto_response` (výsledok + dôvod, bez PII a bez textu chyby); sender
  klasifikuje chyby Resendu (`domain_not_verified`, `auth`, `config`, …). Testy 31 + stream,
  mutation proof 11/11, lint čistý, typecheck 49.
- **Nález opravený v tom istom PR:** SSE stream tenanta už neposiela `ai.call_failed` ani
  `inbound.auto_response` (Playbook zobrazoval surový názov udalosti).
- **Zúžená príčina (nedokázaná):** Resend má len `revolis.ai` v stave „Partially Failed",
  `mg.revolis.ai` nie je; `RESEND_API_KEY` má vo Verceli odznak „Needs Attention".
### Rozpracované / Pending
- **Founder:** Resend → Logs (odmietnuté POST /emails) alebo otvoriť doménu `revolis.ai` a pozrieť,
  ktorý DNS záznam zlyháva; odznak „Needs Attention" pri `RESEND_API_KEY`; komu patrí reply-to profil
  (`ra***@gmail.com`).
- Po merge + nasadení: prvý nový lead vysvetlí sám seba (`inbound.auto_response`).
- READ-REASON 14:05 UTC; RLS oddelenie diagnostiky (BACKLOG); zvyšok z predošlých sekcií nezmenený.
### Kľúčové súbory zmenené
- `apps/crm/src/lib/acquire/{inbound-lead-auto-response,send-inbound-auto-response}.ts`,
  `auto-response-outcome.ts` (nový), `apps/crm/src/lib/platform-events-visibility.ts` (nový),
  `apps/crm/src/app/api/events/stream/route.ts`, `apps/crm/src/lib/ai/ai-failure-record.ts`.
### Ďalší krok
Merge PR (zelené CI) → nasadenie → prečítať `inbound.auto_response` pri ďalšom leade.

## Session 2026-09-30 (AUTO-RESPONSE-CHECK)
### Dokončené
- **AUTO-RESPONSE-CHECK** (read-only): `auto_response_sent_at` je NULL u **515 z 515** leadov, od
  začiatku — auto-odpoveď v PROD **nikdy nefungovala** (predchádzajúci zápis „6/6 od 19. 9." bol
  príliš úzky). Príčina NIE JE dokázaná (`RESEND_API_KEY`/`OUTREACH_FROM_EMAIL` a Resend doména
  neoverené); 4 tiché východy bez trvalej stopy v DB. Detail: `memory/decisions.md`.
- Riziko: reply-to = profil vlastníka agentúry `11111111-…` s gmail adresou (kto to je, neoverené).
### Rozpracované / Pending
- **Founder (2 min):** Vercel Team → Shared Env: `RESEND_API_KEY`, `OUTREACH_FROM_EMAIL`; Resend →
  Domains: `mg.revolis.ai` Verified; a kto je vlastník-profil agentúry `11111111-…` (gmail).
- **AUTO-RESPONSE-VISIBLE** — návrh (BUILD, malý PR); čaká na GO.
- READ-REASON 14:05 UTC; PR #764 čaká na merge; ostatné z predošlej sekcie nezmenené.
### Kľúčové súbory zmenené
- `memory/decisions.md`, `memory/session-summary.md`: záznam (žiadna zmena kódu).
### Ďalší krok
GO AUTO-RESPONSE-VISIBLE (viditeľnosť, nič sa neodosiela) + founderova 2-minútová kontrola env.

## Session 2026-09-30 (REALVIA-REPLAY)
### Dokončené
- **REALVIA-REPLAY** (PROD zápis, GO foundera): 31 zlyhaných `advert` webhookov opakovaných
  (krok 1 founder cez cron `replay_failed=1`, krok 2 ja — 5 `delete` jobov späť na `pending`).
  `properties` 132 → 149 (+17 ponúk), 4 ponuky stiahnuté správne („Stiahnutá"), fronta
  `pending` 0 / `failed` 1 (starý nesúvisiaci `unknown` z mája). Detail: `memory/decisions.md`.
- Pozorovania do BACKLOGu: globálny unique index `properties.source_id` v PROD (kód predpokladá
  per agentúra) a jednorazový create/create race (opravil sa retry-om).
### Rozpracované / Pending
- **Nedokázané:** oprava na ČERSTVOM webhooku — posledný webhook z Realvie je z 28. 9. 12:26 UTC.
- **READ-REASON** (dôvod zlyhania AI z PROD) — naplánované 14:05 UTC (`trig_019M6drrtpCz8n24hpjiFFPu`).
- Extrakcia referencie z Nehnuteľnosti.sk mailu (potrebný reálny súčasný mail); chyba pätičky
  ako názvu inzerátu.
- `auto_response_sent_at` NULL u 6/6 leadov od 19. 9. — neskúmané.
- Voliteľné: filter `ai.call_failed` v tenantovom SSE streame; DB default pre `properties.id`.
- Draft Smolkovi — founder výslovne odložil.
### Kľúčové súbory zmenené
- `memory/decisions.md`, `memory/session-summary.md`: záznam REPLAY (žiadna zmena kódu).
### Ďalší krok
AUTO-RESPONSE-CHECK: prečo `auto_response_sent_at` je NULL u 6/6 leadov od 19. 9. (read-only; GO).

## Session 2026-09-30 (REALVIA-CREATE-ID + LISTING-REF-CHECK)
### Dokončené
- **REALVIA-CREATE-ID** — nové ponuky z Realvie sa od 4. 9. nevytvárali: PR #522 prestal posielať
  `id`, `properties.id` je v PROD `NOT NULL` bez defaultu. 31 webhookov / 17 ponúk zlyhalo
  (11.–28. 9.). Oprava: `crypto.randomUUID()` v CREATE vetve, bez migrácie. Regresný test s DB
  dvojníkom, ktorý vynucuje PROD obmedzenie; mutation proof 5/5; starý test kódoval chybu
  (`not.toHaveProperty("id")`) — opravený.
- **LISTING-REF-CHECK** — atribúcia cez zákazku funguje technicky (`internal_reference` → maklér,
  132/132), ale dnes je mapovateľných len 2 z 11 leadov; parser berie pätičku „Odoslané z
  administračného systému" ako názov inzerátu.
- **Smolko:** odpoveď na e-mail z 29. 9. + 3 screenshoty (Nehnuteľnosti admin Dopyty/Klienti,
  Realvia „Klienti" vypnutá dodávateľom). Aspoň 4 stratené dopyty 23.–26. 9. Export klientov =
  1156 kontaktov bez poznámok a zákaziek.
- Detail, plán opakovania a Ústava: `memory/decisions.md` (záznam REALVIA-CREATE-ID).
### Rozpracované / Pending
- **Po merge a nasadení PR:** opakovanie 31 webhookov (GO + `CRON_SECRET` foundera). **Pozor na
  4 stiahnuté ponuky** — viď plán v `decisions.md`.
- **READ-REASON** (dôvod zlyhania AI z PROD) — naplánované 14:05 UTC; po nasadení #760.
- Reálny súčasný mail z Nehnuteľnosti.sk pre opravu extrakcie referencie.
- Draft Smolkovi — founder výslovne odložil.
### Kľúčové súbory zmenené
- `apps/crm/src/lib/realvia/processQueue.ts`: CREATE vetva generuje `id`; opravené komentáre.
- `apps/crm/src/lib/realvia/processQueue.create-id.test.ts` (nový), `processQueue.agency-scope.test.ts`
  (asercia opravená).
### Ďalší krok
Merge PR → overiť nasadenie → GO na opakovanie webhookov (12 + 1 bezpečných, 4 stiahnuté cez
re-pend delete jobov).

## Session 2026-09-30 (RAU — Revolis Agentic University)
### Dokončené
- Pokus zabiť plán + audit skutočného stavu (read-only): `docs/reports/2026-09-30-rau-w0-reality-audit.md`. Zistenia: Runner je z väčšej časti kontrakt, Model Router/Cost Governor neexistujú, „8 loopov" v repe nie je, Agent Factory prah je prekročený (4) → posúdenie Ústavou, Onlinovo.sk a AI Phone Operator chýbajú v zozname 7 projektov.
- RAU základ (zero-runtime): `docs/rau/` (README, RAU-v1.0, registry.json, routing-rules.json, 24 promptov P00–P23), skill `.claude/skills/rau/SKILL.md`, router `scripts/ops/rau-route.mjs`, test `apps/crm/tests/verification/rau.verification.test.ts`.
- Dôkaz: 152 testov (vitest) zelených; lint, typecheck ratchet a API contract PASS lokálne (`scripts/ci/prepush-gate.sh`); mutačný dôkaz 56/56 (každá sabotáž zhasne test); tri nezávislé slepé sady, prvý beh na zmrazenom routeri: gate presne 61 % / 80 % / 40 %, nebezpečné podhodnotenia 3 / 2 / 6 (adverzariálna sada); nezávislý review *SHIP WITH FIXES* → opravené. **CI na PR zatiaľ nebežala; nič nie je VERIFIED v produkcii.**
- Záznam v `memory/decisions.md` (BUILD len vrstvy bez runtime; ťažké časti BACKLOG; veto Q1 vedome prekročené foundrom).
### Rozpracované / Pending
- **Draft PR #759 čaká na foundera** (merge = „merguj 759"); CI zelená na `7f713a4`. Merge spustí Vercel build `apps/crm` (v diffe sú len testy).
- Founder: Onlinovo.sk / AI Phone Operator; kto je „Nájomná agentúra"/„Proon"; kde žije Mia; denylist auto-merge pre RAU cesty (`.github/` je Tier 3); krok C (Stripe ceny) má prednosť.
- Finálna verzia routeru nemá čerstvú slepú sadu (NEZMERANÉ); YouTube/EÚ pravidlá NEOVERENÉ.
- Nástroje: MCP servery Ruflo a onlinovo sa nepripojili (CONNECTION_CLOSED); priložená kópia chatu nebola k dispozícii.
### Kľúčové súbory zmenené
- docs/rau/*: README, RAU-v1.0, registry.json, routing-rules.json, prompts/P00–P23
- .claude/skills/rau/SKILL.md: Rector (pridaný cez `git add -f`, priečinok je v .gitignore ako ostatné skills)
- scripts/ops/rau-route.mjs: deterministický router (PTC)
- apps/crm/tests/verification/rau.verification.test.ts: verifikácia
- docs/reports/2026-09-30-rau-w0-reality-audit.md: audit W0
- memory/decisions.md, memory/session-summary.md, memory/open-tasks.md
### Ďalší krok
Founder: krok C v Stripe live mode (`bash scripts/ops/stripe-verify-prices.sh --spec`) — najrýchlejšia cesta k príjmu. Potom rozhodnutie o merge draft PR s RAU.

## Session 2026-09-30 (AI-FAIL-VISIBLE)

### Dokončené
- **AI-FAIL-VISIBLE** — zlyhanie volania na LLM po sebe zanechá stopu: kód dôvodu
  (`auth` / `billing` / `rate_limit` / `timeout` / `config` …), HTTP status, request-id; **nikdy
  text chyby**. Rieši viditeľnosť, nie príčinu (tá je stále neznáma).
- `withAiTimeout` loguje každé zlyhanie na `warn` vrátane pozdného odmietnutia po timeoute;
  správanie sa nezmenilo. Inbound triage a AI návrh zapisujú `ai.call_failed` do
  `platform_events`; `dashboard_insights` nesie `failure_*` v `ai_action_audit.meta`.
- Dôkaz: 97 zelených testov na dotknutých súboroch, **mutation proof 14/14**, lint čistý,
  typecheck ratchet 49 ≤ 54 (žiadna chyba v mojich súboroch). Bez migrácie.
- Detail, SQL na zistenie príčiny a riziká: `memory/decisions.md` (záznam AI-FAIL-VISIBLE).

### Rozpracované / Pending
- **Po nasadení PR**: spustiť SQL z `decisions.md` — dôvod uvidíme z `ai_action_audit` po
  najbližšom cron behu (~06:24 alebo ~13:35 UTC), z `platform_events` po ďalšom leade.
- **Founder (2 min):** Anthropic Console (chyby požiadaviek, kredit) + dátum zmeny
  `ANTHROPIC_API_KEY` vo Vercel env — môže príčinu určiť skôr než nasadenie.
- **Riziko:** `ai.call_failed` ide cez SSE stream tenanta (`/api/events/stream`); kód `billing`
  by klient videl v sieťovom paneli. Filter je samostatná malá zmena, nerobená.
- Zostáva: `auto_response_sent_at` NULL u 6 z 6 leadov, `dashboard_insights` nikdy `llm`.

### Kľúčové súbory zmenené
- `apps/crm/src/lib/ai/ai-failure.ts` (nový), `ai-failure-record.ts` (nový): klasifikácia + záznam.
- `apps/crm/src/lib/ai/fallback.ts`: `withAiTimeout` s logom a `onFailure`.
- `apps/crm/src/lib/{inbound/auto-reply,inbound/reply-draft,acquire/inbound-lead-triage}.ts`,
  `lib/ai/{dashboard-insights,dashboard-insights-cron}.ts`: dôvod do výsledku, logu a záznamu.
- 5 volajúcich `withAiTimeout` dostalo názov funkcie.
- 6 nových / rozšírených testových súborov.

### Ďalší krok
Podľa zistenej príčiny (`reason` z SQL v `decisions.md`). Ak `timeout` → iný problém než kľúč
(okno 500–800 ms); ak `auth`/`billing` → krok foundera v Anthropic Console / Vercel env.

## Session 2026-09-30 (LEAD-NO-DRAFT — read-only)

### Dokončené
- **LEAD-NO-DRAFT** — regresia lokalizovaná, príčina **nedokázaná**. Detail a tabuľka dôkazov:
  `memory/decisions.md` (záznam 2026-09-30 „LEAD-NO-DRAFT").
- Posledné `ai_triage_at` v celej DB je 2026-09-22 09:13:15; 3 z 3 leadov po výpadku nemajú
  triage ani AI návrh; cron 05:00 ich za dve noci nespracoval.
- Vylúčené: ID modelu, constraint/trigger na `leads`, `no_email`, auto-response krok,
  schéma `activities`.
- **Lead z Nehnuteľnosti.sk dnes 07:05 vznikol** → oprava #732/#739 na portálovej ceste
  funguje (n = 1).
- Korekcie #755: „v okne nula z portálu" bolo nesprávne, „2 z 2" je 3 z 3.

### Rozpracované / Pending
- **Skutočná chyba volania Claude je neznáma** — kód ju prehltne, logy expirujú za ~1 h.
- **Founder (2 min):** Anthropic Console (chyby požiadaviek, kredit) + dátum zmeny
  `ANTHROPIC_API_KEY` vo Vercel env.
- `auto_response_sent_at` NULL u 6 z 6 leadov; `dashboard_insights` 0 z 212 `llm`.
- Klon je plytký od 25. 9. — 22.–25. 9. v kóde neoverené.

### Kľúčové súbory zmenené
- `memory/decisions.md`, `memory/session-summary.md`: PREPEND. Žiadna zmena kódu ani DB.

### Ďalší krok
AI-FAIL-VISIBLE (malý PR): logovať triedu chyby a HTTP status pri zlyhaní AI volania a zapísať
trvalý dôvod pri zlyhanom triage/drafte. Čaká na GO.
## Session 2026-09-30 (UPTM-018 — `account_equity` ostáva v packu)
### Dokončené
- **Founder GO na UPTM-018 → rozhodnutie „len v packu, nič v repe nestavať"** (`DEC-UPTM-018`). `onlinovosk-bit/uptm-runner` [#54](https://github.com/onlinovosk-bit/uptm-runner/pull/54) (draft, nemergovať bez „merguj 54").
- **Oprava mojej chybnej premisy z 2026-09-29.** UPTM-018 nebol „dve čísla od foundera" ani „700 je len fixture": `validation_capital.amount` = 700 € je **nastavené founderom 2026-09-23** (`DEC-UPTM-004`, `set_by: founder`). Chýba jediný údaj, `capital.account_equity`, a ten je údaj **packu**, nie parameter repa (`DEC-UPTM-MAP-Q3`). Zdroj omylu: zastaraná próza `uptm004_detector.founder_parameter_required` („unset") — opravená na `SATISFIED 2026-09-23`.
- Guard (25 testov): status v poznámke sa musí rovnať stavu troch parametrov, odvodený z dát, v oboch smeroch. **L2 zmerané:** pod mutáciou ostáva všetkých 804 existujúcich testov zelených → záznam nebol strážený. 877 passed, mutation-gate 35/35, `enforcement-evidence` `tree_clean`, `unproven_claims: []`.
### Rozpracované / Pending
- ~~Merge #54~~ — hotovo: zmergované founderom 2026-09-30 (`f7b0550`), overené obsahom na `main` (poznámka `SATISFIED`, guard, `DEC-UPTM-018`, mutation case; 877 passed).
- **`account_equity`:** zadá founder do prvého reálneho packu (systém, ktorý drží účet). Dovtedy capital gaty končia na `UNKNOWN` — zamýšľaný stav, nie medzera.
- Zastaraná próza sa môže objaviť aj inde v `capital-rules.json` (`open_limits`, `checks_note`); guard stráži len jednu poznámku. Neriešené.
- Záznam 2026-09-25 `DEC-UPTM-MAP-Q3` v `uptm-runner/docs/decisions.md` stále „stays OPEN" bez odkazu na DEC-UPTM-017 — rozhodnutie foundera.
### Kľúčové súbory zmenené (uptm-runner)
- constitution/capital-rules.json: poznámka `founder_parameter_required` opravená (nič nepridané do ústavy)
- tests/test_capital_parameter_status.py: nový guard
- runner/mutation_gate.py: +1 case `capital-note-claims-unset-again`
- docs/decisions.md: `DEC-UPTM-018`; docs/specs/UPTM-018-account-equity-stays-in-the-pack.md
### Ďalší krok
Founder: „merguj 756" (tento záznam). Potom najvyššia hodnota je v RealitkaAI, nie v UPTM: **CHECKOUT-ENV-01 krok C** (blokér príjmu — vytvoriť ceny v Stripe live mode podľa `bash scripts/ops/stripe-verify-prices.sh --spec`, potom VERIFY). Podľa `memory/open-tasks.md`, dnes znova neoverené.

## Session 2026-09-30 (GO MAILBOX — read-only)

### Dokončené
- **GO MAILBOX** — `to_unmatched` neznamená „adresa chýba v tabuľke": loguje sa pri `!owner`,
  teda aj pri riadku s `profile_id = NULL`. Dokázané zhodou logu `07:36:32` s heartbeatom
  `smolko-a7f2@revolis.ai` `07:36:33.8`. Detail + tabuľka dôkazov: `memory/decisions.md`
  (záznam 2026-09-30).
- Od 22. 9. 07:40 nedostala mail žiadna z 8 maklérskych schránok (7× NULL heartbeat).
- Dnešných 7 mailov v okne 06:30–07:36 UTC = 7 rôznych nie-portálových domén (newslettre,
  softvér, asociácia). Parser ich zamieta správne.
- Korekcie: #743 je už zmergovaný (`b898322`); existuje aj lead `portal:Reality.sk` z 29. 9.
  01:32 UTC (pred #732); AI návrh chýba obom gateway leadom (2 z 2), nie jednému.

### Rozpracované / Pending
- **Obálka vs. hlavička `To`** — stále neuzavreté, čaká na prvý maklérsky preposlaný mail.
- **Prečo gateway leady nemajú AI návrh / `ai_triage_at`** — nepreverené (kód `reply-draft.ts`
  + cron `lead-ai-triage`).
- **Tok celej pošty `office@` do príjmu** — GDPR minimalizácia, riešiť filtrom na strane Gmailu.
- **`gmail-pull.ts` `.limit(1)` bez `ORDER BY`** — latentné, dormantné, neopravené.
- Zostáva z 29. 9.: kontrakt Workera mimo repa, #370, chýbajúci `gdpr-advisor`.

### Kľúčové súbory zmenené
- `memory/decisions.md`: záznam GO MAILBOX (PREPEND).
- `memory/session-summary.md`: tento záznam (PREPEND).
- Žiadna zmena kódu ani DB.

### Ďalší krok
LEAD-NO-DRAFT: zistiť, prečo dva gateway leady nemajú aktivity ani `ai_triage_at`
(read-only: `lib/inbound/reply-draft.ts`, cron `lead-ai-triage`, PROD SELECT). Čaká na GO.
## Session 2026-09-29 (UPTM-018a — uptm-runner, #52 a #53 ZMERGOVANÉ 2026-09-30)
### Dokončené
- **Zmergované founderom 2026-09-30, overené obsahom na `origin/main` (`154e2c9`):** #52 aj #53. Na `main`: 851 passed, syntax gate OK, mutation-gate 34/34 `ok`, enforcement-evidence `tree_clean`, `unproven_claims: []`. Mapa už neobsahuje „unadopted"; guard aj mutation case sú v `main`.
- **UPTM-018a** → `onlinovosk-bit/uptm-runner` [#53](https://github.com/onlinovosk-bit/uptm-runner/pull/53) (draft, nemergovať bez „merguj 53"). `governance-map.md` už nehovorí, že Q3 je „unadopted"; nový **obojstranný** guard (18 testov) + 1 mutation case. Spec preregistrovaný v samostatnom commite pred implementáciou (P4).
  - **L2 zmerané, nie tvrdené:** pod tou istou mutáciou je starý jednostranný test GREEN, nový guard RED.
  - Na pôvodnej mape guard hlási presne jeden rozpor (Q3); Q1/Q2/Q5 čisté.
- **`main` v uptm-runner bol dnes červený** (druhá časová bomba po #50: 8 failed pri 21:03Z, 9 od 30. 9. 08:00Z) → oprava ako samostatný draft [#52](https://github.com/onlinovosk-bit/uptm-runner/pull/52). Množina bômb **zmeraná posunom hodín** (freezegun na 4 dátumoch, +3 mesiace), nie hádaná: 830 passed všade.
- Plný beh na lokálnej integračnej vetve (018a + #52): 851 passed, syntax gate OK, mutation-gate 34/34 `ok`, enforcement-evidence `tree_clean`, `unproven_claims: []`.
### Rozpracované / Pending
- ~~Merge #52/#53~~ — hotovo (viď hore). Do `main` sa dostal aj port opravy v #53 bez duplicity (ten istý commit `3a3b5e6`).
- **UPTM-018 čaká na foundera:** dve čísla (`capital.account_equity`, `validation_capital.amount`) — bez nich VC-I5/VC-I6 končia na `UNKNOWN`. Nezmenené.
- `uptm-runner/docs/decisions.md`, záznam 2026-09-25 `DEC-UPTM-MAP-Q3` („stays OPEN") nemá odkaz dopredu na DEC-UPTM-017. Poznamenané, **neopravené** — rozhodnutie foundera.
- Vložený „Prompt OS / dve dráhy / 8 slučiek" text: neboli v ňom pokyny pre túto session, nič sa nestavalo. Vrecková karta čaká na GO a odpoveď, **ktorá slučka je prvá** v živom teste u makléra.
### Kľúčové súbory zmenené (uptm-runner)
- docs/specs/UPTM-018a-map-q3-record-contradiction.md: spec + výsledok
- docs/architecture/governance-map.md: odsek „two capital numbers" hovorí, čo Q3 rozhodol
- tests/test_governance_map_consistency.py: nový guard
- runner/mutation_gate.py: +2 cases (`map-q3-relation-reads-unadopted-again` v #53, `drill-fixture-pinned-to-a-date` v #52)
- tests/test_detector_invocation.py: dátumy drillu ako vek, nie kalendár (#52)
### Ďalší krok
Founder: dve čísla pre UPTM-018 (`capital.account_equity`, `validation_capital.amount`) — bez nich VC-I5/VC-I6 končia na `UNKNOWN`. Nezačaté, nič nie je rozpracované na disku.

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
## Session 2026-09-29 (PROON-AUDIT)
### Dokončené
- Audit Proon Channel Manager + mapovanie na Revolis + 1-týždňová roadmapa: `docs/reports/2026-09-29-proon-channel-manager-audit.md`
- Founder zvolil Projekt B (krátkodobé prenájmy, samostatne): plán, roadmapa, agentický workflow v `docs/strategy/2026-09-29-projekt-b-str-plan.md` (Channex + Seam, pilot za 1 týždeň, parita 6–8 týždňov)
- Gap audit Demand OS nad kódom + PROD dátami, upravený 7-dňový sprint: `docs/reports/2026-09-29-demand-os-gap-audit.md`
### Rozpracované / Pending
- Proon: founder dodal screenshoty a text webu (vrátane cenníka); priamy crawl v prostredí stále blokovaný.
- Founder GO: nový repo + názov, entita/vlastníctvo kódu, pilotný ubytovateľ, účty Channex/Seam.
### Kľúčové súbory zmenené
- `docs/reports/2026-09-29-proon-channel-manager-audit.md`: nový report
- `memory/decisions.md`, `memory/session-summary.md`: prepend
### Ďalší krok
`GO DEMAND-D1` — extrakcia dopytu z portálových e-mailov (94 % leadov bez dopytu); paralelne `GO B-REPO` pre Projekt B.

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

> **PRVÁ VEC PRE NOVÚ SESSION:** Founder dal **GO na UPTM-018a**. Vetva
> `claude/map-q3-record-contradiction` je založená z `origin/main` (`5dfb832`),
> **bez commitov**. Nič nie je rozpracované na disku — začni preregistráciou
> špecifikácie (P4), viď „Ďalší krok".

**Repozitár:** `onlinovosk-bit/uptm-runner`, klon v `/home/user/uptm-runner`.
Primárny pracovný adresár session je `/home/user/RealitkaAI`.
**UPTM rozhodnutia patria do `uptm-runner`, nie do RealitkaAI.**

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

## Session 2026-08-27
### Dokončené
- Critical bug hunt: assignment rules cross-tenant wipe → PR #490
- Report: `docs/reports/2026-08-27-assignment-rules-tenant-gate.md`
### Rozpracované / Pending
- Founder merge #490 (+ older critical-bug PRs still open)
- Ops backfill NULL agency_id on lead_assignment_rules after migrate
### Kľúčové súbory zmenené
- `apps/crm/src/lib/lead-automation-store.ts`: scoped client + agencyId
- `apps/crm/supabase/migrations/20260827230000_lead_assignment_rules_tenant_rls.sql`: tenant RLS
### Ďalší krok
Founder merge #490 after CI green; apply migration on prod.

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
