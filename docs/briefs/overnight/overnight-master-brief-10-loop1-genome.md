# OVERNIGHT MASTER BRIEF 10 — Loop 1 (Revenue) + Genome substrát
Repo: `C:\RealitkaAI` · Stack: Next.js / TypeScript / Supabase / Stripe / Vercel
Cieľový repo path tohto briefu: `docs/briefs/overnight/overnight-master-brief-10-loop1-genome.md`
**SELF-CONTAINED** — Cursor nemá kontext predchádzajúcej diskusie. Čítaj celé.

---

## 0. KONTEXT
- **North Star r4:** Revolis nie je AI pre realitky. Revolis je systém, ktorý sa s každou kanceláriou stáva inteligentnejším pre všetky ostatné (Knowledge Monopoly). Loops: **Revenue → Learning → Network → Evolution.**
- Túto noc staviame **Loop 1 (Revenue) = Follow-up Agent** a napájame ho na **Loop 2 (Learning)**, ktorého dátový substrát už existuje.
- Tabuľky `public.decisions` (Prediction Registry) a `public.exclusivity_outcomes` (Genome) **UŽ EXISTUJÚ** v DB (migrácia spustená manuálne, je idempotentná — `create … if not exists` / `create or replace view`).

## ZAKÁZANÉ AKCIE — HARD, platí pre VŠETKÝCH agentov
1. **ŽIADNE auto-odosielanie** e-mailov/správ prospektom. Follow-up Agent je **DRAFT-ONLY**: vygeneruje návrh + zaloguje predikciu; človek schvaľuje a odosiela.
2. **ŽIADNY cron / scheduled auto-run.**
3. **ŽIADNA nová prod migrácia, žiadny prod DELETE/UPDATE.**
4. **ŽIADNY merge do `main`.** Každý agent končí na: commit → push → otvor PR → CI zelená → **STOP**.
5. Žiadny skrytý recruiter, scraping portálov, arbitráž.

## ORCHESTRÁCIA — 3 paralelné, NEkrížiace sa vlny
**Dôkaz nekríženia (path prefixy, verifikované — nie odhad):**
- **Wave A:** `apps/crm/src/lib/agents/followup/**`, `apps/crm/src/app/api/followup/**`, `apps/crm/supabase/migrations/2026_genome_layer2.sql`
- **Wave B:** `memory/decisions.md`, `docs/architecture/**`
- **Wave C:** `docs/briefs/**`, `docs/prompts/**`, `docs/*.md` (root), `docs/archive/**`

Žiaden súbor sa nezdieľa. B aj C sú pod `docs/`, ale disjunktné podstromy — **C sa `docs/architecture/` NEDOTÝKA**. Žiadna dátová závislosť medzi vlnami → bežia súčasne.

## PHASE 0 — write-probe (každý orchestrátor, PRED reálnou prácou)
1. Vytvor vetvu. 2. Triviálny commit (`.gitkeep`). 3. Push. 4. Over, že PR aj CI pipeline reálne nabehnú. Ak Phase 0 zlyhá → STOP, nič nečisti, nahlás do PR popisu.

---

## WAVE A — Follow-up Agent · vetva `feat/followup-agent-loop1`
Orchestrátor A. Agenti **SEKVENČNE na jednej vetve** (majú dátovú závislosť → nie paralelne).

- **A0 — migrácia do repa:** pridaj `apps/crm/supabase/migrations/2026_genome_layer2.sql` (idempotentná; CI ju použije na *ephemeral lokálny* Supabase — nie prod). Bez nej Wave A CI padne (tabuľky v testovacej DB nebudú). SQL skopíruj z PROD (už manuálne aplikované) — `create … if not exists` / `create or replace view`.
- **A1 — `apps/crm/src/lib/agents/followup/types.ts`:** typy `FollowupDecision`, `Prediction`, `DraftAction`.
- **A2 — `apps/crm/src/lib/agents/followup/engine.ts`:** pre daný lead vyber ďalšiu follow-up akciu podľa pravidiel (čas od posledného kontaktu, stav leadu, zdroj). Vracia odporúčanú akciu + **DRAFT text**. Žiadne odosielanie. Reuse vzory z `open-followup-generator.ts` / `follow-up-sweep` ak existujú — nekopíruj celé.
- **A3 — `apps/crm/src/lib/agents/followup/predictionWriter.ts`:** zapíš riadok do `decisions` s `decision`, `p_outcome`, `expected_value_eur`, `confidence`, `expected_outcome`, `status='open'`, `agency_id = 11111111-1111-1111-1111-111111111111`, `lead_id` (text).
- **A4 — `apps/crm/src/app/api/followup/route.ts`:** POST endpoint — pre Smolko agency prejde leady, zavolá engine, zapíše predikcie cez predictionWriter, vráti **zoznam DRAFTOV na schválenie**. DRAFT-ONLY, žiadny send.
- **A5 — `apps/crm/src/lib/agents/followup/kpi.ts`:** vypočítaj `% leadov kontaktovaných do 24h` — to je číslo do Smolko case study.
- **A6 — testy:** `apps/crm/src/lib/agents/followup/__tests__/*` — unit testy engine + predictionWriter (mock Supabase). Deterministický čas cez optional `nowMs` hook (vzor AP-013), nie `Date.now()` priamo.
- **Guardian:** ak existuje Guardian capability, presmeruj generované drafty cezeň (NEreimplementuj). Ak nie, nechaj `// TODO: route through Guardian before 5/5`.

Koniec A: commit → push → PR „Loop 1 Follow-up Agent (draft-only) + Genome substrát" → CI zelená → STOP.

## WAVE B — Governance docs · vetva `chore/governance-northstar-r4`
Orchestrátor B. Append/new súbory → nekolidujú.

- **B1 — `docs/architecture/north-star-2027-2030.md`** (r4):
  - Hlavička: *„Revolis buduje systém, ktorý sa s každou novou kanceláriou stáva inteligentnejším pre všetky ostatné — bez porušenia ich súkromia. Ak to feature nerobí, nie je to moat."*
  - Loop 1 Revenue (staviame) · Loop 2 Learning (substrát žije) · Loop 3 Network (smer, nemožný pred zákazníkom #2) · Loop 4 Evolution = Genome Factory (smer, za Guardian 5/5 + human approval).
  - Genome Test: feature sa stavia len ak má 30-dňové KPI pre zákazníka **A** zapisuje do Genome.
- **B2 — `docs/architecture/l99-parked-concepts.md`:** zaparkované — Neural Core, Founder Brain, Contrarian Brain, Counterfactual Engine, Market Memory, Genome Factory (auto-deploy polovica). Dôvod: nemajú dáta / za Guardian.
- **B3 — `memory/decisions.md`:** APPEND (nemeň existujúce riadky) AP-015 až AP-018 (North Star r2→r4, Genome entity prijaté, Genome Factory rozdelený, architektúra uzavretá → pivot na exekúciu).

Koniec B: commit → push → PR → CI → STOP.

## WAVE C — Repo hygiene · vetva `chore/repo-hygiene-docs`
Orchestrátor C. Rieši otvorené TODO 1–3.

- **C1:** pridaj chýbajúci `docs/briefs/overnight/overnight-master-brief-6.md` (placeholder s poznámkou „medzera v číslovaní, rekonštruovať").
- **C2:** `git mv` `docs/briefs/overnight/cursor-brief-demo-page-final*` a `recruiting-modul-brief*` → `docs/prompts/`.
- **C3:** `docs/` root — `git mv` `MASTER_PROMPT_V3.md`, `MASTER_PROMPT*`, `AGENT_STANDARD*`, `progress*` → `docs/archive/`. **Pred každým mv** sprav `grep -r` na názov v kóde; ak je referencovaný, nechaj na mieste a nahlás v PR.

Koniec C: commit → push → PR → CI → STOP.

---

## RÁNO — checklist pre Andyho (toto je BRÁNA)
1. 3 PR-ká, všetky CI zelené? Ak nie → pozri PR popis, nemerguj.
2. Merge poradie: **B, C, A** (docs prvé, feature posledná — najmenej rizika).
3. Po merge A: spusti `POST /api/followup` pre Smolko, pozri vygenerované DRAFTY (neodoslané) a prvé riadky v `decisions`.
4. Guardian 5/5 PROD ostáva tvoj manuálny smoke — bez neho follow-up agent nie je predajný argument.
