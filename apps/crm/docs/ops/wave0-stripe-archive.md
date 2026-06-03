# Wave 0 — Stripe dashboard (manuálne)

Tieto produkty **archivujte v Stripe Dashboard** (Products → Archive). Kód ich už neponúka v self-serve predaji; **price ID v env a `resolvePlanKeyFromStripePriceId` ponechajte** kvôli existujúcim predplatným.

| Produkt | Orientačná cena | Env (voliteľné mapovanie legacy) |
|---------|-----------------|--------------------------------|
| Leads Engine | 79 €/mes | `STRIPE_PRICE_ADDON_LEADS_ENGINE` |
| Market Intelligence | 99 €/mes | `STRIPE_PRICE_ADDON_MARKET_INTELLIGENCE` |
| Protocol AI (add-on) | 149 €/mes | `STRIPE_PRICE_ADDON_PROTOCOL_AI` |
| Active Force Calls | 59 €/mes | `STRIPE_PRICE_ADDON_ACTIVE_FORCE_CALLS` |

**Nemeníte:** `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_MARKET_VISION`, `STRIPE_PRICE_PROTOCOL_AUTH`, `STRIPE_PRICE_ENTERPRISE`.

Po archivácii: nový checkout na tieto SKU nie je možný; existujúce subscription zostávajú mapované cez legacy env kľúče.
