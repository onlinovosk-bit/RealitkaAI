# Cenník v2 — W0 inventúra živých cien

**Stav:** W0 (iba čítanie), 2026-10-05, vetva `claude/mercedes-glc-email-autobazar-p04ljr`. Žiadna zmena kódu, Stripe ani webu. Vychádza z exekučného plánu foundera (`Revolis-cennik-v2-execution-pack-2026-10-05.md`) a z prehľadu repa (cesta:riadok). Hodnoty env premenných sa nečítali, uvedené sú len názvy. Nezistené veci sú označené UNVERIFIED.

## 1. Zhrnutie
V repe žijú **dva cenové modely naraz**: (A) seat 79/71/63 € v kóde (CRM aj web), (B) „199 € / kancelária“ v dokumentoch a metrikách (`apps/crm/src/lib/metrics/compute.ts:19,69,78`, DEC-20260924-001) bez checkoutu a bez Stripe kľúča. Nový cenník v2 (paušál na kanceláriu + mesačné balíky) nemá žiadnu cestu v kóde: ani checkout, ani webhook, ani grant.

## 2. Mapa povrch → cena → checkout → webhook → grant

| Povrch | Dnes ukazuje | Zdroj ceny | Checkout | Stripe env (názvy) | Webhook / grant |
|---|---|---|---|---|---|
| Web PricingSection | 79/71/63 € za seat, grant 30/25/20 | `apps/marketing/components/landing/PricingSection.tsx`, cez `apps/marketing/lib/pricing.ts:5-17` (re-export z CRM) | CTA → LeadCaptureModal | — | — |
| Web Owner Cockpit | **349 €** (founder 249 €) | `PricingSection.tsx:122-138`, `program-tier-pricing.ts:96-106` | rovnaké CTA | `STRIPE_PRICE_OWNER_COCKPIT`, `_FOUNDER` | CRM webhook, +100 kreditov |
| Web LeadCaptureModal | **hardcode** 79/71/63 € + text „s DPH“ | `apps/marketing/components/LeadCaptureModal.tsx:344-346,417` | `POST /api/checkout/subscription` | — | — |
| Web `/api/checkout/subscription` | cenu určuje Stripe price | `apps/marketing/app/api/checkout/subscription/route.ts` (`quantity: '1'`) | mode=subscription | `STRIPE_PRICE_SMART_START`, `_RADAR_MAKLERA`, `_STRAZCA`, `_REALITY_MONOPOL` (**iné názvy než v CRM**) | metadata bez `agencyId`/`checkoutType` → CRM to nezaradí ako seat, **grant sa nepridelí** |
| Web /balik | 47 € | `program-tier-pricing.ts:133-139` | `/api/starter-pack/checkout` | `STRIPE_PRICE_STARTER_PACK` | `credits-billing-webhook.ts:70-76` |
| Web revenue-scan | 149 € / 99 € | `apps/marketing/app/api/revenue-scan/checkout/route.ts` | `/api/revenue-scan/checkout` | `STRIPE_PRICE_AUDIT_149`, `_AUDIT_99` | webhook nenájdený (UNVERIFIED) |
| Web ďalšie hardcody | 79/71/63 € | `apps/marketing/app/zakulisie/[token]/page.tsx:268-270,609`, `components/demo/DemoSections.tsx:172` | — | — | — |
| CRM seat checkout | 79/71/63 € (`PLAN_PRICES_EUR`) | `apps/crm/src/lib/program-tier-pricing.ts:9-13,41-66` | `POST /api/billing/credits/checkout` → `createSeatCheckoutSession` | `STRIPE_PRICE_SOLO_SEAT`, `_TEAM_SEAT`, `_OFFICE_SEAT` | `api/billing/webhook` → `credits-billing-webhook.ts:23-52` |
| CRM top-up | 49/129/379/999 € za 50/150/500/1500 kr., **jednorazové** | `program-tier-pricing.ts:155-185` | `credits-billing.ts:150-181` (mode=payment) | `STRIPE_PRICE_CREDITS_START/_RAST/_PRO/_MEGA` | `applyTopupPurchase` (idempotentné) |
| CRM checkout-config | seat + cockpit + top-up, `missingPriceEnvKeys` | `apps/crm/src/app/api/billing/checkout-config/route.ts:19-55` | GET | — | — |
| CRM ProgramComparison | 49/99/199/449 € + „onboarding 99 € s DPH“ + 79/71/63 € | `apps/crm/src/components/billing/ProgramComparison.tsx` (hardcode) | — | — | — |
| CRM legacy plány | 49/99/199/449 € | `apps/crm/src/lib/billing-store.ts:151-238` | `POST /api/billing/checkout` | `STRIPE_PRICE_STARTER/_PRO/_MARKET_VISION/_PROTOCOL_AUTH/_ONBOARDING…` | `billing-store.ts:509-660`, bez grantu kreditov |
| CRM VOP | 79/71/63 €, CRM Sync 49 €, White Label 299 €, **DPH neuvedená** | `apps/crm/src/app/(public)/terms/page.tsx:57-88` | — | — | — |
| CRM ďalšie hardcody | 49/99/199/449, 79/71/63 | `types/revolis.ts:15-16`, `layout/sidebar.tsx:108-109`, `billing/page.tsx:18-21`, `landing/sections/FinalCTA.tsx:140-190` a ďalšie | — | — | — |
| „199 € / kancelária“ | MRR = 199 € × počet kancelárií | `metrics/compute.ts:19,69,78` | **žiadna trasa** | **žiadny kľúč** | — |
| Mesačný grant | seat × 30/25/20 (+100 cockpit) | `credits/grant-engine.ts:45-81`, `program-tier-pricing.ts:372-388` | cron `/api/cron/credits-cycle` (`0 5 1 * *`, `apps/crm/vercel.json:70-71`) | — | `credits/monthly-cycle.ts` |

## 3. Rozpory medzi exekučným plánom a skutočnosťou (overené v kóde)
1. **`apps/crm/src/lib/billing-lifecycle.ts` neexistuje** (overené Glob-om v `apps/`). Plán ho uvádza ako súbor, ktorý z `quantity` odvodzuje veľkosť tímu. Životný cyklus predplatného rieši `billing-store.ts:509-660`. Územie vetvy A v pláne treba upraviť.
2. **Seaty sa nepremietajú zo Stripe `quantity` do webhooku:** idú cez `metadata.seatQuantity` (`credits-billing.ts:104,142` → `credits-billing-webhook.ts:26`). `customer.subscription.updated` (`billing-store.ts:565-600`) seaty neaktualizuje, rieši len tier podľa price ID. Zmena pásma pri pridaní človeka teda potrebuje novú logiku.
3. **Kredity pri obnove prideľuje len cron 1. dňa v mesiaci**, nie `invoice.paid`. Mesačné opakované balíky potrebujú vlastné plnenie pri každej úspešnej faktúre (inak vznikne rozdiel medzi zaplatením a grantom).
4. **Marketing checkout a CRM checkout sú dva oddelené toky.** Marketingový posiela metadata bez `agencyId`/`checkoutType`, takže ho CRM webhook nepovažuje za pricing session. „Zmena karty na webe“ platbu neopraví (plán to správne tvrdí).
5. **DPH nie je v checkoute implementovaná:** v `apps/` sa nenašlo `tax_behavior` ani `automatic_tax`; „s DPH“ je len textový štítok (`LeadCaptureModal.tsx:417`, `ProgramComparison.tsx`), VOP DPH neuvádza. Runbook `docs/runbooks/calendly-a-stripe-nastavenie.md:225-228` priznáva, že tax behavior nebol rozhodnutý. Pre „čistú a konečnú cenu“ z plánu treba rozhodnúť základ DPH a nastaviť ho aj v Stripe.
6. **Hranice auto-merge:** `docs/AUTOMERGE-POLICY.md:19-31` pokrýva `program-tier-pricing.ts`, `credits-billing.ts`, `**/stripe/**`, migrácie, `vercel.json`, `.github/**`. **Nepokrýva** `credits-billing-webhook.ts`, `grant-engine.ts`, `billing-store.ts`, `api/billing/**`, `apps/marketing/lib/pricing.ts`, `PricingSection.tsx`, `LeadCaptureModal.tsx`. Plán o týchto súboroch tvrdí „denylist“; v skutočnosti ich robot nechráni. Merge ostáva v rukách foundera, treba to však držať ako pravidlo, nie spoliehať sa na denylist.
7. **Kolízia čísel:** verejný Owner Cockpit stojí **349 €** a nový plán Sieť je „od 349 €“. Plán tiež žiada rozhodnúť, ktoré funkcie Cockpitu patria do plánov a jeho starú cenu odstrániť.
8. **Onboarding:** `apps/crm/docs/onboarding/visit-real-onboarding-email.md` hovorí „99 € s DPH“, DEC-20260924-001 „0 €“, referenčný klient zaplatil 99 €.

## 4. Neisté / nenájdené
- UNVERIFIED živosť: `billing-store.ts:150-290` (poškodené kódovanie), `components/billing/pricing-cards.tsx:130`, `UnifiedDemo.tsx`, `(marketing)/landing/**`, cron `credits-grant` (deprecated, nie vo `vercel.json`), `scripts/reconcile-billing.ts`.
- Nenájdené: samostatný marketingový webhook, handler `invoice.paid` pre kredity, Stripe kľúč/trasa pre „199 € / kancelária“.
- Neoverené mimo repa: stav Stripe (test aj live), produkčné env, verejný web revolis.ai (overovať až pri W4).

## 5. Dôsledok pre plán
- Kritická cesta W0 → W1 → W2A → W3 → W4 ostáva. Pre W1 treba pred prácou rozhodnúť **základ DPH** (s DPH podľa správy z 5. 10., bez DPH podľa exekučného plánu) a či balíky kopírujú veľkosti AIRAmax (50…300) alebo vlastné (60…300).
- Vetva A nesie najviac: nový grant na kanceláriu, plnenie mesačných balíkov z `invoice.paid`, zmena pásma, test duplicitného webhooku. Vetva C musí zjednotiť marketing checkout s CRM kontraktom (metadata), inak sa predaj z webu nenaplní.
- Všetky ceny z kódu a webu treba zosúladiť až po W3; do vtedy ostáva v2 za vypnutým prepínačom.
