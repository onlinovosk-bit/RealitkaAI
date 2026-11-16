# Plán: SEO audit 16. 11. 2026 — interné odkazy, meta, JSON-LD, blog

## Rozsah
Jeden draft PR v `apps/marketing` (nikdy merge, deploy, Vercel settings, `vercel.json`, secrets, PROD). Päť zmien z SEO auditu živého webu 16. 11. 2026:
1. Interné odkazy: `/` (header alebo päta, kotva „Blog pre maklérov“), `/demo` (kotva „prehľad trhu pre maklérov“), `/balik` (kotva „ďalšie tipy pre maklérov“), článok `ceny-nehnutelnosti-2026-sadzby-nove-ltv` → `/demo` (kotva „pozrite si ukážku Revolis“).
2. Meta description homepage + zladenie `og:description` (živý `/` je `public/index.html` cez rewrite; zosúladiť aj `app/layout.tsx`).
3. JSON-LD: Organization + WebSite na `/`; BreadcrumbList na stránkach článkov; CollectionPage na `/blog`. Žiadne Offer/offers, žiadne AggregateRating.
4. Úvod `/blog` 100–150 slov SK.
5. Dva draft články v `lib/blog.ts` (`published: false`): `crm-pre-realitnych-maklerov-ako-vybrat` a `ai-inzerat-nehnutelnosti`. Nesmú byť v sitemape. Starý draft `crm-pre-realitnych-maklerov` sa nemaže.

## Znovupoužitie
- Homepage: `apps/marketing/public/index.html` (živý `/`), `.hlink`, päta; metadata vzor `app/layout.tsx`.
- Demo/balík: existujúci header (`demo-nav`, `balik-nav`) a `Link`.
- Blog: `lib/blog.ts` (`published`, `getPublishedBlogPaths`), `app/blog/page.tsx`, `app/blog/[slug]/page.tsx` (už má Article JSON-LD), `lib/markdown.tsx`, `seo.test.ts` / `blog.test.tsx`.
- Logo: `apps/crm/public/icons/revolis-512.png` (verejné na app.revolis.ai).
- Žiadna nová npm závislosť, žiadny MDX, `vercel.json` bez zmeny.

Engineering justification: Trigger — verejný SEO obsah. Path — reuse existujúceho blog katalógu a statickej homepage + new-code `lib/json-ld.ts` (jeden zdroj schémy, testovateľný). Alternatives: JSON-LD natvrdo v každej stránke (zamietnuté — duplicita a riziko Offer). Contradiction: none.

## Akceptačné kritériá
- `public/index.html` obsahuje `<a … href="/blog">Blog pre maklérov</a>` v hlavičke alebo päte; `/demo` obsahuje kotvu „prehľad trhu pre maklérov“; `/balik` kotvu „ďalšie tipy pre maklérov“; telo prvého článku obsahuje `[pozrite si ukážku Revolis](/demo)`.
- Homepage meta description (a `og:description`, `data-after-content`) je zadaný SK text, upravený len ak tvrdenie nesedí s kódom; `npx vitest run` v `apps/marketing` overí znenie.
- JSON-LD na `/` má `@type` Organization a WebSite; článok má BreadcrumbList Domov › Blog › článok; `/blog` má CollectionPage; žiadny parsed JSON-LD nemá kľúč `offers`/`offer` ani `AggregateRating`.
- Úvod `/blog` má 100–150 slov (split `\s+`).
- `getPublishedArticle` pre oba nové slugy je `undefined`; `PUBLIC_SITEMAP_PATHS` ich neobsahuje; `published: false`; 700–1200 slov; bez `pilot`, bez cenníka.
- `npx vitest run` a `npx tsc --noEmit` v `apps/marketing` exit 0.

## Riziká
- Živý `/` je rewrite na `index.html` — zmena len v `app/layout.tsx` by Google nevidel.
- Starý draft `crm-pre-realitnych-maklerov` cieľuje to isté kľúčové slovo; nový článok musí mať iný uhol a užšie `keyword`.
- „Denné priority“ mapovať na AI triáž (`lead-triage-batch.ts`, priorita práce na dnes), nie na nedoručený ranný e-mail.
- Drafty 404 na `/blog/[slug]` (`dynamicParams = false`); náhľad len v screenshot skripte, nie v produkčnom kóde.

## Brány
- Founder GO na tento draft PR: Cloud Agent zadanie 16. 11. 2026 (explicitne draft, never merge/deploy, nemeň `vercel.json`).
- RAU router vrátil `GO_REQUIRED` na kľúčové slovo `published`; články ostávajú `published: false`. P17/P18 sa nespúšťajú.
- Merge, LIVE deploy, Vercel Domains (307→308), Ahrefs Webmaster Tools: FOUNDER GO, mimo tohto PR.

## Kroky
1. `lib/json-ld.ts` + JSON-LD do `index.html`, `/blog`, `[slug]`.
2. Interné odkazy v `index.html`, `app/demo/page.tsx`, `app/balik/page.tsx`, prvý článok.
3. Meta description homepage + `layout.tsx`.
4. Úvod `/blog`; dva drafty; testy sitemap/JSON-LD/odkazy.
5. Vitest + tsc; lokálny build; Playwright screenshoty do `/opt/cursor/artifacts`; report; memory PREPEND; draft PR.

## Mimo rozsahu
- Merge, deploy, zmena `vercel.json` / Vercel Production Overrides, 307→308, Ahrefs, publikovanie (`published: true`), mazanie starého draftu, ceny/Offer v schéme, nové závislosti.
