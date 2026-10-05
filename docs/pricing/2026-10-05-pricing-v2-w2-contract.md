# Cenník v2 — W2 kontrakt (vetvy A–D)

**Stav:** zmrazené 2026-10-05 pred spustením W2. Rozhranie v kóde: `apps/crm/src/lib/pricing-v2.ts` (W1: ceny, pásma, DPH) a `apps/crm/src/lib/pricing-v2-contract.ts` (W2: Stripe kľúče, tvar požiadavky, metadáta, tvar `checkout-config`, mapovanie pásma na `account_tier`). Vetvy tieto súbory **nemenia**; ak treba zmenu, vrátia ju koordinátorovi.
**Pravidlá:** v2 je za `PRICING_V2_ENABLED` (predvolene vypnuté); **pri vypnutom prepínači sa správanie nesmie zmeniť** (testom dokázať). Žiadny merge, žiadne produkčné Stripe/env, žiadne hodnoty tajomstiev. Stripe ceny zakladá founder; agent ich nevytvára ani nehádá ID.

## Spoločné fakty (overené v kóde)
- Dnes: seat checkout (`credits-billing.ts`, `quantity = seaty`), webhook `api/billing/webhook/route.ts` → `credits-billing-webhook.ts`, plus `billing-store.ts:509-660` (aktivity a `syncAccountTier`). Grant: `credits/grant-engine.ts` (grant = seaty × sadzba podľa `account_tier`; **neznámy `account_tier` padá na „team“**), cron `credits-cycle` vyberá agentúry `.gt("seats", 0)` so stĺpcami `id, seats, account_tier, grant_credits_balance, purchased_credits_balance, owner_cockpit_active, credits_balance` (`credits/monthly-cycle.ts:11,51,80-81`).
- **Pasca 1:** `customer.subscription.created/updated/deleted` volajú `syncAccountTier(customer, priceId)`; neznáme (v2) price ID by mohlo agentúru prepísať na „free“. Vetva A musí v2 price ID rozpoznať a tieto volania pre ne obísť.
- **Pasca 2:** v2 agentúra s `account_tier` mimo legacy hodnôt dostane „team“ grant × seaty. Vetva A musí grant-engine urobiť v2-aware **skôr**, než sa v2 agentúra vôbec uloží.
- **Pasca 3:** cron neskúma `subscription_status`; v2 grant smie ísť len pri `active`.
- Marker v2 agentúry: stĺpec `agencies.pricing_model` (`'v2'` alebo NULL = legacy), `pricing_band`, `licensed_users`, `pack_credits` (nová aditívna migrácia; NULL/0 pre existujúce riadky). `seats` sa pre v2 plní počtom povolených používateľov, aby ju cron zachytil; `account_tier` podľa `PRICING_V2_BAND_ACCOUNT_TIER`.

## API kontrakt
**`GET /api/billing/checkout-config`** — všetky doterajšie polia ostávajú bez zmeny, pridáva sa `pricingV2: PricingV2ConfigPayload` (`enabled`, `checkoutAvailable`, `missingPriceEnvKeys` len názvy, `catalog` alebo null pri vypnutí).

**`POST /api/billing/credits/checkout`** (existujúca trasa; obálka odpovede ako dnes `okResponse({ result: { id, url } })` / `errorResponse`):
- `{ checkoutType: "pricing_v2", users, packCredits? }` → Stripe subscription Checkout: riadok pásma (qty 1) + voliteľne riadok balíka (qty 1), `metadata` podľa `buildPricingV2PlanMetadata`.
- `{ checkoutType: "pricing_v2_credits", credits }` → Stripe payment Checkout, cena `STRIPE_PRICE_V2_CREDIT`, množstvo = `credits`.
- Chyby: vypnuté v2 → 404 s `code: "pricing_v2_disabled"`; kancelária s existujúcim (legacy) predplatným → 409 `legacy_subscription`; neplatný vstup → 400 `invalid_request`; chýbajúce ceny → 503 `prices_not_configured` (len názvy env).
- Stripe verzia a DPH: `tax_behavior` je vlastnosť ceny (zakladá founder, exkluzívna daň); `automatic_tax` sa zapne len ak je env `PRICING_V2_STRIPE_TAX` rovné `on`.

**Webhook:** `isPricingCheckoutSession` a `handlePricingCheckoutWebhook` rozpoznajú `pricing_v2` a `pricing_v2_credits`. Fulfillment: neplatné metadáta → 500 (Stripe zopakuje), nikdy tiché `true`.

## Akceptačné kritériá (každé musí mať test; sabotáž → červená)
**A (billing):** (1) vypnutý prepínač = legacy cesty nezmenené; (2) fulfillment nastaví pásmo/používateľov/balík a prvý grant práve raz; (3) duplicitný a súbežný webhook nedá druhý grant (idempotentný kľúč na `session.id`/`invoice.id`); (4) `subscription.created/updated/deleted` s v2 price ID nevolá `syncAccountTier` a správne mení pásmo/stav; (5) neúspešná platba/zrušenie → žiadne ďalšie granty (`subscription_status` ≠ active); (6) grant-engine: v2 grant = kredity pásma + `pack_credits`, **nie** seaty × sadzba; legacy agentúra dostane rovnaký grant ako dnes; (7) mesačné (grant) a jednorazové (purchased) kredity majú odlišnú expiráciu ako dnes; (8) legacy predplatiteľ nemôže spustiť v2 checkout (409) a nikdy sa automaticky nepresúva; (9) migrácia je aditívna, idempotentná a prejde na čistej DB (replay a schema-gap kontroly repa); (10) Stripe cenový manifest (`scripts/ops`) rozšírený a drift test zelený.
**B (CRM obrazovky):** pri vypnutom prepínači nezmenený výstup; pri zapnutom ukáže pásma, čistú aj konečnú cenu s DPH, výber počtu používateľov (1–N → správne pásmo), voliteľný balík, jednorazové kredity; CTA volá checkout podľa kontraktu a spracuje 404/409/503; chybu `prices_not_configured` ukáže ako „nie je dostupné“, nie ako rozbitú stránku. Archívne hardcody 49/99/199/449 ostanú len mimo v2 vetvy.
**C (marketing):** pri vypnutom prepínači nezmenený výstup; pri zapnutom ukáže pásma z katalógu (čistá + konečná cena), predajné CTA vedie do registrácie/CRM checkoutu (nie priamo do Stripe bez `agencyId`); starý marketingový checkout (`api/checkout/subscription`) sa nepoužije pre v2 a nezmení pre legacy; Owner Cockpit 349 € sa v v2 ponuke neukazuje; prepínač `PRICING_V2_ENABLED` sa číta rovnako ako v CRM (rovnaký názov env).
**D (texty):** živé cenové a právne texty mimo vetiev B a C (VOP/terms, sidebar, FinalCTA, onboarding a ďalšie z inventúry W0) majú v2 variant za prepínačom; pri vypnutom je výstup zhodný bajt po bajte. Texty podľa `docs/architecture/clay-positioning-reframe.md` (začať VÝSLEDKOM), referenčný klient sa nepomenúva. Právne znenie (VOP) je **návrh na revíziu foundera/právnika**, nie schválený text.

## Územia (write-sety, párovo disjunktné)
| Vetva | Smie meniť |
|---|---|
| A | `apps/crm/src/lib/credits-billing*.ts`, `apps/crm/src/lib/credits/**`, `apps/crm/src/lib/billing-store.ts`, `apps/crm/src/app/api/billing/**`, `apps/crm/supabase/migrations/**` (len nová), `scripts/ops/stripe-verify-prices*` a súvisiaci manifest/test, testy k týmto súborom |
| B | `apps/crm/src/app/(dashboard)/billing/**`, `apps/crm/src/app/(dashboard)/upgrade/**`, `apps/crm/src/app/(dashboard)/porovnanie-programov/**`, `apps/crm/src/components/billing/**`, testy k nim |
| C | `apps/marketing/**` |
| D | `apps/crm/src/app/(public)/terms/**`, `apps/crm/src/components/layout/sidebar.tsx`, `apps/crm/src/types/revolis.ts`, `apps/crm/src/app/(marketing)/landing/**`, `apps/crm/src/components/marketing/**`, `apps/crm/src/components/**/RozpisFunkcionalit*`, `apps/crm/src/components/**/AiInsightsPanel*`, `apps/crm/docs/onboarding/**`, `apps/crm/docs/pricing-v1.md`, nový `docs/pricing/w2d-copy-and-legal-review.md`; nič z území A, B, C |
Nikto nemení: `pricing-v2.ts`, `pricing-v2-contract.ts`, `program-tier-pricing.ts`, `credit-rates.ts`, `docs/AUTOMERGE-POLICY.md`, `.github/**`, `memory/**`.

## Mimo rozsahu W2 (zapísané, nerobí sa)
Vynucovanie limitu používateľov pri pozvánkach (`licensed_users` sa len eviduje); samoobslužná zmena pásma v UI (dnes cez Stripe portál); automatické dobíjanie (ostáva vypnuté); zapnutie `CREDITS_ENFORCEMENT`; produkčné Stripe ceny a env; zverejnenie webu (W4).

## Otvorené rozhodnutia foundera (nezastavujú W2)
Základ DPH u AIRAmax; ktoré funkcie Owner Cockpitu patria do nových plánov (v2 ho nepredáva samostatne); onboarding 99 € vs. 0 €; politika pri minutí kreditov.
