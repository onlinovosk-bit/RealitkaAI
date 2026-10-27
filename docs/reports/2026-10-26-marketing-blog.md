# Verejný blog na www.revolis.ai — prvý článok

**Dátum:** 2026-10-26  
**Vetva:** `cursor/marketing-blog-first-article-980f`  
**GO:** Andrej Ondruš, 26. 10. 2026 — kód + draft PR. Merge/deploy nie.  
**RAU route:** `GO_REQUIRED` BUILD revolis (trigger `publish` → P17/P18 nespustené)

## OBJECTIVE
Pridať `/blog` a `/blog/[slug]` na marketingový web a publikovať prvý článok v kóde.

## WHAT CHANGED
- `apps/marketing/lib/blog.ts` — TypeScript katalóg; slug `ceny-nehnutelnosti-2026-sadzby-nove-ltv`, dátum `2026-10-19`, autor Andrej Ondruš.
- `apps/marketing/lib/markdown.tsx` — renderer h1–h3, odseky, zoznamy, tučné, odkazy, italic, hr (bez MDX).
- `apps/marketing/app/blog/` — listing, článok, layout, CSS (navy + gold; reset globálneho `nav`).
- `apps/marketing/components/blog/BlogChrome.tsx` — hlavička/pätička.
- `apps/marketing/lib/site.ts` — `PUBLIC_SITEMAP_PATHS` = statické + publikované blog cesty.
- `apps/marketing/__tests__/seo.test.ts` — `/blog` a článok.
- `apps/marketing/__tests__/blog.test.tsx` + CRM `marketing-blog.verification.test.ts`.
- Footer odkaz Blog na App Router landingu. CRM `/blog` ostáva redirect na `/landing`.

## EVIDENCE (tento turn)
Lokálny `npx next start --port 3001` po `npx next build --webpack`:

| URL | HTTP |
|---|---|
| `/blog` | 200 |
| `/blog/ceny-nehnutelnosti-2026-sadzby-nove-ltv` | 200 |
| `/blog/neexistuje` | 404 |
| `/sitemap.xml` | 200; obsahuje `https://www.revolis.ai/blog` a článok |

HTML článku obsahuje H1/H2/H3, `<ul>`, `<strong>3 041 €/m²</strong>`, CTA `https://app.revolis.ai/register`, „14 dní zadarmo, bez platobnej karty“, poznámku Zdroje. Slovo `pilot` nie je.

## TESTS
- `npx vitest run __tests__/blog.test.tsx __tests__/seo.test.ts` → **10 PASS**
- `npx vitest run tests/verification/marketing-blog.verification.test.ts tests/verification/public-site-no-lemon.verification.test.ts` (apps/crm) → **2 PASS**
- `npx next build --webpack` (apps/marketing) → zelený; routy `○ /blog`, `● /blog/[slug]` → článok
- Celý marketing vitest: 70 PASS, 1 predexistujúci FAIL v `palette.test.ts` (očakáva `realitka-ai.vercel.app/register` v `public/index.html`, tento PR to nemení)

## EVAL
P11 nezávislý review: **PASS** na 4 akceptačné body. Residual: CRM `BlogPromoTicker` stále linkuje `/blog` na app hoste (redirect na `/landing`).

## RISKS
- `apps/marketing/vercel.json` má `git.deploymentEnabled["cursor/*"] = false` — Vercel Preview tohto PR pravdepodobne nepríde. Nemenil som to.
- PRODUCTION: nezmenené.

## SECURITY
Žiadne tajomstvá, env ani PROD zápis.

## CI / DEPLOY / PRODUCTION
CI na pushnutom heade: NEMERANÉ v čase zápisu. Deploy: nie. PRODUCTION: bez zmeny.

## OBSERVABILITY / RECOVERY
Rollback = revert PR. Žiadna migrácia.

## NEXT ACTION
Founder review draft PR. Merge a nasadenie `revolis-marketing` len na samostatné GO.

## Lokálny preview
```bash
cd apps/marketing
npx next build --webpack
npx next start --port 3001
# http://127.0.0.1:3001/blog
# http://127.0.0.1:3001/blog/ceny-nehnutelnosti-2026-sadzby-nove-ltv
```
Alebo `npm run dev --prefix apps/marketing` (port 3001).
