# Kontrolor — SEO audit 16. 11. 2026 (draft PR)

**Rola:** adversariálna vrstva, nie autor diffu.
**Rozsah:** interné odkazy, meta, JSON-LD, blog intro, dva `published: false` články v `apps/marketing`.
**Verdikt:** PASS na draft PR. Merge/LIVE = STOP (žiadne founder GO).

## 10 bodov

1. **FAKT / PREDPOKLAD / NEZNÁME** — Homepage copy „denné priority“ je FAKT ako AI triáž (`lead-triage-batch.ts`), PREDPOKLAD ak by sa čítalo ako doručený ranný e-mail. Autor to mapoval na triáž, morning-brief do copy nedal. PASS.
2. **DÔKAZ** — vitest 89/89, tsc 0, next build --webpack, draft URL 404, screenshoty v `/opt/cursor/artifacts`. CI na heade v čase review ešte nebeží → FLAG do zeleného CI, nie blok draftu.
3. **NEPODLOŽENÝ PREDPOKLAD** — logo URL `app.revolis.ai/icons/revolis-512.png` existuje v repe (`apps/crm/public/icons/revolis-512.png`). Živé doručenie ikony som v tomto turne nestrieľal HTTP HEAD — FLAG nízky (súbor v repe + verejná CRM cesta).
4. **ZÁMENA POJMOV** — `published: false` ≠ 404 istota. Overené: `getPublishedArticle` undefined + `dynamicParams=false` → 404. Screenshoty draftov sú HTML z markdownu, nie flip `published`. PASS.
5. **BIZNIS BRÁNA** — Founder GO na draft SEO. RAU `GO_REQUIRED` na slovo `published` — články ostali draft. Ceny/cenník v novej copy nie. PASS.
6. **FIKCIA DÁT** — JSON-LD bez Offer/AggregateRating (test). Žiadne štatistiky v nových textoch. PASS.
7. **SCOPE** — 1 PR, marketing SEO. `tsconfig.json` je vedľajší Next 16 build. Demo/balik CSS reset je nutný kvôli `globals.css nav`. PASS.
8. **VERIFIKÁCIA** — marketing vitest + tsc + build spustené. CRM verification `marketing-blog` 1/1. Playwright je lokálny dôkaz, nie CI smoke. FLAG: CI ešte nie je na heade.
9. **STOP-AND-ASK** — starý článok `crm-pre-realitnych-maklerov` sa nemaže; kanibalizácia je v reporte ako rozhodnutie foundera. PASS.
10. **ARTEFAKT** — vetva + report v repe. PR URL sa dopĺňa po otvorení. PASS pre stenu „draft PR“.
11. **ENGINEERING CONSTITUTION** — nový súbor `lib/json-ld.ts`. Justification v pláne + `memory/decisions.md`: reuse blog katalógu; new-code pre schému (nie inline, aby sa dal testovať zákaz Offer). Contradiction: none. PASS.

## FLAG (nie STOP)

- CI na commite po push — merge ostáva zakázaný aj po zelenom CI.
- Homepage `index.html` stále obsahuje existujúce ceny 0 € / 49 € (mimo rozsahu; founder ich nemenil). Nová copy a JSON-LD ceny nepridávajú.
- `/balik` ostáva s 47 € — odkaz na blog pridaný, cenník balíka neriešim.

## STOP

Merge, LIVE, zmena `vercel.json`, 307→308, Ahrefs, `published: true`.
