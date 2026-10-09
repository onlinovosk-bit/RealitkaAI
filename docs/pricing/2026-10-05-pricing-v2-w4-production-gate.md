# Cenník v2 — W4: výrobná brána (P15–P17), vydanie a rollback

**Stav:** 2026-10-05, vetva `claude/mercedes-glc-email-autobazar-p04ljr`, PR #822 (draft). Dokument pripravuje rozhodnutie; **nič z neho sa nevykonalo** (žiadny merge, žiadne Stripe, env ani nasadenie). Stavy dôkazu: IMPLEMENTED ≠ TESTED ≠ VERIFIED ≠ PRODUCTION; vyššie, než je dôkaz, sa netvrdí.

## 1. Verdikt P17: **NOT READY**
Dôvody (každý je overiteľný, vlastník je uvedený v §4): chýbajú živé Stripe ceny a webhook; predajný lievik z webu do CRM stráca zvolený plán; právny text je návrh; migrácia nie je na PROD; offline simulácia nenahrádza beh na reálnej DB a Stripe. Technické jadro za prepínačom je TESTED a nezávisle preverené offline.

## 2. P15 — CI brána (6 otázok)
| Otázka | Odpoveď |
|---|---|
| Čo sa zmenilo | 27 commitov, 125 súborov (+8 039 / −75): kontrakt a ceny v2 (`pricing-v2*.ts`), billing a granty (`credits-billing-v2.ts`, webhook, `billing-store.ts`, `grant-engine.ts`, `monthly-cycle.ts`), migrácia `20261005120000_pricing_v2_agency_columns.sql`, obrazovky CRM, marketing web, texty, plán z v2 ceny (`pricing-v2-plan.ts`, `saas-ops.ts`), dokumenty. Zlúčený `main` (konflikt: webhook route a memory, vyriešené). |
| Čo sa testovalo | Lokálne: CRM celá sada **3 105 testov prešlo**, marketing **29/29**, typecheck **49 chýb pri strope 54** (nové chyby v nových súboroch 0), lint zmenených súborov čistý. Mutation proof: W1 9/9, kontrakt 7/7, vetva A 39/39, B 15/15, C 21/21, D 27/27, W3 opravy 6/6 + 19/19, plán z v2 ceny 6/6. Nezávislé QA (iný agent): offline integračný tok, 54 testov. |
| Čo padlo | Len 8 súborov, ktoré vyžadujú `TEST_SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY` (RLS a `valuation/submit` integračný test): rovnaká trieda zlyhaní ako na báze, nesúvisí so zmenou, no **na báze som ich v tejto session nespúšťal** (UNVERIFIED). |
| Čo prešlo (GitHub, head `bb5ecfc`) | Memory append-only, Zmluva kódu (ratchet), Control Contract, BUS, Memory Engine, Vercel Preview Comments: zelené. |
| Čo ostáva neznáme | „Lint, test, build“ na GitHube v čase písania **beží** (výsledok treba prečítať pred mergom). Reálna DB: atomicita RPC `apply_*`, migrácia na čistej Supabase (`db reset` tu nie je k dispozícii). Reálny Stripe: podpis webhooku, poradie a opakovanie udalostí. Renderovanie obrazoviek v prehliadači. Mobilné zobrazenie. |
| Môže sa to mergovať | **Áno technicky pri vypnutom prepínači, po zelenom „Lint, test, build“ a po zmene PR z draftu**; zmeny billingu a migrácie sú na denylist auto-merge, takže merge robí founder. Merge do `main` spúšťa produkčný build CRM. Pri vypnutom prepínači sú v2 cesty neaktívne, no zmenili sa aj legacy cesty (webhook, grant, životný cyklus), preto po mergi nasleduje smoke legacy toku (§6, krok 4). |

## 3. P16 — staging
**STAGING: nepotvrdený.** Vercel preview nie je staging, ak používa produkčnú databázu alebo kľúče; do repa som nenašiel dokument o oddelenom stagingu. Rozhodnutie foundera: akceptovať riziko (vydanie rovno na PROD s prepínačom a rollbackom) alebo zriadiť staging/Stripe test mód pre celý tok. **Odporúčanie:** minimálne jeden beh celého toku v Stripe **test móde** s testovacou databázou pred zapnutím v produkcii (je to jediný dôkaz, ktorý offline simulácia nahradiť nevie).

## 4. Blokery (číslo = poradie podľa závažnosti)
| # | Závažnosť | Bloker | Vlastník | Čo to odomkne |
|---|---|---|---|---|
| B1 | P1 | **Funnel web → CRM stráca plán.** CTA na webe vedie na `/register?pricing=v2&plan=…`; CRM `/register` tieto parametre nečíta a po registrácii ide na onboarding. Zvolené pásmo sa stratí, platba vznikne len ručným `/upgrade`. Vyžaduje návrh (zachovať zámer cez registráciu a onboarding do `/upgrade`) a zasahuje autentifikáciu/onboarding. | agent + GO foundera | predajný tok „web → platba“ |
| B2 | Blokuje platbu | **Stripe krok C:** v2 ceny na live účte neexistujú (aj STATUS.md: 0 z 10 cien). Zakladá founder; zoznam a presné názvy: `bash scripts/ops/stripe-verify-prices.sh --spec` (manifest rozšírený o 10 v2 kľúčov). Ceny musia mať **`tax_behavior = exclusive`** (cena bez DPH) a produkt Stripe Tax kód; `stripe-verify-prices.sh` to pre v2 ceny teraz kontroluje (MISSING s dôvodom, ak nesedí). | founder | akákoľvek platba |
| B3 | Blokuje plnenie | **Webhook:** `STRIPE_WEBHOOK_SECRET` nie je nastavený (STATUS.md) a endpoint `/api/billing/webhook` musí mať udalosti `checkout.session.completed`, **`checkout.session.async_payment_succeeded` (nové pre v2)**, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`. Bez toho platba prejde, ale plán sa neodomkne. | founder | plnenie platieb |
| B4 | Rozhodnutie | **DPH:** čisté ceny sú bez DPH, v kóde `automatic_tax` iba pri `PRICING_V2_STRIPE_TAX=on`; základ DPH u AIRAmax je neoverený (tvrdenie „sme lacnejší“ platí len ak majú aj oni ceny bez DPH). Stripe Tax a daňové nastavenie účtu sú rozhodnutie foundera a účtovníčky. | founder | fakturácia a porovnanie cien |
| B5 | Právne | **VOP v2** je návrh s položkami „DOPLNIŤ — rozhodnutie foundera“ (DPH, zrušenie, expirácia kreditov, existujúci zákazník, onboarding). Zoznam zmien a 12 otvorených otázok: `docs/pricing/w2d-copy-and-legal-review.md`. | founder + právnik | zverejnenie VOP |
| B6 | Pred zapnutím | **Migrácia** `20261005120000_pricing_v2_agency_columns.sql` nie je na PROD a skutočná PROD schéma nie je overená (podľa starších záznamov zaostávala za repom). Pred aplikáciou: jeden balík SQL + overovací skript, dôkaz pred aj po; aplikácia je samostatné GO. Kód pri chýbajúcich stĺpcoch padne späť na legacy (testované), ale migrácia musí byť nasadená pred zapnutím prepínača. | agent (príprava) + GO foundera | zapnutie v2 |
| B7 | Rozhodnutie | **Kredity nič neúčtujú:** `CREDITS_ENFORCEMENT` je predvolene `off`, takže akcie za kredity sú dnes zadarmo a predaj balíkov alebo jednotlivých kreditov by bol predajom niečoho, čo nemá efekt. Zapnutie vynucovania je obchodné rozhodnutie a kód ho viaže na to, že to referenčný klient vie dopredu. **Odporúčanie:** pri prvom vydaní predávať iba plány (pásma); balíky a dokupovanie skryť, kým sa nezapne vynucovanie. Náklad AI na kredit je **NEMERANÝ**, takže marža balíkov nie je overená. | founder | balíky a dokupovanie |
| B7a | Hotové (STRIPE-C-READY) | **Režim „len plány“** `PRICING_V2_PLANS_ONLY` (predvolene ZAPNUTÝ, vypína len `false`/`0`/`off`): `checkout-config` nevracia balíky, UI skryje výber balíka aj dokúpenie kreditov, checkout API vráti 403 `credits_not_sold` pre balík aj jednorazový kredit PRED Stripe volaním, `checkoutAvailable` vyžaduje len 4 ceny plánov, web nezobrazí blok balíkov. Webhook plnenie nezmenené (už existujúce relácie sa dokončia). Stripe ceny balíkov a kreditu sa môžu pripraviť, ale nemusia byť v env. | agent | balíky a dokupovanie |
| B8 | Prevádzka | **Dva prepínače, dve nasadenia:** `PRICING_V2_ENABLED` sa musí zapnúť v CRM aj v marketingu (marketing je samostatná aplikácia `apps/marketing`; jej Vercel projekt a env som nevidel, UNVERIFIED). Stránky `terms`, `landing`, `/` a `/demo` sú statické: prepínač sa vyhodnotí pri builde, zmena env vyžaduje nové nasadenie oboch. Podľa záznamu z 1. 10. mal Vercel Hobby limit 100 nasadení za deň (aktuálny stav neoverený). | founder | zapnutie |
| B9 | P2 | **Zvyšky starých cien a textov** (nerozhodnuté): „30-dňová garancia“ vo `PaywallLock` a `RozpisFunkcionalit`, `capability-registry` („Radar od 99 €“), billing stránka pre v2 stále hovorí „Seat program / Owner Cockpit“, `/demo` a `/demo/live` bez v2. | founder (garancia) + agent | konzistentná ponuka |
| B10 | Rozhodnutie | **Onboarding:** 99 € (zaplatil referenčný klient) vs. 0 € (záznam `DEC-20260924-001`) pre nových zákazníkov. Obnovu referenčného klienta dohodne founder osobitne; v kóde sa legacy klient nikdy automaticky nepresúva. | founder | text ponuky |

## 5. Nevyriešené riziká, ktoré by founder prijal vedome
- Offline simulácia atomicity (RPC) a Stripe udalostí nenahrádza živý beh (B6, §3).
- Stav predplatného pri plnení sa berie zo Stripe; ak je Stripe nedostupný, plnenie zlyhá a Stripe ho zopakuje (fail-closed, žiadny predčasný grant).
- Cron prechádza všetky agentúry s `seats > 0`; záťaž nemeraná.
- `saas-ops` mapoval seat-model ceny (79/71/63 €) na „free“ aj predtým; v2 je opravené, seat model nie (nepredáva sa).
- Pásmo 26+ (Sieť) je „od 349 €“ a rieši sa dohodou; pred prvým zákazníkom v tomto pásme treba proces.

## 6. Poradie vydania (skript pre P18; **nevykonávať bez výslovného GO na každý krok, ktorý mení PROD**)
Poradie je pevné: migrácia pred kódom, ktorý ju potrebuje; žiadna chvíľa s novou verejnou cenou a starým checkoutom.
1. **Stripe (founder):** vytvoriť v live móde presne ceny z `--spec` (bez DPH, `tax_behavior=exclusive`), spustiť `stripe-verify-prices.sh` a poslať výstup (overenie spravím ja). Nastaviť webhook endpoint a `STRIPE_WEBHOOK_SECRET` podľa B3.
2. **Migrácia (GO foundera):** aplikovať na PROD jeden balík SQL s overovacím skriptom (stĺpce existujú, existujúce riadky nezmenené, `pack_credits = 0`); dôkaz pred aj po.
3. **PR #822 z draftu na review; „Lint, test, build“ zelené na aktuálnom heade; merge do `main` (founder)** pri vypnutom prepínači. Počká sa na produkčný build CRM.
4. **Smoke legacy toku po mergi** (prepínač vypnutý): prihlásenie, `/billing`, `/upgrade` ako dnes; referenčný klient ostáva na dohodnutých podmienkach; `GET /api/billing/checkout-config` má `pricingV2.enabled=false`; Stripe webhook odpovedá 200 na testovaciu udalosť.
5. **Zapnutie (jedno okno):** vo Vercel nastaviť v CRM aj v marketingu `PRICING_V2_ENABLED=true` a v CRM 10 premenných `STRIPE_PRICE_V2_*`, podľa B4 `PRICING_V2_STRIPE_TAX`; **nasadiť oba projekty** (statické stránky). Poradie: najprv CRM, hneď potom marketing.
6. **P19 po vydaní (founder + agent):** viď §8.

## 7. Rollback (do minúty, bez straty plnenia)
1. Vo Vercel vrátiť **predchádzajúce nasadenie** CRM aj marketingu (okamžitý rollback, nevyžaduje build), alebo `PRICING_V2_ENABLED` vypnúť a nasadiť znova (statické stránky potrebujú build).
2. Webhook plní **už zaplatené** v2 relácie aj pri vypnutom prepínači (zámer kontraktu), takže platba nezostane bez plnenia.
3. Migrácia je aditívna (`ADD COLUMN IF NOT EXISTS`), vracať sa nemusí.
4. Zákazníci, ktorí už v2 kúpili, ostávajú `pricing_model='v2'`; refundácie sa robia ručne v Stripe.
5. Stripe v2 ceny sa nemažú; podľa potreby sa archivujú.

## 8. Akcie úrovne 3, ktoré vydanie odomkne
Verejne viditeľné nové ceny; živé opakované strhávanie platieb od zákazníkov (Stripe subscription); nové právne znenie VOP; živý predajný odkaz z webu do CRM. Žiadna správa zákazníkom sa nenasadením neodosiela.

## 9. Overenie po vydaní (P19)
1. Verejný web a CRM ukazujú v2 pásma s čistou aj konečnou cenou (30,75 / 73,80 / 183,27 / 429,27 € pri 23 % DPH), bez Owner Cockpitu 349 € a bez 79/71/63 €.
2. **Skutočný nákup najlacnejšieho plánu (25 €) kartou foundera v live móde**, potom refundácia: webhook 200, riadok `agencies` (pásmo, `licensed_users`, `seats`, `account_tier`, `subscription_status=active`), v `credit_ledger` práve jeden grant s hodnotou pásma, CRM ukáže správny plán (nie „free“), suma na faktúre v centoch = katalóg.
3. Zrušenie predplatného: `canceled`, žiadny ďalší grant.
4. Referenčný klient: stránka a podmienky nezmenené.
5. Nákladová telemetria: zmerať náklad AI na kanceláriu (SELECT z `callOpenAI()` telemetrie), bez čísla sa marža balíkov neuvoľňuje.
Nikdy sa nehlási úspech podľa „build prešiel“: len podľa kroku 2.

## 10. Čo je overené a čo nie
**TESTED:** ceny a DPH na cent, pásma 1/2/6/7/25/26, grant na kanceláriu, idempotencia a súbežnosť webhooku, sfalšované metadáta (fail-closed), ochrana legacy predplatiteľa, replay po zrušení (stav zo Stripe), plán z v2 ceny, 409/503/404 kódy a ich zobrazenie, pri vypnutom prepínači zhodný výstup (golden porovnania), spolupráca so životným cyklom z `main`.
**Nepreverené:** reálna DB a Stripe, prehliadač a mobil, výkon, náklad AI, marža, právna správnosť VOP, reálny beh B1 (funnel).
