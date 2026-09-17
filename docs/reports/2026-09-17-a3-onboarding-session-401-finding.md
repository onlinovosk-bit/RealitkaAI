# A3 — `/api/onboarding/session` vracia 401 neprihlásenému. FINDING + PROPOSAL.

**Dátum:** 2026-09-17
**Režim:** operating mode B (`docs/prompts/multi-agent-protocol-v0/06-operating-mode-b.md`, vetva `audit/2026-09-16` / PR #565)
**Task:** `.ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md`, acceptance **A3**
**Handoff:** `.ai/bus/handoffs/HANDOFF-20260917-001-a3-onboarding-401.md`
**Gate:** `GO REQUIRED` — tento dokument **nemení kód ani acceptance**. Je to podklad pre founderovo rozhodnutie.

Metóda podľa 06: jeden handoff → dvaja nezávislí reviewri (rola *executor*, rola *challenger*)
v izolovaných worktrees z `origin/main`, bez obsahu task karty v prompte → executor zopakoval
kľúčové dôkazy nezávisle. Nižšie je len to, čo prežilo re-verifikáciu.

---

## FINDING

### F1 — 401 pre GET aj POST je potvrdené. Zhoda oboch reviewrov + nezávislé overenie.

`apps/crm/src/proxy.ts` je jediný middleware (Next 16). `/api/onboarding/session` nie je v
`PUBLIC_PATHS`, nie je cron, webhook, shim ani removed path → `getUser()` → `!user` →
`pathname.startsWith("/api/")` → `401 {ok:false,error:"Unauthorized"}`. Handler sa nevykoná.

**EVIDENCE**
- `apps/crm/src/proxy.ts:183-188` — 401 vetva (overené: `git show origin/main:apps/crm/src/proxy.ts | sed -n '180,203p'`).
- `git show origin/main:apps/crm/src/proxy.ts | grep -n "onboarding"` → **bez výstupu**. V proxy nie je o onboardingu ani zmienka.
- `git show origin/main:apps/crm/src/app/api/onboarding/session/route.ts | grep -nE "getUser|requireAuth|requirePlatformAdmin|Bearer|authorization"` → **bez výstupu**. Handler nemá vlastnú autentifikáciu; jedinou bránou je proxy.
- `proxy()` nikdy nečíta `request.method` → GET, POST aj PUT sú identické. `PUT → 405` (`route.ts:164-166`) je pre anon nedosiahnuteľný.

### F2 — Regresiu zaviedol samotný Path B commit. `proxy.ts` v ňom nie je.

Klient bol prepnutý z priameho PostgREST volania (ktoré `Allow anon access` povoľovala) na
`fetch("/api/onboarding/session")`, ale allowlist middlewaru sa nedoplnil. Anonymná cesta sa
pri prechode **stratila, nie zachovala**.

**EVIDENCE**
- `git show --stat 9235643` → 13 súborov, `apps/crm/src/proxy.ts` medzi nimi nie je.
- `git log --oneline -- apps/crm/src/proxy.ts` → `9235643` sa v histórii súboru nevyskytuje.
- Rozpor: `docs/reports/2026-09-04-rls-onboarding-session-api.md:10-11` tvrdí „without breaking **public** onboarding progress sync"; `:51` odškrtáva „Client no longer depends on open anon ALL for sync".
- Rozpor: `apps/crm/supabase/migrations/20260904220000_drop_onboarding_sessions_anon_all.sql:10` — „No authenticated policy needed for **public wizard**."
- Pôvodný audit odporúčal opak: `docs/audit/2026-09-04-rls-anon-policies.md:70,72` — „API route so service role **+ session token**". Session token v implementácii nie je.

### F3 — Chyba je trojnásobne prehltnutá. Používateľ nevidí nič.

`fetch` na 401 nevyhodí výnimku; `res.ok === false` → helper vráti `null`/`false` → volajúci
návratovú hodnotu zahodí → `catch` sa nikdy nespustí. `try/catch` okolo volania je falošná poistka.

**EVIDENCE**
- `apps/crm/src/lib/onboarding/session-api.ts:35` → `if (!res.ok) return null;` (401 je nerozlíšiteľné od „session neexistuje").
- `apps/crm/src/lib/onboarding/session-api.ts:60` → `return res.ok;`
- `apps/crm/src/app/onboarding/useOnboarding.ts:108-113` → `void upsertOnboardingSession({...}).catch(() => {}); // soft-fail — localStorage is SoT`
- `apps/crm/src/app/onboarding/OnboardingClient.tsx:146-155` → `catch { // API sync unavailable }`

Wizard postupuje normálne, žiadny toast ani banner. Stráca sa serverová kópia
(`session_id`, `step`, `form_data`, `updated_at`); prežíva iba `localStorage`.

### F4 — `onboarding_sessions` nemá v aplikácii žiadneho čitateľa. To mení kalkuláciu dopadu.

**EVIDENCE**
- `git grep -n "onboarding_sessions" origin/main -- apps/crm/src` → **iba** `route.ts:63`, `route.ts:135`, 2 hity v jeho teste a 1 komentár v `session-api.ts:2`. Žiadny dashboard, cron, report ani analytika.
- `onboarding-monitor` číta inú doménu: `OnboardingMonitorClient.tsx:63` → `/api/onboarding/mvp/at-risk` (tabuľky `client_onboarding_progress` / `client_onboarding_messages`).
- `git grep -n "OnboardingClient" origin/main -- apps/crm/src` → **jediný hit je jeho vlastná definícia** (`OnboardingClient.tsx:78`). Komponent nikto neimportuje — mŕtvy kód. Druhý konzument `TestDbClient.tsx` je nedosiahnuteľný (`test-db/page.tsx` → `redirect("/onboarding")`).
- Aktívny wizard (`useOnboarding.ts:68-86`) pri mounte číta **len** `localStorage`; `getOnboardingSession` nevolá vôbec.

→ Dnešná strata z 401 = serverová viditeľnosť lievika + cross-device resume v mŕtvom komponente.
Nie strata funkcie, ktorú by používateľ pocítil.

### F5 — Migrácia je `PREPARED ONLY`. `Allow anon access` je v produkcii pravdepodobne stále otvorená.

Toto je **dôležitejší nález než samotné A3** a mení poradie krokov.

**EVIDENCE**
- `apps/crm/supabase/migrations/20260904220000_drop_onboarding_sessions_anon_all.sql:2` → `-- PREPARED ONLY — do NOT apply from Cursor / agent.`
- `:3` → „Founder applies AFTER preview OK + merge GO".
- `.ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md` front matter: `production.migration_applied: unknown`, `anon_policy_present: unknown`, `verified_by: null`.

→ Spor o 401 sa vedie na endpointe, ktorý zatiaľ **nie je jedinou cestou k dátam**.
Kým migrácia nie je aplikovaná, P0 z karty (otvorená anon politika) nie je uzavretý.

### F6 — Žiadny test 401 nepokrýva. Jeden test fixuje opačné, nepravdivé očakávanie.

**EVIDENCE**
- `apps/crm/src/app/api/onboarding/session/__tests__/route.test.ts:62,84,91` a `:99,114` — testy importujú `GET`/`POST` priamo z modulu a asertujú `200`. Proxy sa nikdy nevolá. Reálna HTTP cesta pre anon je 401.
- `apps/crm/tests/verification/onboarding-sessions-api.verification.test.ts:30-52` — iba `readFileSync` + `toContain`. Žiadne `expect(status)`.
- `apps/crm/src/proxy-auth-timeout.test.ts` — pokrýva `/dashboard` a `/api/leads`, nie onboarding.
- `apps/crm/tests/onboarding-focus.spec.ts:15` + `playwright.config.ts:42-50` — jediný onboarding E2E beží so `storageState: authFile`, teda **prihlásený**; 401 nikdy neuvidí.
- `docs/reports/2026-09-04-rls-onboarding-session-api.md:58-69` — „11 passed" je kombinácia týchto dvoch druhov testov; `:68-69` priznáva „Build full next build skipped". Zelené CI o anonymnom prístupe nedokazuje nič.
- Akceptačný krok `:43` („Confirm Preview: Network shows `/api/onboarding/session`") prejde **aj pri 401** — request v Network paneli je. Krok danú chybu nevie zachytiť.
- Precedens opačného smeru existuje: `apps/crm/tests/verification/onboarding-mvp-auth.verification.test.ts:18-23` explicitne zakazuje public-allowlistnúť `/api/onboarding/mvp/`.

### F7 — Stránka `/onboarding/*` je pre anon otvorená, jej API nie. To je tá nekonzistencia.

**EVIDENCE**
- `apps/crm/src/proxy.ts:190-200` — redirect na `/login` len pre `/dashboard*`, `/app*`, `/properties*`. `/onboarding` nie je ani tu, ani v `PUBLIC_PATHS`.
- Jediný vstupný bod v produkte: `apps/crm/src/app/(public)/register/actions.ts:83` `redirect("/onboarding/step-1-vitaj")` po `supabase.auth.signUp()` (`:22`), a `:70-74` welcome e-mail s odkazom `https://app.revolis.ai/onboarding`.
- `git grep -ln "/onboarding" origin/main -- apps/marketing/src` → **bez výstupu**. Marketing web na onboarding nelinkuje. „Verejný pre-signup wizard" ako produktový koncept v repe neexistuje.
- `apps/crm/supabase/config.toml:51-53` → `[auth.email] enable_confirmations = false`. To je **lokálny** dev config; ak rovnaké nastavenie platí v prode, po `signUp()` session existuje a registračnú cestu 401 nezasiahne. Produkčné nastavenie z repa overiť nemožno (viď Otvorené neznáme).

### F8 — Ak by sa endpoint sprístupnil, tri veci sú dnes nedostatočné.

- **Žiadna väzba na vlastníka.** `route.ts:129-146` `upsert` s `onConflict: "session_id"` bez overenia vlastníctva — kto pozná cudzie `session_id`, prepíše cudzí riadok. `route.ts:62-66` `select(...).eq("session_id", …)` — UUID je de facto bearer token bez tajomstva.
- **Rate limit je fail-open.** `apps/crm/src/lib/rate-limit.ts:41-45` (`if (!sb) return { allowed: true }`) a `:57-60` (`if (error) return { allowed: true }`). Presne pri výpadku DB hranica zmizne.
- **Kľúč limitu je klientom ovplyvniteľný.** `route.ts:15-17` berie prvý prvok `x-forwarded-for`. Na Vercel hlavičku prepisuje platforma; pre `next start` / `server.mjs` cestu to overené nie je.
- **GDPR.** `form_data` obsahuje `name`, `phone`, `linkedin`, `bio`, `city` (`useOnboarding.ts:12-24`) → osobné údaje. Podľa `CLAUDE.md` §5 sa právny základ dokumentuje **pred** implementáciou.

Naopak: sprístupnenie **neotvára späť pôvodnú dieru.** `Allow anon access` bola `FOR ALL TO anon USING (true)` → anon mohol listovať všetky riadky a mazať. Endpoint listing nemá (`.eq(session_id).maybeSingle()`), `DELETE` neexportuje, `PUT → 405`.

---

## PROPOSAL — päť variantov, rozhodnutie je founderovo

| # | Variant | Bezpečnostný dopad | Cena |
|---|---|---|---|
| **V1** | **Nechať 401**, opraviť nepravdivé tvrdenia v reporte/migrácii/runbooku a pridať test, ktorý 401 fixuje ako **zamýšľané** | žiadny — najbezpečnejší realistický stav | serverová telemetria lievika neexistuje (dnes ju nikto nečíta — F4); A3 treba preformulovať, nie odškrtnúť |
| **V2** | **Zrušiť serverový sync úplne** — localStorage-only, zmazať route + mŕtvy `OnboardingClient.tsx` + `TestDbClient.tsx`, tabuľku odstaviť po exporte | najnižšia možná plocha — žiadny anon prístup, žiadny service-role endpoint, žiadne PII v tabuľke | telemetria natrvalo; A3 sa škrtá, nie plní |
| **V3** | **Verejný endpoint s viazaným tokenom** — `POST /api/onboarding/session/start` vydá HttpOnly+SameSite cookie, `GET`/`POST` ju overia **pred** `createServiceRoleClient()`; do `PUBLIC_PATHS` ide len táto dvojica (presná zhoda cesty, nikdy prefix) | stredný, ohraničený — cudzie UUID samo nestačí; vyžaduje fail-**closed** rate limit, väzbu limitu na `session_id` a GDPR analýzu | najväčší objem práce + rozšírenie testovej matice o proxy-level testy |
| **V4** | **Holý `PUBLIC_PATHS` allowlist** bez ďalších opatrení | **vysoký, neprijateľný** — anonymne dosiahnuteľný service-role endpoint nad PII, UUID ako bearer, cudzí `POST` prepíše cudzí riadok (F8) | uvedené pre úplnosť; **obaja reviewri ho odmietli** |
| **V5** | **Sprísniť namiesto povoliť** — pridať `/onboarding` do redirect zoznamu `proxy.ts:190-200` a prehodnotiť welcome-e-mail link | rieši nekonzistenciu F7 sprísnením | verejný pre-signup wizard prestane existovať ako koncept — **produktové, nie technické rozhodnutie** |

**Sprievodné, nezávislé od voľby (V1–V5):**
- Odstrániť falošnú poistku z F3. Ak sa ponechá akýkoľvek serverový sync, návratová hodnota `upsertOnboardingSession` sa musí kontrolovať — inak bude každé budúce zlyhanie opäť neviditeľné.
- `apps/crm/tests/verification/onboarding-sessions-api.verification.test.ts:41-52` drží nažive mŕtvy `OnboardingClient.tsx` — pri čistení treba upraviť test spolu s kódom, inak CI spadne na mŕtvom kóde.
- `route.ts:3,7` — `validateBody` a `incrementUsageMetric` sú importované a nepoužité, hoci `docs/reports/2026-09-05-pr535-babysit-contract.md:22` ich uvádza ako „debt cleared".

**Odporúčanie executora (nie DECISION):** **V1 teraz**, a poradie krokov obrátiť — F5 hovorí, že
skutočný P0 nie je A3, ale neaplikovaná migrácia. Rozhodnúť o V1–V5 **pred** aplikovaním migrácie;
kým sa neaplikuje, `Allow anon access` v prode zostáva otvorená a A1/A2 zostávajú `unknown`.

## Otvorené neznáme (nedajú sa zavrieť z repa)

| čo | prečo rozhoduje | akým dôkazom sa zavrie |
|---|---|---|
| Stav RLS politiky `Allow anon access` v produkcii | rozhoduje, či je P0 otvorený; mení urgenciu celého tasku | read-only SELECT pripravený v `docs/runbooks/rollback-onboarding-sessions-anon.md:38-41` — spúšťa **founder** |
| Supabase Auth → „Confirm email" v produkčnom projekte | rozhoduje, či 401 zasiahne aj registračnú cestu, alebo len klik z welcome e-mailu | Supabase Dashboard → Authentication → Providers → Email (v repe len lokálny `config.toml:53 enable_confirmations = false`) |

## Protokolový nález (režim B) — ZAVRETÝ

V čase behu reviewrov existovali protokolové súbory `docs/prompts/multi-agent-protocol-v0/00–06`
a všetky `DEC-202609{16,17}-*` **iba** na `audit/2026-09-16`, na `main` nie. Obaja reviewri spustení
z `main` ich preto nenašli a oprávnene to uviedli v `context_requests`. Bol to presne stav, ktorý `06`
popisuje ako chybu („stav na audit vetve a nie na `main`").

**Zavreté:** PR #565 bol mergnutý 2026-09-17 (`origin/main` → `1291ae5`). Protokol aj DEC záznamy
sú odvtedy na `main` a ďalší beh subagentov z `main` ich už nájde.

**EVIDENCE:** pred mergom `git ls-tree -r --name-only origin/main | grep -E "^docs/prompts/multi-agent-protocol-v0/|^\.ai/bus/decisions/"` → iba `.gitkeep` a `DEC-20260825-002`; po mergu tie isté cesty na `main` existujú.

## Výsledok tasku

- `founder_relays`: **1** — tento prompt + priložený `operating-mode-b.patch` za setup. V samotnom tasku 0.
- Poznámka k patchu: obsah bol už na `origin/audit/2026-09-16` (`56e2359`); `git am --3way` vrátil „No changes -- Patch already applied." Vetva `docs/operating-mode-b` ukazuje na ten commit, duplicitný commit nevznikol.
