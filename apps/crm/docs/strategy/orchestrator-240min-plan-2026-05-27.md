# L99 Orchestrator — 240 minútový plán (2026-05-27)

> **Audience:** Product owner (sekcie A–G) + technický dodatok  
> **Okno:** Ruflo autopilot 240 min · session `8e749a26-0cae-42cc-8d3e-22b2af832494`  
> **Overené:** 2026-05-27 ~23:12 CET · `origin/main` + `gh pr list` + Vitest program suites

---

## A. Executive summary (5 bullets)

1. **P0 dnes nie je nový kód, ale dôkaz v produkcii** — po merge [#75](https://github.com/onlinovosk-bit/RealitkaAI/pull/75) (filtre/iniciály) a [#69](https://github.com/onlinovosk-bit/RealitkaAI/pull/69) (leads browser-first) treba **prod smoke** na `app.revolis.ai` pre Smolko: `tenant-health` → `counts.leads` > 0, `/contacts` a `/leads` zhodný počet.
2. **Skutočná príčina „0 klientov“ môže pretrvávať** — lokálna vetva `fix/smolko-contacts-root-cause` (subagent `4fd22d88`) rieši **`profiles.auth_user_id` prázdne → RLS 0**; to nie je len UX filtrov (#75). **STOP** merge ďalších featúr, kým tenant-health na prod nie je zelený.
3. **Programové testy v kóde sú zelené (40/40 Vitest)**, ale to **neznamená 100 % produkt** — chýba e2e na živých účtoch, env pre rescue/decision, Realvia replay (#66) a Event Scheduler UI (0 % v #70).
4. **Merge fronta dnes (ak smoke prejde):** dokončiť/auth fix PR z root-cause vetvy → **#66** Realvia → **#70** Event Scheduler backend → **nespájať #72** Stealth Recruiter bez explicitného OK.
5. **Nerobiť full re-audit** — stačí **cieľový smoke ~30 min / program** + aktualizácia task boardu po každom merge.

---

## B. 4 programy — % funkčnosti

| Program | Cena | Odhad % | Dôkaz (dnes) | Top 3 medzery |
|---------|------|---------|--------------|---------------|
| **Smart Start** | 49 € | **~68 %** | Vitest **16/16** v `smart-active-program-features.test.ts` (časť Smart); registry `smart`, menu `agent_solo`, routes existujú | 1) **Prod RLS / `auth_user_id`** — 0 klientov ak profil nie je prepojený 2) **`canViewClosingWindow`** bez UI 3) **`/performance`** len redirect na dashboard |
| **Radar makléra / Active Force** | 99 € | **~74 %** | Rovnaký súbor + `canViewForecast`; dedičnosť `radar`+`smart` v testoch | 1) **Realvia auto-import** env/cron (#66) 2) **Forecast** závisí od deploy + tier 3) **Tímový pipeline** — manuálny smoke `agent_team` chýba v CI |
| **Strážca / Market Vision** | 199 € | **~77 %** | Audit doc; Vitest **10/10** `market-vision-features.test.ts` | 1) **Guardian alerts** stub 2) **Rescue/decision** `RESCUE_AUTOMATION_ENABLED` / `DECISION_ENGINE_ENABLED` off v prod 3) **RLS KPI nuly** na owner účte bez deploy overenia |
| **Reality Monopol / Protocol** | 449 € | **~72 %** | Vitest **14/14** `reality-monopol-program-features.test.ts`; menu `owner_protocol`, `/l99-hub` | 1) **`canUseMonopolDominance`** bez UI 2) **Competition radar** nie všade cez `useCapabilities` 3) **API / white-label / AM** z marketing matrix — manuálne neoverené |

**Poznámka k %:** Vitest meria **licencie, menu a existenciu súborov**, nie živé dáta ani SMS/kalendár. Produkcia môže byť **o 10–20 % nižšia** pri zlyhaní RLS alebo cron.

### Vitest súhrn (lokálne 2026-05-27)

```text
market-vision-features.test.ts          10 passed
smart-active-program-features.test.ts  16 passed
reality-monopol-program-features.test.ts 14 passed
───────────────────────────────────────────────
Spolu                                   40 passed
```

---

## C. 240-minútový časový plán

| Minúty | Blok | Režim | Vlastník | Výstup |
|--------|------|-------|----------|--------|
| **0–30** | **P0 prod smoke + Smolko closure** | Sekvenčné | Zuzana (QA) + subagent `4fd22d88` | Checklist: login Smolko → `GET /api/crm/tenant-health` → `/contacts`, `/leads`, `/properties` |
| **30–60** | **Root-cause PR** (`auth_user_id` / `linkProfileToAuthUser`) | Paralelne s dokumentáciou QA | Tomáš (backend) | PR z `fix/smolko-contacts-root-cause`, CI zelené, preview smoke |
| **60–90** | **Deploy overenie #75 + #69** | Sekvenčné po merge root-cause | Zuzana | Screenshot/log: počty > 0; ak nie → **STOP** (nižšie) |
| **90–120** | **Merge #66** Realvia replay | Sekvenčné | Tomáš + Zuzana | CI ✅ Vercel ✅ (overené 20:29 UTC); staging migrácia ak treba |
| **120–165** | **Merge #70** Event Scheduler Phase 1 | Sekvenčné | Tomáš | Apply `20260527143000_event_scheduler_phase1.sql` na staging; smoke `POST/GET /api/scheduled-events` |
| **165–195** | **Cieľový program smoke** (4× ~7 min) | Paralelne 2 účty ak možné | Martin | 1 stránka / program z auditu (nižšie E) |
| **195–220** | **Brand parity spike** (nie full audit) | Paralelne docs | Peter | Gap list: `apps/marketing` ↔ `/porovnanie-programov` (max 5 riadkov) |
| **220–240** | **Board sync + Ruflo handoff** | Sekvenčné | Orchestrator | Aktualizovať `orchestrator-task-board.md`; zapísať čo ostáva na zajtra |

### Paralel vs sekvenčné

- **Paralelne:** program smoke (účty starter/pro/market_vision/protocol), brand gap list, Vitest re-run na CI vetvách.
- **Sekvenčné:** prod smoke → auth fix merge → Realvia #66 → Event #70 (migrácia DB medzi krokmi).

### STOP conditions (zastaviť autopilot merge)

1. `tenant-health` → `counts.leads === 0` **a** Supabase má dáta pre agentúru.
2. Preview smoke po merge zlyhá 2× na tom istom kroku.
3. Event Scheduler migrácia na staging zlyhá (rollback vetvy #70).
4. Produkt owner **neodoslal** VISIT REAL onboarding email a zároveň nie je potvrdený preview copy (#73 už merged — overiť text na prod).

---

## D. Čo už beží (neprekladať slepo)

| Položka | % (task board) | Stav dnes | Poznámka |
|---------|----------------|-----------|----------|
| Leads UI 451→0 | 85 % | #69 merged | Overiť prod, nie nový fix |
| Smolko 0 contacts | ~75 % | #75 **merged**; root-cause vetva **rozpracovaná** | Subagent `4fd22d88` — `auth_user_id` |
| Copy + VISIT REAL + MV audit | 90 % → **100 % merge** | #73 **merged** | User action: odoslať email |
| Realvia replay #66 | 80 % | OPEN, CI ✅ Vercel ✅ | Board mal Vercel ❌ — **aktualizované** |
| Event Scheduler #70 | 40 % | OPEN, CI ✅ (board mal ❌) | UI fáza 0 % — samostatný PR |
| Stealth Recruiter #72 | 85 % | OPEN | **Defer** — bez product sign-off |
| Brand parity | 10 % | Not started | Len spike dnes |
| Competitive docs + board | 95 % | Tento dokument | Sync po smoke |
| P0 reliability #68 | 100 % | Merged | Monitor cron |
| AI Decision Ops #65 | 100 % | Merged | Env v Vercel |

---

## E. Re-audit všetkých featúr dnes?

**Odporúčanie: NIE — cielený smoke, nie full re-audit.**

| Program | Max čas | Čo skontrolovať |
|---------|---------|-----------------|
| Smart Start | 25 min | `/dashboard`, `/leads`, `/tasks`, `/properties`; `/forecast` = paywall |
| Active Force | 30 min | + `/forecast` plný; Realvia queue (ak #66 merged) |
| Market Vision | 30 min | `/dashboard`, `/forecast`, `/team`, `/l99-hub?tab=ghost`, `/revolis-ai` |
| Protocol | 30 min | MV + sidebar „Kde konkurencia spí“, `/l99-hub` CompetitionMap |

**Full re-audit** len ak P0 smoke zlyhá alebo po 3+ merge v jeden deň (regresný deň).

---

## F. Poradie merge (ak CI zelené)

Aktualizované o stav **2026-05-27 večer**:

```text
1. [HOTFIX] fix/smolko-contacts-root-cause  →  PR  →  deploy  →  prod smoke (tenant-health)
2. #75 už na main — overiť po deploy (filtre/iniciály), nie merge znova
3. #66 Realvia replay
4. #70 Event Scheduler Phase 1 (+ staging migrácia)
5. DEFER #72 Stealth Recruiter
6. Zatvoriť / archivovať staré Smolko slate PR (#14–#30) — mimo dnešného okna
```

**Nepáčiť dnes:** #72, Proposal Generator, Mobile native, banking.

---

## G. Riziká a akcie používateľa

| Riziko | Dopad | Akcia |
|--------|-------|-------|
| **Prod deploy lag** (5–15 min) | Smoke hneď po merge ukáže starý stav | Počkať na Vercel Production Ready, potom tvrdý refresh |
| **`auth_user_id` prázdne** | RLS 0 naprieč modulmi | Merge root-cause PR; v Supabase jednorazovo prepojiť Smolko profil |
| **Realvia queue** bez #66 | Importy visia | Merge #66; overiť `REALVIA_*` env |
| **Event Scheduler bez migrácie** | API 500 | Staging SQL pred prod merge #70 |
| **Guardian/rescue vypnuté** | Market Vision vyzerá „polovičný“ | Vercel staging: `RESCUE_AUTOMATION_ENABLED`, `DECISION_ENGINE_ENABLED` (nie nutne prod dnes) |
| **VISIT REAL email** | Onboarding blokovaný obchodne | **Andrej:** odoslať onboarding email po potvrdení copy na `/porovnanie-programov` |
| **Subagent duplicita** | Dva fixy rovnakého incidentu | Jeden owner: `4fd22d88` dokončí vetvu; UX z #75 už merged |

---

# Technický dodatok

## Otvorené PR (P0 relevantné)

| PR | CI | Vercel CRM | Poznámka |
|----|-----|------------|----------|
| [#66](https://github.com/onlinovosk-bit/RealitkaAI/pull/66) | ✅ SUCCESS | ✅ SUCCESS | Realvia replay |
| [#70](https://github.com/onlinovosk-bit/RealitkaAI/pull/70) | ✅ SUCCESS | ✅ SUCCESS | `scheduled_events`, `/api/scheduled-events` |
| [#72](https://github.com/onlinovosk-bit/RealitkaAI/pull/72) | ✅ SUCCESS | ✅ SUCCESS | **Defer** |

## Nedávno zmergované (kontext dňa)

| PR | Popis |
|----|-------|
| [#75](https://github.com/onlinovosk-bit/RealitkaAI/pull/75) | Smolko Moji klienti — filtre, načítanie, iniciály |
| [#73](https://github.com/onlinovosk-bit/RealitkaAI/pull/73) | Onboarding copy `/porovnanie-programov` |
| [#69](https://github.com/onlinovosk-bit/RealitkaAI/pull/69) | Browser-first leads |
| [#68](https://github.com/onlinovosk-bit/RealitkaAI/pull/68) | P0 reliability |
| [#65](https://github.com/onlinovosk-bit/RealitkaAI/pull/65) | AI Decision Ops |

## Lokálna vetva (rozpracované)

- **Branch:** `fix/smolko-contacts-root-cause`
- **Súbory:** `resolve-profile-for-auth.ts`, `auth.ts`, `login/actions.ts`, `tenant-health`, `leads/inventory`, `link-profile-to-auth.test.ts`
- **QA:** `apps/crm/docs/qa/contacts-leads-zero-data.md`

## Príkazy (opakovateľné)

```bash
cd apps/crm
npm run test -- --run src/lib/__tests__/market-vision-features.test.ts src/lib/__tests__/smart-active-program-features.test.ts src/lib/__tests__/reality-monopol-program-features.test.ts
gh pr list --state open --limit 10
```

## Neznáme / čestné limity

- **% programov** sú odhady; bez prod login nevieme potvrdiť KPI ani Realvia.
- **Počet otvorených PR** >> 3 (staré Slate vetvy #14–#30) — dnes **ne-mergeovať**.
- **Ruflo board counter** 0/0 — interný meter, nie táto tabuľka.

---

*Autor: L99 Sub-Orchestrator · Súvisí: [orchestrator-task-board.md](./orchestrator-task-board.md), [rene-myport-revolis-competitive-analysis.md](./rene-myport-revolis-competitive-analysis.md)*
