# Plán: SEO homepage + robots.txt + blog CRM

## Rozsah
Jeden draft PR (nikdy merge, deploy, Vercel/prod, secrets). Tri zmeny, všetok používateľský text po slovensky:
1. Homepage www.revolis.ai (`apps/marketing/public/index.html` je živý `/` cez rewrite; zosúladiť aj `app/layout.tsx`): title, meta description, OG; odstrániť „do 23. 10.“ z title/meta/hero; žiadna nová promo copy.
2. App app.revolis.ai (`apps/crm`): title/description stránky ochrany údajov; `app/robots.ts` — disallow login/auth/dashboard a autentifikované cesty, allow verejné právne stránky.
3. Nový článok `/blog/crm-pre-realitnych-maklerov` v `apps/marketing/lib/blog.ts` (draft `published: false`, lebo flag existuje). Sitemap ostáva len pre publikované (`PUBLIC_SITEMAP_PATHS` / `seo.test.ts`).

## Znovupoužitie
- Marketing SEO: existujúci `public/index.html` + `data-after` (po termíne JS prepína texty) + `app/layout.tsx` metadata.
- Blog: `lib/blog.ts` `published`, `getPublishedBlogPaths()`, markdown renderer, `seo.test.ts`.
- CRM legal: `(public)/privacy` a `(public)/privacy-policy`; robots podľa vzoru `apps/marketing/app/robots.ts`.
- Žiadna nová závislosť, žiadny MDX, žiadny CRM blog (redirect na `/landing`).

Engineering justification: Trigger: verejný SEO text + robots. Path: reuse (blog katalóg, marketing robots, legal pages) + new-code (`apps/crm/src/app/robots.ts`). Alternatives: statický `public/robots.txt` (zamietnuté — App Router `robots.ts` je preferovaný). Contradiction: none.

## Akceptačné kritériá
- `apps/marketing/public/index.html` má title `Revolis.ai – AI CRM pre realitných maklérov | Inzerát hotový za minúty` a zadaný meta description; OG title/description zhodné; v title, meta a hero nie je `23. 10.`.
- `apps/marketing/app/layout.tsx` metadata title/description/openGraph zhodné.
- `apps/crm/src/app/(public)/privacy/page.tsx` a `privacy-policy/page.tsx` metadata title `Ochrana osobných údajov | Revolis.ai`, description `Zásady ochrany osobných údajov služby Revolis.ai pre realitných maklérov.`
- `apps/crm/src/app/robots.ts` existuje; allow právne cesty, disallow login/auth/dashboard a ďalšie autentifikované prefixy; cesty v PR tele.
- Článok slug `crm-pre-realitnych-maklerov`, `published: false`, nie je v `PUBLIC_SITEMAP_PATHS`; telo 700–1200 slov, bez `pilot`, bez cenníka, tvrdenia o featurách overené v kóde.
- `npx vitest run` v `apps/marketing` (vrátane `seo.test.ts`) exit 0; CRM lint/typecheck + testy robots/privacy exit 0.

## Riziká
- JS `expire()` po 23. 10. 2026 prepíše title/meta/hero z `data-after` — `data-after` musí byť totožné s novým znením, inak by sa deadline vrátil.
- Draft článok nie je v sitemap (zámer); 404 na `/blog/slug` kým `published: true`.
- Dva privacy URL (`/privacy`, `/privacy-policy`) — obe dostanú rovnaké SK metadata.
- Nepublikovať štatistiky trhu ani ceny v článku.

## Brány
- Founder GO na draft PR: toto Cloud Agent zadanie (explicitne „Open ONE DRAFT pull request“, „never merge/deploy“).
- RAU router vrátil `GO_REQUIRED` na kľúčové slová merge/deploy/prod/secrets/`ceny` v texte zákazu a v slugu existujúceho článku; tieto kroky sa nevykonajú.
- Merge, LIVE deploy, PROD, secrets, Vercel settings: mimo rozsahu, FOUNDER GO.

## Kroky
1. Upraviť `public/index.html` title/meta/OG a hero (pill, offer) bez deadline znenia.
2. Upraviť `app/layout.tsx` metadata.
3. Pridať CRM `lib/app-robots.ts` + `app/robots.ts` + test; upraviť privacy metadata.
4. Pridať draft článok do `lib/blog.ts`; testy draft + content rules; `seo.test.ts` ostáva na publikovaných URL.
5. Lint, typecheck, vitest (marketing + CRM robots/privacy); report; memory PREPEND; draft PR.

## Mimo rozsahu
- Merge, deploy, Vercel/prod settings, `.env`, zmena cenníka, publikovanie článku (`published: true`), P17/P18, úprava countdown JS mimo hero (ostáva pre ostatné sekcie stránky).
