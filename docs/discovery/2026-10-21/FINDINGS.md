# FINDINGS — dôkazy, závažnosť, dopad, odporúčané kroky

> Revolis.AI reverse-engineering & system discovery v1.0 · 2026-10-21 · HEAD `a04bc5e` (main, #908) · iba čítanie, **žiadna zmena kódu, dát, env ani nasadenia**.
> Značky: **CONFIRMED** = prečítané v kóde *v tomto turne* · **CONFIRMED-D** = prečítané delegovaným prieskumom, v tomto turne znova neoverené (riadky približné) · **INFERRED** = vyvodené · **UNKNOWN** = nedá sa overiť z repozitára.
> Závažnosť je odhad dopadu pri **súčasnom stave** (0 platiacich zákazníkov, 7 agentúr v PROD — merané); „latentné" = kód existuje, ale cesta je vypnutá.
> Každý nález: dôkaz → dopad → reprodukovateľné overenie → odporúčaný krok. Žiadny krok nebol vykonaný; všetko mimo čítania vyžaduje founderovo GO.

## Zhrnutie

| ID | Závažnosť | Nález | Istota |
|---|---|---|---|
| F-01 | **P1** | Odchádzajúci e-mail nemá odhlásenie, `List-Unsubscribe`, zoznam potlačení ani spracovanie bounce/complaint | CONFIRMED |
| F-02 | **P1** | Proxy vracia 401 na `/api/resend-webhook`, `/api/morning-brief/track/*` a `/api/notifications/unsubscribe` | statika CONFIRMED, živé UNKNOWN |
| F-03 | **P1** | Feature gating je vypnutý (DEV OVERRIDE) a spoplatňovanie kreditov je default-off a fail-open | CONFIRMED |
| F-04 | P2 (P1 po zapnutí) | `/api/scheduled-outreach` obchádza schválenie človekom; následné kroky len v pamäti | CONFIRMED-D (latentné) |
| F-28 | P2 | 10 cron routes nemá známy spúšťač (vrátane `credits-grant`/`credits-expire`) | CONFIRMED / UNKNOWN beh |
| F-05 | P2 | Overenie prihlasovacích údajov importu UC/Realsoft bez rate limitu | INFERRED |
| F-06 | P2 | `realvia/import` loguje prvých 1000 znakov XML | CONFIRMED |
| F-07 | P2 | `/api/agents/cleaner` maže `leads` bez filtra tenanta | CONFIRMED (kód) / INFERRED (dopad) |
| F-08 | P2 | Gate prístupu číta Stripe podľa e-mailu a pri chybe pustí plný prístup | CONFIRMED-D |
| F-09 | P2 | `licensed_users` (v2 seat limit) sa nevynucuje | CONFIRMED-D |
| F-10 | P2 | Zrušená legacy agentúra môže dostávať mesačné granty | INFERRED |
| F-11 | P2 | Rate limiter je fail-open; spoofovateľnosť XFF UNKNOWN | CONFIRMED |
| F-12 | P2 | `createAdminClient` potichu padá na anon/placeholder; ~30 service-role routes bez zmienky tenanta | CONFIRMED-D |
| F-13 | P2 | Stripe webhook: chyby legacy vetvy → 200, vonkajší catch → 400, bez dedupe podľa `event.id` | CONFIRMED |
| F-14 | P2 | Drift repo ↔ PROD RLS; schema guard len manuálny | CONFIRMED-D |
| F-15 | P3 | `revolisGuard` (HMAC) cesty nemajú v repozitári volajúceho | CONFIRMED-D |
| F-16 | P3 | Bypassy závislé od `NODE_ENV` (`/api/followup`, Realvia validate) | CONFIRMED-D |
| F-17 | P3 | Chýbajúce timeouty odchádzajúcich volaní | CONFIRMED-D |
| F-18 | P3 | Plné `===` porovnania tajomstiev; kľúč Google Ads v URL; 27/31 cronov mimo helper | CONFIRMED-D |
| F-19 | P3 | Produkčný `CRON_SECRET`/service-role v GitHub tajomstvách; Gmail pull plánovaný 2× | CONFIRMED-D |
| F-20 | P3 | Stub `api/login` s pevnými údajmi; `api/auth/login` vracia tokeny v tele | CONFIRMED |
| F-21 | P3 | Mojibake v `billing-store.ts` (32 riadkov) a `activities-store.ts` (1) | CONFIRMED |
| F-22 | P3 | Odhlásenie z morning-brief cez holé UUID a anon klienta | CONFIRMED |
| F-23 | P3 | `JSON.parse(rawBody)` bez ochrany v `resend-webhook` | CONFIRMED |
| F-24 | P3 | Legacy seat checkout so slabou validáciou | CONFIRMED-D |
| F-25 | P3 | Verejný `checkout-config`; `promoCode` použitý ako id kupónu | CONFIRMED-D |
| F-26 | P3 | `/api/observability/probes` pravdepodobne vždy „degraded" | INFERRED |
| F-27 | P3 | Mŕtvy/duplicitný kód a zbytkové súbory | CONFIRMED |
| F-29 | P3 | Verejné cesty s autentifikáciou, ale bez rate limitu | CONFIRMED-D |

---

## P1

### F-01 — Odchádzajúci e-mail bez odhlásenia a potlačenia
- **Dôkaz (CONFIRMED, tento turn):** `S/lib/outreach-store.ts:414-420` posiela do `resend.emails.send` len polia `from, to, subject, text, tags` — žiadna pätička, žiadna hlavička `List-Unsubscribe`, žiadna kontrola do-not-contact pred odoslaním. `S/app/api/resend-webhook/route.ts` nespracúva `email.bounced` / `email.complained`. Inbound e-mail typu „unsubscribe" sa klasifikuje mimo leadov, ale nezapíše sa do žiadneho zoznamu potlačení (`DATA_FLOWS.md §2`).
- **Dopad:** ePrivacy/GDPR (priame oslovenie bez možnosti odmietnuť), riziko reputácie domény a doručiteľnosti (komplaint/bounce sa nikdy nepremietne do ďalšieho odosielania). Odosielanie je dnes obmedzené na ručne schválené správy (cap 20/deň, cooldown 20 h), takže plocha je malá — ale rastie s prvým platiacim brokerom, ktorý ju používa.
- **Overenie:** `grep -n "unsubscribe\|List-Unsubscribe\|suppress" apps/crm/src/lib/outreach-store.ts` → očakávané 0 zhôd; v Resend dashboarde skontrolovať, či sa doménový event `bounced` doručuje (viď F-02).
- **Odporúčanie:** (a) tabuľka/stĺpec potlačenia + kontrola v `sendApprovedOutreach` pred odoslaním; (b) `List-Unsubscribe` + `List-Unsubscribe-Post` hlavičky a textová pätička; (c) spracovať `bounced`/`complained` v `resend-webhook`. Pred implementáciou je podľa CLAUDE.md pravidla 5 povinný `gdpr-advisor` gate (skill v repozitári chýba — otvorená položka).

### F-02 — Proxy blokuje webhook Resend, sledovacie pixely a odhlásenie
- **Dôkaz:** `S/proxy.ts` ani `crm/vercel.json` neobsahujú `/api/resend-webhook`, `/api/morning-brief/track/*` ani `/api/notifications/unsubscribe` (grep v tomto turne = 0 zhôd; `/api/webhooks*` je bypass, ale `resend-webhook` je mimo tohto podstromu). Handlery sami verifikujú podpis Svix (`resend-webhook/route.ts:51-55`), no kým žiadosť neprejde proxy, k handleru sa nedostane.
- **Dopad (ak sa potvrdí):** Resend delivery/bounce/complaint udalosti sa strácajú (väzba na F-01); kliky/otvorenia z morning-brief sa nezaznamenajú; odkaz „odhlásiť" v e-maile vedie na 401/login.
- **Istota:** statická absencia CONFIRMED; živé správanie **UNKNOWN** (môže existovať iný mechanizmus, napr. úprava matcheru, ktorý sme nečítali celý; `proxy.ts` bol čítaný celý v predchádzajúcej časti).
- **Overenie (read-only):** `curl -i -X POST https://<crm-host>/api/resend-webhook` bez cookie → 401 z proxy (nie 400 z handlera) potvrdí; Resend dashboard → Webhooks → delivery log (stav 401).
- **Odporúčanie:** najmenší krok: pridať tri cesty do bypass zoznamu v `proxy.ts` (handlery sa autentifikujú samy), + test. Malá zmena, vysoká hodnota, ale mení produkčnú bránu → GO.

### F-03 — Gating a spoplatňovanie sú dnes vypnuté
- **Dôkaz (CONFIRMED, tento turn):** `S/lib/saas-ops.ts:145-159` `getFeatureFlagsForPlan` vracia všetky flagy `true` („DEV OVERRIDE") → `requireFeature` je no-op (aj `requireFeature("outreach")` v `outreach/send`). `CREDITS_ENFORCEMENT` default `"off"`; len 3 AI routes volajú `spendForAction`, pri chybe billingu fail-open (`S/lib/credits/spend-for-action.ts`).
- **Dopad:** produkt nemá technický mechanizmus, ktorý by odlíšil platiaceho od neplatiaceho (tarify/funkcie/kredity sa neuplatňujú). Priamy zásah do Prime Directive — po spustení Stripe kroku C neexistuje dôvod platiť za vyššiu úroveň, kým je gating vypnutý. Zároveň: AI náklady (OpenAI/Anthropic) nie sú obmedzené kreditmi.
- **Overenie:** prečítať `saas-ops.ts:145-159`; v PROD `select count(*) from agencies where account_tier <> 'free'` vs. správanie free účtu (nespúšťané v tejto discovery).
- **Odporúčanie:** po Stripe kroku C zapnúť gating po jednom flagu (outreach, AI generovanie) s feature flagom v env; rozhodnúť, ktoré funkcie sú pod plánom. Strategická položka pre foundera, nie oprava.

---

## P2

### F-04 — `/api/scheduled-outreach` (latentné)
Gate `SCHEDULED_OUTREACH_ENABLED` (CONFIRMED: `app/api/scheduled-outreach/route.ts:19,43`), default vypnutý, **nie je** vo `vercel.json` ani vo workflow. Po zapnutí volá `runOutreachSequence` na každý lead s e-mailom **bez schválenia**; následné kroky držané v pamäti (`outreach-automation-2.0.ts:34-44`, CONFIRMED-D → po restarte sa strácajú). Dopad: po zapnutí by obišiel Control Contract schvaľovanie a F-01 by sa zhoršil. Test `outreach-contract.test.ts:9` tvrdí, že kontrakt platí bez ohľadu na flag — **neoverené** (testy nespustené). Odporúčanie: nezapínať; pri budúcom zapnutí najprv F-01 a prepojiť s `authorizeSend`.

### F-28 — Cron routes bez známeho spúšťača
31 route súborov, `vercel.json` plánuje 19 záznamov; bez známeho spúšťača: `agency-scraping`, `auto-tune`, `credits-grant`, `credits-expire`, `daily-match`, `demo-brief`, `demo-recap`, `night-watch`, `onboarding-dispatch`, `stealth-recruiter-ingest`. Dopad: ak `credits-grant` nebeží, kreditový model z `DATA_FLOWS.md §4.4` nikdy nič nepridelí. Beh v PROD UNKNOWN (môžu byť spúšťané externe, napr. n8n/Vercel dashboard). Overenie: Vercel → Settings → Cron Jobs + runtime logy (read-only); `vercel.json` grep. Odporúčanie: zmapovať pred Stripe krokom C, lebo `credits-grant` je súčasťou „čo zákazník dostane za zaplatené".

### F-05 — Import UC/Realsoft bez rate limitu
`/api/uc/import` a `/api/realsoft/import` sú mimo session brány (`proxy.ts:133-134`), prihlasovacie údaje sa overujú RPC (`S/lib/realsoft/auth.ts:24`); v `S/lib/uc/import-handler.ts` nebol nájdený `rateLimit` (INFERRED — absencia). Dopad: neobmedzené hádanie hesla pre import agentúry (a F-11 hovorí, že limiter by aj tak zlyhal otvorene). Overenie: `grep -rn rateLimit apps/crm/src/lib/uc apps/crm/src/lib/realsoft`; v testovacom prostredí opakované zlé údaje. Odporúčanie: rate limit na IP + username pred RPC.

### F-06 — `realvia/import` loguje XML
`S/app/api/realvia/import/route.ts:33` `console.log(xml.slice(0, 1000))` (CONFIRMED). `lib/logger.ts` nerediguje. Či XML nesie osobné údaje: UNKNOWN. Overenie: Vercel runtime logy pre tú cestu (read-only). Odporúčanie: log iba dĺžky/hash + identifikátora; ak PII → incident posudzuje founder.

### F-07 — `/api/agents/cleaner` maže `leads` bez tenanta
CONFIRMED (tento turn, `app/api/agents/cleaner/route.ts:5-9`): `createClient()` (session klient) → `leads.delete().lt('lead_score', 20)`, bez filtra agentúry; bránou je len `revolisGuard` (HMAC). V cron kontexte nie je session, takže RLS pravdepodobne zablokuje všetko (INFERRED) → buď mŕtvy kód, alebo latentné cross-tenant mazanie, ak by sa spustil s oprávnením. Nie je vo `vercel.json` (CONFIRMED-D). Overenie: politika RLS na `leads` (SELECT z `pg_policies`, read-only) + dry-run `select count(*)` s rovnakým predikátom. Odporúčanie: odstrániť route, alebo pridať agency scope + dry-run.

### F-08 — Gate prístupu čítaný zo Stripe podľa e-mailu, fail-open
`S/lib/billing-store.ts:477-539` (CONFIRMED-D): `customers.list[0]` + `subscriptions.data[0]` aj keď je zrušená; pri chybe stav `unknown` → plný prístup. Dopad: zrušenie/chyba sa neprejaví; zdieľaný e-mail → zlá agentúra. Pri 0 platiacich dnes bez praktického dopadu; po predaji áno. Overenie: test s mockom Stripe chyby. Odporúčanie: čítať `agencies.subscription_status` (už ho plní webhook), Stripe iba ako záloha.

### F-09 — `licensed_users` sa nevynucuje
v2 `licensed_users` sa pri pozvánkach nekontroluje; limity berie `saas-ops.ts:161-210,537` zo starej tabuľky plánov (starter 5, pro 20, scale 999, free 2). Dopad: kupujúci 2–5 miest (#908 cena 50/65 €) môže pozvať viac → tržby unikajú. Overenie: invite route → grep `licensed_users`. Odporúčanie: spojiť s F-03.

### F-10 — Zrušená legacy agentúra a granty
`S/lib/credits/grant-engine.ts:150-166` kontroluje `subscription_status` len pre v2; legacy bez kontroly (INFERRED). Overenie: zavolať grant engine nad fixture zrušenej legacy agentúry (test). Odporúčanie: jednotná podmienka.

### F-11 — Rate limiter fail-open, XFF
`S/lib/rate-limit.ts:41-45,57-61` (CONFIRMED, tento turn): bez Supabase alebo pri chybe DB → povolí všetko; kľúč prvý `x-forwarded-for`. Vercel môže hlavičku prepísať (UNKNOWN). Dopad: výpadok DB vypne ochranu AI endpointov (náklady) aj verejných formulárov. Odporúčanie: pre drahé AI routes fail-closed s krátkym lokálnym záložným okénkom.

### F-12 — Fallback `createAdminClient` a service-role bez tenanta
`S/lib/supabase/server.ts:18-25` (CONFIRMED-D): anon kľúč / `"placeholder-key"`; ~30 z ~70 service-role route súborov nespomína `agency_id` (filter chýba alebo je v `lib`; nezmerané). Dopad: pri chybnej konfigurácii zlyhá divne namiesto hlasito; pri chýbajúcom filtri je izolácia tenantov iba konvencia (~195 service-role call sites obchádza RLS). Overenie: pre každú z 30 skontrolovať tenant filter vo volaných lib funkciách (zoznam vygeneruje grep `createServiceRoleClient` mínus `agency`). Odporúčanie: fail-fast bez fallbacku; audit 30 routes ako samostatný blok.

### F-13 — Stripe webhook: spracovanie chýb a idempotencia
CONFIRMED (tento turn / `DATA_FLOWS.md §4.2`): chyby legacy vetvy sa prehĺtajú → 200 (`billing-store.ts:~700-702`); vonkajší catch → 400 pre každú chybu (`route.ts:72-75`); žiadny dedupe podľa `event.id` (replay vloží znova „Billing" riadky do activity logu). v2 plnenie je idempotentné (`credit_ledger_idem_uq`). Dopad: pri platbe cez legacy cestu môže chyba zapisovania ostať nepovšimnutá a Stripe ju neopakuje → zákazník zaplatí bez aktivácie. **Kritické pre Stripe krok C**, lebo tok nebol v PROD nikdy overený (0 subscriptions). Overenie: Stripe test mode → `stripe trigger` / test checkout (vyžaduje GO). Odporúčanie: pri v2 cenníku overiť end-to-end v test mode pred Live; legacy chyby → 500.

### F-14 — Drift RLS repo ↔ PROD
`credit_redemption_codes` a `demo_prefill_links` nemajú v migráciách `ENABLE ROW LEVEL SECURITY`, PROD ich má (142/142 s RLS — merané). Okrem toho ~30 prod-only tabuliek rekonštruovaných; `schema-governance-guard.yml` je len manuálny. Kvalita policies v PROD **nemeraná**. Overenie: `select tablename, policyname, cmd, roles, qual from pg_policies` na PROD (read-only; GO podľa skillu `prod-migration`, ak by sa zapájal zápis — čítanie nie). Odporúčanie: balík „RLS mapa" (pravidlo 2 stien) pred akoukoľvek zmenou.

---

## P3

- **F-15** — `revolisGuard` routes (`/api/agents/*`, `night-watch`) vyžadujú HMAC hlavičky, ktoré nič v repozitári neposiela → buď externý volajúci (UNKNOWN), alebo mŕtvy kód. Overenie: `grep -rn "x-revolis" apps/crm/src` (očakávaný len server-side check).
- **F-16** — `/api/followup` POST povolený pri `NODE_ENV==="test"` (`route.ts:19-26`); Realvia secret check má dev bypass pri `NODE_ENV!=="production"` bez env (`validate.ts:110-165`). Závisí od správneho `NODE_ENV` v PROD (Vercel ho nastavuje; neoverené).
- **F-17** — bez timeoutu: surové `fetch` na Resend, Brevo, OpenAI embeddings, HubSpot, Twilio (SDK defaulty OpenAI/Anthropic UNKNOWN). Dopad: visiace serverless funkcie, 504 pri zlyhaní tretej strany.
- **F-18** — `CRON_SECRET`, `x-cron-secret`, concierge secret, demo prefill token sa porovnávajú `===` (nízka praktickosť timing útoku); kľúč Google Ads môže byť v URL query (`extractGoogleKey` → access logy); 27/31 cron routes mimo zdieľaného `cron-auth.ts` (drift).
- **F-19** — produkčný `CRON_SECRET` a service-role kľúč sú v GitHub tajomstvách (`gmail-inbound-pull.yml:31-49`, `schema-governance-guard.yml:37-45`); Gmail pull sa plánuje 2× (GitHub každých 10 min + `vercel.json` denne).
- **F-20** — `app/api/login/route.ts` je stub s pevnými testovacími údajmi a falošným tokenom (hodnoty neuvádzam; CONFIRMED, tento turn); za session bránou → pravdepodobne mŕtvy. `app/api/auth/login/route.ts` vracia `data.session` tokeny v tele bez rate limitu (CONFIRMED-D).
- **F-21** — mojibake v `S/lib/billing-store.ts` (32 riadkov) a `activities-store.ts` (1) → poškodené texty v activity logu.
- **F-22** — `/api/notifications/unsubscribe?profile=<uuid>` vypína morning brief podľa holého UUID (neutajovaný identifikátor), cez anon/session klienta bez session (UPDATE môže byť RLS-om potichu odmietnutý → odhlásenie nefunguje; INFERRED), a cesta je mimo proxy bypassu (F-02).
- **F-23** — `resend-webhook/route.ts:65` `JSON.parse(rawBody)` až po overení podpisu, bez try/catch → 500 namiesto 400 pri poškodenom tele s platným podpisom (nízke).
- **F-24** — legacy seat checkout so slabou validáciou vstupov (CONFIRMED-D).
- **F-25** — `/api/billing/checkout-config` je verejný (vracia mená chýbajúcich env a boolean, nikdy hodnoty — CONFIRMED-D) → odhaľuje konfiguračný stav; `promoCode` sa používa ako id kupónu.
- **F-26** — `/api/observability/probes` očakáva `/api/leads`=200 bez cookie → v realite 401 → vždy „degraded" (INFERRED).
- **F-27** — mŕtvy/duplicitný kód: `S/jobs/*`, `lib/supabase/browser.ts`, `lib/supabase/proxy.ts`, `S/ai/`, druhý `S/lib/infra/`, stub `api/login`, duplicitné `outreach/send` ↔ `outreach/approve`, duplicitný cron `dashboard-insights`, ~8 zbytkových súborov v `crm/` (`build.log`, `surgical-fix.tar.gz`…). Pozor: `docs/audit/route-gates.md` je zastaraný (234 vs. 238 routes).
- **F-29** — verejné cesty s autentifikáciou, ale bez rate limitu: `/api/demo/capture-lead`, `/api/acquire/email`, `/api/demo/prefill-links`.

---

## Čo táto discovery NEDOKÁZALA overiť
Pozri `OPEN_QUESTIONS.md`. Hlavne: PROD env hodnoty, bežiace crony, Stripe Live objekty a 7. webhook udalosť, Resend DNS a webhook URL, branch protection, kvalita RLS policies, výsledok testov (vrátane cenníkových po #908 — nespustené).

## Najmenší krok s najvyššou hodnotou
1. **Read-only potvrdenie F-02** (`curl -i`, Resend delivery log) — nulové riziko, rozhodne, či je F-01 aj o stratených udalostiach.
2. Po potvrdení: **jedna stena** „doručiteľnosť a odhlásenie" = F-02 bypass + F-01 potlačenie/`List-Unsubscribe` + `resend-webhook` bounce/complaint + testy (vyžaduje `gdpr-advisor` gate a GO).
3. Paralelne, pre predaj: Stripe krok C ostáva priorita #1 (čaká na founderove vstupy) — F-03 a F-13 sú podmienky, aby platba niečo spôsobila.
