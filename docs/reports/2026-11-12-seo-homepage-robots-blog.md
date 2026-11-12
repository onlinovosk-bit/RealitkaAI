# Dôkaz: SEO homepage + robots.txt + draft blog CRM

**Vetva:** `cursor/seo-homepage-robots-blog-1a71`  
**Dátum:** 2026-11-12  
**Merge / deploy / Vercel / PROD / secrets:** nerobené.

## Čo sa zmenilo

1. **www.revolis.ai** — živý `/` je `apps/marketing/public/index.html` (rewrite). Title, meta description a OG sú nové SK znenie; z title/meta/hero zmizlo „do 23. 10.“. `data-after` je zhodné, aby JS po deadlinu text nevrátil. `app/layout.tsx` metadata zosúladená.
2. **app.revolis.ai** (`apps/crm`) — `/privacy` aj `/privacy-policy` majú title `Ochrana osobných údajov | Revolis.ai`. Nový App Router `app/robots.ts`.
3. **Blog** — draft `published: false`, slug `crm-pre-realitnych-maklerov`. Nie je v `PUBLIC_SITEMAP_PATHS`.

## Testy (spustené)

| Kontrola | Výsledok |
|---|---|
| `npx vitest run` v `apps/marketing` | PASS 75/75 |
| `npx tsc --noEmit -p tsconfig.json` v `apps/marketing` | PASS exit 0 |
| `npx vitest run src/app/robots.test.ts tests/verification/app-robots-privacy-seo.verification.test.ts tests/verification/marketing-blog.verification.test.ts` v `apps/crm` | PASS 4/4 |
| `npx eslint` na zmenených CRM súboroch | PASS exit 0 |
| `npm run typecheck` v `apps/crm` | PASS (baseline; 53 vs 54, `--write-baseline` nespustený) |

## robots.txt (app.revolis.ai)

Allow: `/privacy`, `/privacy-policy`, `/terms`, `/cookie-policy`, `/cookies`, `/legal`, `/legal/`, `/security`, `/trust-center`, `/sla`, `/support`, `/aup`, `/dpa-request`.

Disallow: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/`, `/onboarding`, `/dashboard`, `/admin`, `/api/`, `/settings`, `/leads`, `/contacts`, `/properties`, `/billing`, `/import`, `/integrations`, `/team`, `/invite`, `/inzerat-generator`, `/pipeline`, `/matching`, `/outreach`, `/activities`, `/tasks`, `/sales`, `/forecast`, `/communication`, `/upgrade`, `/management`, `/acquisition`, `/akvizieia`.

## Overené tvrdenia o featurách (článok)

| Tvrdenie | Kde |
|---|---|
| Portálové e-maily sa uložia ako dopyt; portály Nehnuteľnosti.sk, TopReality, Reality.sk, Bazoš, Byty.sk | `apps/crm/src/lib/acquire/email-adapter.ts` (`SOURCE_RULES`), `apps/crm/src/app/api/acquire/email/route.ts` |
| AI text inzerátu z parametrov nehnuteľnosti (portál, FB, IG, e-mail), úprava pred použitím | `apps/crm/src/lib/ai/listing-content.ts`, `apps/crm/src/app/(dashboard)/inzerat-generator/page.tsx` |
| Evidencia kontaktov / klientov | `apps/crm/src/app/(dashboard)/contacts/page.tsx` |
| Evidencia nehnuteľností | `apps/crm/src/app/(dashboard)/properties/page.tsx` |
| Import CSV príležitostí | `apps/crm/src/app/(dashboard)/import/page.tsx`, `apps/crm/src/app/api/import/route.ts` |
| Import CSV/XLSX + zdroj RealSoft v sprievodcovi | `apps/crm/src/lib/universal-import/types.ts` (`SUPPORTED_IMPORT_SOURCES`), `apps/crm/src/components/universal-import/universal-import-wizard.tsx`, `apps/crm/src/app/(dashboard)/import/universal/page.tsx` |

Neoverené / nespomínané: text z fotiek (flag), auto-odoslanie na portál, cenník, štatistiky trhu.

## Draft

Blog systém má `published`. Článok je `published: false` (404 na `/blog/[slug]` kým sa nepublikuje; sitemap bez neho). PR ostáva draft.
