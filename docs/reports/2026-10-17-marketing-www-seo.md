# www.revolis.ai SEO — canonical, robots, sitemap

**Dátum:** 2026-10-17  
**Vetva:** `cursor/marketing-www-seo-1aac`  
**Stav:** IMPLEMENTED / TESTED (lokálne). Nie PRODUCTION. Merge/deploy zakázané týmto zadaním.  
**RAU route:** GO_REQUIRED BUILD revolis (router zachytil slovo „merge“; zadanie výslovne zakazuje merge — bránu som neznižoval, merge nerobím)

## OBJECTIVE

Search Console: Google berie apex `revolis.ai` ako kanonický (307), na www chýbajú `canonical` / `og:url`, `robots.txt` a `sitemap.xml` vracajú 404.

## WHAT CHANGED

Len `apps/marketing` + tento report + SESSION blok. CRM / `app.revolis.ai` / auth / billing nedotknuté.

| Súbor | Zmena |
|---|---|
| `apps/marketing/lib/site.ts` | `https://www.revolis.ai`, sitemap paths, robots disallow |
| `apps/marketing/app/layout.tsx` | `metadataBase` + `alternates.canonical` + `openGraph.url` |
| `apps/marketing/app/demo/page.tsx` | `openGraph.url` (`canonical` už bolo) |
| `apps/marketing/app/balik/layout.tsx` | metadata pre client page |
| `apps/marketing/app/robots.ts` | allow `/`, disallow `/api/` `/app/` `/private/` `/zakulisie/` |
| `apps/marketing/app/sitemap.ts` | `/`, `/demo`, `/balik` na www |
| `apps/marketing/__tests__/seo.test.ts` | unit testy origin / robots / sitemap |

## Apex → www redirect — NIE JE V REPE

Živý dôkaz 2026-10-17 (tento turn):

```
curl -sI https://revolis.ai/  →  HTTP/2 307
location: https://www.revolis.ai/
server: Vercel
```

Rovnaký 307 na `/demo`, `/robots.txt`, `/sitemap.xml`. Žiadny `x-matched-path` (to by bolo Next.js).

V repe som hľadal `next.config` redirects, `middleware.ts`, `vercel.json` redirects, `has: { type: host }`:

- `apps/marketing/next.config.ts` — len `/demo/:path+`, `/landing` → `/zakulisie/l99` (`permanent: true` = 308)
- `apps/marketing/vercel.json` — build/ignore/git, **žiadny redirect**
- `middleware.ts` v repe **neexistuje**
- host-based redirect: 0 výskytov

Toto je **Vercel Domains** (projekt `revolis-marketing`), nie kód. Pridať 308 do `vercel.json` by 307 z dashboardu neprebilo — edge redirect ide skôr. Preto som redirect v kóde **nehádal**.

Archív to isté hovorí: `docs/archive/progress.md` — „Domény: revolis.ai → 307 → www.revolis.ai“.

## EVIDENCE (lokálny `next start` :3001, Next 15.5.15)

`/robots.txt` 200:

```
User-Agent: *
Allow: /
Disallow: /api/
Disallow: /app/
Disallow: /private/
Disallow: /zakulisie/
Host: https://www.revolis.ai
Sitemap: https://www.revolis.ai/sitemap.xml
```

`/sitemap.xml` 200 — len:

- `https://www.revolis.ai/`
- `https://www.revolis.ai/demo`
- `https://www.revolis.ai/balik`

HTML (predtým na PROD 0× canonical / og:url):

- `/` → `rel=canonical` + `og:url` = `https://www.revolis.ai`
- `/demo` → `https://www.revolis.ai/demo`
- `/balik` → `https://www.revolis.ai/balik`

Log: `/opt/cursor/artifacts/marketing-seo-local-smoke.log`

## TESTS

- `npm test --prefix apps/marketing` → **48 passed / 3 files** (vrátane `seo.test.ts`), pred `npm ci` v marketing lockfile (vitest z workspace).
- `npm run build` v `apps/marketing` s Next 15.5.15 → zelený; routy `/robots.txt` a `/sitemap.xml` sú `○` static.
- Živé PROD URL (len čítanie): `/` 200, `/demo` 200, `/balik` 200, `/zakulisie/l99` 200, `/landing` 308, `/demo.html` 200, `/privacy` 404.

Sitemap **nezahŕňa** `/zakulisie/*` (noindex), `/landing` (308), `/demo.html` a `/revolis-demo-v3.html` (statické duplikáty `/`). `/balik` je 200 na www, preto v sitemape je.

## Vercel dashboard — MUSÍ urobiť človek

1. Projekt **`revolis-marketing`** (nie `realitka-ai` / `app.revolis.ai`).
2. **Settings → Domains**.
3. Presmerovanie `revolis.ai` → `www.revolis.ai` zmeniť z temporary **307** na permanent **308** (alebo 301).
4. Po nasadení tohto PR overiť: `curl -sI https://revolis.ai/` → 308/301 + `location: https://www.revolis.ai/`.
5. Search Console: nastaviť www ako preferred (ak ešte nie) a poslať `https://www.revolis.ai/sitemap.xml`.

**Preview deploy tohto PR pravdepodobne NEpríde.** `apps/marketing/vercel.json` má `git.deploymentEnabled["cursor/*"] = false` (šetrenie Hobby kvóty). Toto som nemenil.

## KONTROLÓR

| Kontrola | Verdikt |
|---|---|
| Apex 308 v kóde | NIE — nie je kde; dashboard |
| `app.revolis.ai` | nedotknuté |
| Fikcia URL v sitemape | nie — len 200 stránky overené curlom |
| PRODUCTION | nie — kód na vetve |
| Preview | neočakávať (cursor/* off) |

## NEXT ACTION

Draft PR. Merge len na výslovné GO. Po merge: Vercel Domains 307→308, potom GSC.
