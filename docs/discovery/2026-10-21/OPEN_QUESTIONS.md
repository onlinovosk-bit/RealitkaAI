# OPEN_QUESTIONS — nevyriešené predpoklady a chýbajúce dôkazy

> Revolis.AI reverse-engineering & system discovery v1.0 · 2026-10-21 · HEAD `a04bc5e` (main, #908) · iba čítanie.
> Všetko tu je **UNKNOWN**: z repozitára sa to nedá overiť. Každá otázka má: čo chýba → ako to overiť (bez zápisu) → kto/čo to odomkne → čo to mení vo `FINDINGS.md`.
> Nič z tohto zoznamu sa v tejto discovery nevykonalo — overenia mimo repozitára (PROD, Vercel, Stripe, Resend, GitHub nastavenia) robí founder alebo agent s výslovným GO.

## Rýchly prehľad — čo odomkne najviac

| # | Otázka | Odomkne | Kto | Cena overenia |
|---|---|---|---|---|
| Q-01 | Vracia PROD 401 na `/api/resend-webhook` bez cookie? | F-02, F-01 | agent (curl) / founder | 1 príkaz, nulové riziko |
| Q-02 | Ktoré cron routes naozaj bežia (10 bez známeho spúšťača) | F-28, F-10, F-03 | agent (`cron_runs`, SELECT) | 1 dotaz |
| Q-03 | Stripe Live: objekty, 7. webhook udalosť, dunning | Stripe krok C, F-13 | **founder** (screenshot/ID) | 10 min |
| Q-04 | Kvalita RLS policies v PROD (`pg_policies`) | F-12, F-14, F-07 | agent (SELECT) | 1 dotaz |
| Q-05 | Branch protection a povinné checky | celý CI model | **founder** (GitHub nastavenia) | 2 min |

---

## A. Prostredie a nasadenie (Vercel)

- **Q-06 — Hodnoty PROD env premenných.** Merané boli len *názvy a ciele* (17 Stripe/pricing premenných); hodnoty sa zámerne nečítali. Neznáme: `CREDITS_ENFORCEMENT`, `AGENT_KILL_SWITCH`, `PRICING_V2_ENABLED`, `PRICING_V2_PLANS_ONLY`, `PRICING_V2_STRIPE_TAX`, `NODE_ENV`-závislé cesty, existencia `CRON_SECRET`. *Overenie:* Vercel dashboard → Environment Variables (hodnoty nezdieľať v chate; stačí „nastavené/nenastavené/true/false"). *Mení:* F-03 (spoplatňovanie), F-16, F-04.
- **Q-07 — Správa `x-forwarded-for` na Verceli.** Rate limiter kľúčuje na XFF (F-11). Neznáme, či ho Vercel pri vstupe prepisuje. *Overenie:* dva `curl` s rôznym vlastným `X-Forwarded-For` na rate-limitovanú cestu a pozrieť, či sa počítajú oddelene. *Mení:* F-11 zo „možné" na „reálne/nereálne".
- **Q-08 — Ktoré nasadenie je „live" a z akého SHA.** `/api/healthz` neexponuje SHA nasadenia (spomenuté už v kontrakte cross-agent §7). *Overenie:* `list_deployments` (Vercel) vs. `git log`. *Mení:* každé tvrdenie „v PROD je X" v tomto balíku je len „v kóde na `a04bc5e`".

## B. Platby (Stripe) — prioritné

- **Q-03a — Existujú v LIVE Stripe produkt, ceny a kupón?** Z tejto session nebol prístup do Stripe; k dispozícii boli len founderove screenshoty. *Overenie:* founder pošle **ID** (nie kľúče): `price_…` mesačná, `price_…` ročná, `coupon` ročného promo. *Odomkne:* míľnik 7 SESSION bloku (`STRIPE_PRICE_V3_SEAT_MONTHLY` + redeploy → `checkoutAvailable: true`).
- **Q-03b — Ktorá je 7. webhook udalosť?** V dashboarde je nakonfigurovaných 6, kód/dokumentácia očakáva 7. *Overenie:* founder pošle zoznam udalostí endpointu. *Mení:* F-13 (ktorá udalosť je dnes ticho zahodená).
- **Q-03c — Rozhodnutie A/B/C pre tier 21+ makléri** (odporúčané A) je nezodpovedané. Bez neho sa nedá uzavrieť cenník pre 30 maklérov (cieľ: ročne po zľave 1 930 € bez DPH; mesačne 250 € bez DPH). *Kto:* founder.
- **Q-03d — Dunning / retry / „Smart Retries" a e-maily o zlyhanej platbe** v Stripe. Neznáme, čo sa stane pri zlyhaní platby mimo kódu. *Mení:* F-10 (kto zruší prístup), F-08.
- **Q-09 — `PRICING_V2_STRIPE_TAX`:** zámer (Stripe Tax vs. ceny bez DPH s ručnou DPH) nebol od foundera potvrdený. *Mení:* spôsob, akým sa 1 930 € / 250 € „bez DPH" zobrazí a fakturuje.
- **Q-10 — Prekrytie ciest lifecycle a v2 revoke.** `syncAgencyBillingLifecycle` a v2 vetva `handlePricingCheckoutWebhook` môžu pri tej istej udalosti meniť tú istú agentúru. Poradie a prípadný konflikt sa nedajú dokázať čítaním; potrebný je integračný test s reálnymi payloadmi udalostí. *Mení:* F-13.
- **Q-11 — Pricing testy po #908.** Posledné zmeranie (69/69) je spred #908; po zmene 2 makléri = 50 €, 3–5 = 65 € sa nespustili v tejto discovery. *Overenie:* `npx vitest run` nad cenníkovými testami v `apps/crm`; drift test JSON tiers ↔ `licenseN`. *Stav:* **NOT_VERIFIED**.

## C. E-mail a doručiteľnosť (Resend)

- **Q-01 — F-02 živé potvrdenie.** `curl -i -X POST https://<crm-host>/api/resend-webhook` bez cookie: 401 = potvrdené, 200/400 = proxy cestu pustí (a F-02 padá). Doplnok: Resend → Webhooks → delivery log (úspešnosť doručenia na našu URL).
- **Q-12 — Resend DNS (SPF/DKIM/DMARC) a webhook URL v dashboarde.** Z repozitára nezistiteľné. Odpoveď od foundera je už dlho otvorená (STATUS: „founder: Resend DNS + reply-to + súhlas referenčného klienta"). *Mení:* F-01 závažnosť (bez DKIM/DMARC je riziko doručiteľnosti vyššie), aj reálna hodnota „opt-in auto-odpovede".
- **Q-13 — Existuje už ručná suppression/unsubscribe evidencia** mimo CRM (napr. v Resend audience alebo v Gmaile)? Ak áno, F-01 je organizačný, nie len technický.
- **Q-14 — Právny základ outbound (6(1)(f) + test proporcionality).** Skill `gdpr-advisor` v repozitári **chýba**, preto nebola vykonaná brána z CLAUDE.md pravidlo 5 pre outbound/inbound dáta. *Odomkne:* `GO GDPR-ADVISOR` (vytvoriť skill) a až potom stena „doručiteľnosť a odhlásenie".

## D. Databáza (Supabase PROD `ypgajkhqtbriqqmyawyv`)

- **Q-04 — Kvalita RLS policies.** Merané: 142 tabuliek v `public`, všetky s RLS **zapnutým**. Nemerané: obsah policies (napr. `USING (true)`, chýbajúci `agency_id`). *Overenie:* `SELECT schemaname, tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname='public'` (iba čítanie) + porovnanie s migráciami (F-14). *Mení:* F-07, F-12, F-14.
- **Q-15 — Reálne dáta za F-07.** `/api/agents/cleaner` maže `leads` bez filtra tenanta: koľko riadkov by v PROD zasiahol (agregát `COUNT` podľa kritéria cleanera, **nie** `DELETE`) a či existuje druhý tenant s podobnými dátami.
- **Q-16 — Edge functions.** Zoznam a obsah Supabase edge functions nebol prečítaný (`list_edge_functions` sa nevolal). *Mení:* inventár integrácií a povrch útoku.
- **Q-17 — Obsah `cron_runs` za posledných 7 dní** (pre Q-02): ktoré `job` mená sa zapisujú, odkedy a s akým stavom.

## E. Cron a pozadie

- **Q-02 — 10 cron routes bez známeho spúšťača** (vrátane `credits-grant` a `credits-expire`): chýba v `vercel.json` aj vo workflowoch. Neznáme, či ich spúšťa externý plánovač (Supabase pg_cron, cron-job.org, ručne). *Overenie:* `cron_runs` (Q-17) + Vercel Cron panel. *Mení:* F-28, F-10, či kredity vôbec niekedy vznikajú.
- **Q-18 — Dvojité plánovanie Gmail pull** (vercel.json aj GitHub Action): beží naozaj 2×? *Overenie:* `cron_runs`/logy za 24 h. *Mení:* F-19.
- **Q-19 — `apps/realvia-ingestion` a `apps/revenue-intelligence`** (mimo workspaces): nasadzujú sa niekam? Nemajú CI ani Vercel projekt, ktorý by som videl. *Mení:* ARCHITECTURE §1 (mŕtve vs. živé), integračný povrch.
- **Q-20 — Vlastníctvo pozadia mimo CRM** (`packages/bus-core`, `control-contract`): ktorý proces ich číta v PROD.

## F. CI a governance (GitHub)

- **Q-05 — Branch protection a required checks** na `main`. Z repozitára nezistiteľné; ovplyvňuje, či „CI zelené" je skutočná brána. *Overenie:* GitHub → Settings → Branches (founder) alebo API s prístupom správcu.
- **Q-21 — `scripts/check-security.mjs` a `.github/scripts/automerge-policy.mjs`** neboli prečítané. Môžu zakrývať alebo naopak vynucovať časť nálezov (F-18, F-19). *Overenie:* prečítať a spustiť lokálne (read-only).
- **Q-22 — Výsledky testov.** Discovery prečítala testy len ako existenciu, nie obsah a nespustila ich (okrem staršieho 69/69 pred #908). Preto všetky tvrdenia o správaní sú **z kódu, nie z behu**. *Overenie:* CI na `a04bc5e` (`actions_list` pre `main`) + lokálny `vitest`.
- **Q-23 — Baseline-diff typecheck** kompenzuje `ignoreBuildErrors: true`. Neznáme: veľkosť základnej línie (počet tolerovaných chýb) a či sa pri merge niekedy obnovuje bez review.

## G. Dáta a súlad

- **Q-24 — Obsahuje `/api/realvia/import` v PROD osobné údaje** (F-06 loguje prvých 1000 znakov XML)? *Overenie:* vzorka (zmaskovaná) z Vercel logov, len founder.
- **Q-25 — Zhoda integrácií s `docs/architecture/master-data-sourcing-map.md`.** Porovnanie INTEGRATIONS §2 s mapou nebolo urobené riadok po riadku; kritické sú katastrálne vlastníctvo (len ÚGKK zmluva), portály (len fakty inzerátu, ToS/robots) a RPO. *Mení:* pravidlo 4 z CLAUDE.md; ak niečo v kóde nie je v mape → „otvorená neznáma".
- **Q-26 — Retencia a mazanie osobných údajov** (leads, e-maily, `inbound_mail_outcomes`, logy): žiadna evidovaná politika; DSAR (výmaz/export) proces neprečítaný.
- **Q-27 — Reálny obsah a pokrytie e-mailov** v `inbound_mail_outcomes` (kvalita parsera na reálnych portálových správach). STATUS: „čaká na reálne portálové maily".

## H. Nečítané časti kódu

- **Q-28 — Knižnice promptov a matchingu** (`lib/ai`, `lib/matching`, scoring) a cesty `outreach/preview|campaigns|segments|templates` boli prečítané len povrchovo; správanie, náklady na LLM a prípadné prompt-injection povrchy (vstup z e-mailov a inzerátov = nedôveryhodný) nie sú posúdené.
- **Q-29 — Timeouty a opakovania klientov** (OpenAI, Anthropic, HubSpot, WMS/katastrálne). Defaulty SDK a vlastné `fetch` volania nie sú zmerané (F-17).
- **Q-30 — Marketing (`apps/marketing`) ↔ cenník.** Ako marketing číta katalóg cien (drift test existuje, zdroj pravdy a build čas nie sú overené) a či ceny na verejnom webe zodpovedajú #908 a „bez DPH".
- **Q-31 — Mŕtvy kód (F-27)**: pred mazaním treba potvrdiť, že nič nie je dynamicky importované ani volané externe (webhooky tretích strán, ručné skripty).

---

## Čo discovery NEROBILA (a prečo to nie je medzera v postupe)

- Nevolala Stripe, Resend, Realvia ani žiadny platený/odosielací endpoint.
- Nezapísala do PROD DB; čítala len agregáty (počty agentúr, stav RLS zapnuté/vypnuté).
- Nečítala hodnoty tajomstiev; v dokumentoch sú len **názvy** premenných.
- Nespúšťala testy ani build (read-only pravidlo + žiadna inštalácia závislostí bez GO).
- Nemenila kód, env, CI, nasadenie; jediné pridané súbory sú tieto dokumenty v `docs/discovery/2026-10-21/` a zápis pamäte/stavu na konci steny.
