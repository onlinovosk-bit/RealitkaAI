# Plán: verejný blog na www.revolis.ai

## Rozsah
Pridať `/blog` a `/blog/[slug]` do `apps/marketing` (Next.js App Router), publikovať prvý článok so slugom `ceny-nehnutelnosti-2026-sadzby-nove-ltv`, doplniť sitemap a `seo.test.ts`. Draft PR proti `main`. CRM blog (`apps/crm` `/blog` → `/landing`) ostáva nedotknutý.

## Znovupoužitie
- Dizajn: tokeny `public/palette.css`, chrome podľa `app/demo/page.tsx` + `landing-v2` (navy + gold).
- SEO: `lib/site.ts` `PUBLIC_SITEMAP_PATHS` + `app/sitemap.ts` + `__tests__/seo.test.ts`.
- Dáta: TypeScript modul (`lib/blog.ts`), nie MDX — v `apps/marketing/package.json` nie je markdown závislosť.
- Renderer: malý subset markdownu (h1–h3, odseky, zoznamy, tučné, odkazy, italic, hr) v `lib/markdown.tsx`.
- Neznovupoužiť `apps/crm/src/lib/blog-articles.ts` (iný host, redirect na `/landing`).

Engineering justification: Trigger: nová verejná plocha. Path: new-code (dáta + renderer) + reuse (sitemap, tokeny, chrome). Alternatives: MDX (zamietnuté — nová deps), CRM blog (zamietnuté — produktová app, redirect). Contradiction: none.

## Akceptačné kritériá
- `GET` App Router stránky `/blog` a `/blog/ceny-nehnutelnosti-2026-sadzby-nove-ltv` existujú v `apps/marketing/app/blog/`.
- Článok má title/description/slug/keyword/author `Andrej Ondruš`/date `2026-10-19`; telo z `clanok-1.md` vrátane zdroja a CTA `https://app.revolis.ai/register`.
- `PUBLIC_SITEMAP_PATHS` a `sitemap()` obsahujú `/blog` a `/blog/ceny-nehnutelnosti-2026-sadzby-nove-ltv`.
- `apps/marketing/__tests__/seo.test.ts` assertuje tieto dve cesty; `npx vitest run` v `apps/marketing` exit 0.
- Nové testy v `apps/marketing/__tests__/blog.test.tsx` overia nadpisy, zoznamy, odkaz, tučné, absenciu slova `pilot`.
- `npx next build` v `apps/marketing` exit 0 (routy `/blog` v zozname).
- Draft PR proti `main` (status draft); žiadny merge.

## Riziká
- `cursor/*` má v `apps/marketing/vercel.json` vypnutý preview deploy — nemeniť; lokálny preview.
- CRM `/blog` ostáva redirect; zámerne iný host.
- Nesmie pribudnúť cenník ani slovo `pilot`.
- Diakritika SK musí ostať v TS stringu (UTF-8).

## Brány
- Founder GO na kód + draft PR: dané 26. 10. 2026 (Andrej Ondruš).
- Merge, LIVE deploy, PROD, secrets: mimo rozsahu, vyžaduje samostatné FOUNDER GO.
- RAU: `GO_REQUIRED` / `publish` — P17/P18 nespúšťať.

## Kroky
1. `lib/blog.ts` + `lib/markdown.tsx` + testy rendereru.
2. `app/blog/layout.tsx`, `page.tsx`, `[slug]/page.tsx`, `blog.css`, `components/blog/BlogChrome.tsx`.
3. Sitemap: `lib/site.ts` zloží statické + blog cesty; upraviť `seo.test.ts`.
4. Footer link Blog na `LandingPage` (interný odkaz, bez zmeny kampane `public/index.html`).
5. Spustiť marketing vitest + next build; report; memory PREPEND; draft PR.

## Mimo rozsahu
- Merge, deploy, Vercel settings, `.env`, CRM blog, onlinovo.sk, cenník, MDX závislosť.
- Zmena `public/index.html` kampane.
- P17/P18 produkčná brána.
