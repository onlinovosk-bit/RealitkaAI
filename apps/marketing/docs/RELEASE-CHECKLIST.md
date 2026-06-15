# Landing v2 — release checklist

**Vetva:** `feat/landing-v2-release` · **Tier:** 3 (`tier-3-andy`) · **Deploy:** Andy manuálne po review

## Pred merge

- [ ] `npm run build` v `apps/marketing` — zelený
- [ ] Cenník na `/` zobrazuje rovnaké sumy ako `apps/crm/src/lib/program-tier-pricing.ts` (Solo 79 / Team 71 / Office 63 €)
- [ ] Žiadny fake social proof (340+ kancelárií, vymyslené štatistiky, Smolko mená)
- [ ] Case study: anonymná RK z Prešova (nie konkrétna značka)
- [ ] Primárny CTA: Calendly demo (`calendly.com/revoliscrm/30min`)
- [ ] Checkout CTA sa zobrazí **iba** ak sú nastavené `STRIPE_PRICE_*_SEAT` env v marketing projekte
- [ ] `vercel.json` nebol menený v tomto PR
- [ ] CI zelené na PR

## Po merge (Andy)

- [ ] Vercel Preview `revolis-marketing` — smoke `/` (hero, kalkulačka, cenník, FAQ)
- [ ] Porovnať vizuál s `public/revolis-demo-v3.html` (DNA: tmavý violet, mockup, kroky)
- [ ] Overiť OG/meta v produkcii (title + description)
- [ ] Ak sa menia verejné ceny v CRM — najprv merge CRM pricing PR, potom re-deploy marketing

## Rollback

- Revert PR alebo dočasne nasmerovať root traffic na `/demo.html` (statický v3) cez Vercel routing — **iba** ak je schválené Andy.

## Súvisiace súbory

| Súbor | Úloha |
|-------|--------|
| `app/page.tsx` | Landing v2 entry |
| `app/landing-v2.css` | Demo v3 styling |
| `components/landing/*` | Sekcie + interaktívne časti |
| `lib/pricing.ts` | Re-export z CRM pricing |
| `apps/crm/src/lib/program-tier-pricing.ts` | Jediný zdroj cien |
