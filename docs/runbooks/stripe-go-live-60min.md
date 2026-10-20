# Stripe naživo za 60 minút — kroky pre foundera

Stav k 2026-10-18. Čo je overené: kód v2 zapojený (116/116 testov), Vercel Production má `PRICING_V2_ENABLED=true` (screenshot foundera) a osem `STRIPE_PRICE_V2_*`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (len prítomnosť). PROD: 7 agentúr, 0 Stripe subscription.
Čo NIE je overené: či ceny v LIVE Stripe existujú a sedia, či webhook endpoint má správne udalosti, Stripe Tax, reálny nákup.

## Kritická cesta

| # | Čas | Kto | Čo | Odkaz |
|---|-----|-----|----|-------|
| 1 | 0–10 min | Founder | Vytvor obmedzený read-only kľúč (Prices: Read, Products: Read) | https://dashboard.stripe.com/apikeys |
| 2 | 10–15 | Founder | PowerShell: nastav kľúč len v session, spusti `python scripts\ops\stripe_verify_prices.py`, vlož výstup do chatu. Postup: `docs/runbooks/stripe-verify-windows.md` | — |
| 3 | 15–20 | Founder | Webhooky: endpoint `https://app.revolis.ai/api/billing/webhook`, 7 udalostí (nižšie). Pošli screenshot zoznamu udalostí | https://dashboard.stripe.com/webhooks |
| 4 | 15–25 | Claude | Po výstupe z kroku 2: vyhodnotenie 8 plánových cien vs. katalóg, oprava `docs/STATUS.md`, zoznam chýbajúcich cien | — |
| 5 | 25–35 | Founder | Ak niečo chýba: vytvor cenu podľa `scripts/ops/stripe-v2/revolis-stripe-v2-catalog.json` (suma bez DPH, `tax_behavior=exclusive`), nové `price_…` ID vlož do Vercelu | https://dashboard.stripe.com/products , https://vercel.com/onlinovosk-4317s-projects/realitka-ai/settings/environment-variables |
| 6 | 20–30 | Founder | Stripe Tax: registrácia SK a `tax_code` produktov (s účtovníčkou). Bez toho ostáva `PRICING_V2_STRIPE_TAX` vypnuté | https://dashboard.stripe.com/settings/tax |
| 7 | 35–50 | Founder | Skutočný nákup najlacnejšieho plánu (Start, 25 €) na https://app.revolis.ai v testovacej agentúre | — |
| 8 | 50–55 | Claude | Over v PROD (SELECT): `agencies.stripe_subscription_id`, `subscription_status`, kredity; over Vercel logy webhooku | — |
| 9 | 55–60 | Founder | V Stripe zruš test subscription a vráť platbu | https://dashboard.stripe.com/subscriptions |

Webhook udalosti: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.

## Čo musí byť zmergované pred krokom 7
Merge robí founder, iba na zelené CI:
1. #879 (opravy testov) → potom #845 (webhook číta live stav subscription): https://github.com/onlinovosk-bit/RealitkaAI/pull/879 , https://github.com/onlinovosk-bit/RealitkaAI/pull/845
2. #880 (route gates, semantic search; obsahuje opravu `starter-pack/download`): https://github.com/onlinovosk-bit/RealitkaAI/pull/880

Bez #845 môže oneskorený `customer.subscription.updated` prepísať živý stav subscription starým (popis PR).

## Riziká
- Chýbajúca cena v2 → checkout vráti 503 „chýbajú Stripe ceny" (bezpečné zlyhanie, nepredá sa).
- Krok 7 je reálna platba. Neoverené: či checkout povoľuje promo kódy, preto počítaj s reálnou kartou a refundom.
- Neoverené: do ktorého účtu Stripe (live/test) smerujú Preview nasadenia. Test mode na preview nespúšťaj, kým sa to neoverí.
- `STARTER_PACK_DOWNLOAD_SECRET` alebo `STRIPE_WEBHOOK_SECRET` musí byť vo Verceli (po #880 inak link na starter pack vráti 403).
