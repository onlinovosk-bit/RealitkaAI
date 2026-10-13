# Web revolis.ai: cenník v2 predvolene (rozhodnutie foundera, 6. 10. 2026)

Founder: nový cenník sa ukáže na webe ešte **pred** nasadením cien do Stripe.

## Čo sa zmenilo (`apps/marketing`)
- **Cenník v2 je predvolený.** `PRICING_V2_ENABLED` nenastavené alebo prázdne = v2. Staré seat ceny (79/71/63 € za seat) sa vrátia len pri výslovnom `false` / `0` / `off` / `no`. Platí iba pre marketing; CRM má vlastný, stále vypnutý prepínač.
- **Primárne nákupné CTA vedú na 14-dňovú skúšku** (`{CRM}/register?pricing=v2&plan=<pásmo>`, hero/nav/sticky = Start). Calendly je len vedľajší odkaz „Dohodnite si ukážku“. Núdzový vypínač: `PRICING_V2_SIGNUP_ENABLED=false` / `0` / `off` / `no` — vtedy primárne CTA znova idú na demo. CRM `/register` pri vypnutom `SELF_SERVE_SIGNUP_ENABLED` ukáže zatvorenú stránku (nie fiktívny trial).
- **Len plány:** balíky kreditov a dokúpenie sa na webe neukazujú (`PRICING_V2_PLANS_ONLY`, predvolene zapnuté).
- Zobrazenie: cena bez DPH aj s 23 % DPH, kredity 25 / 60 / 120 / 175 na celú kanceláriu, Sieť od 349 €. (Aktualizácia 13. 10. 2026; nahrádza 20 / 50 / 100 / 150.)

## Čo je potrebné na zverejnenie
1. Merge PR s týmito zmenami (obsahuje aj granty 20/50/100/150).
2. **Nové nasadenie marketingovej aplikácie.** Stránky `/`, `/demo` a ďalšie sú statické: obsah sa určí pri builde. Podľa `apps/marketing/docs/DEMO-HTML-DEPLOY.md` ide o Vercel projekt `revolis-marketing`; v tejto relácii je viditeľný len projekt `realitka-ai` (CRM, `app.revolis.ai`), takže nasadenie `revolis.ai` som **neoveril**.
3. Ak je v marketingovom projekte nastavené `PRICING_V2_ENABLED=false`, odstrániť ho.

## Neoverené / mimo tejto zmeny
- Vzhľad v prehliadači a na mobile.
- „30 dní záruka vrátenia peňazí“ ostáva v texte cenníka (rozhodnutie B9 patrí founderovi).
- Statické `public/demo.html` neobsahuje ceny.
- CRM (`app.revolis.ai`) ukazuje, kým nie je zapnutý jeho prepínač, staré seat ceny.
