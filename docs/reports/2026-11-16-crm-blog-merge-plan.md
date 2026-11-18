# Plán: zlúčiť starý draft CRM článku do checklistu

## Rozsah
Jeden draft PR z aktuálneho `main` (`933e65b1`). V `apps/marketing/lib/blog.ts` zlúčiť použiteľné časti `crm-pre-realitnych-maklerov` do `crm-pre-realitnych-maklerov-ako-vybrat`, potom starý záznam odstrániť. Oba nové články ostávajú `published: false`. Zverejnenie, merge, LIVE, `vercel.json`, Vercel a CI workflow **mimo rozsahu**.

## Znovupoužitie
- Existujúci checklist (10 otázok, keyword `ako vybrať CRM…`) ostáva nosnou kostrou.
- Overené tvrdenia zo starého článku (portály, dve knihy, CSV/XLSX/RealSoft, generátor) sa vkladajú do odpovedí, nie ako druhý článok.
- Testy v `blog.test.tsx` / `seo.test.ts` sa upravia, žiadny nový súbor kódu.
- Presmerovanie `/blog/crm-pre-realitnych-maklerov` nie je potrebné: slug nikde inde neodkazuje a článok nikdy nebol `published`.

## Akceptačné kritériá
- `getArticle('crm-pre-realitnych-maklerov')` je `undefined`; konštanta `CRM_ARTICLE_SLUG` v `lib/blog.ts` neexistuje.
- `getArticle(CRM_CHECKLIST_ARTICLE_SLUG)` existuje, `published: false`, 700–1200 slov (`split(/\s+/)`), obsahuje `## Čo to znamená pre makléra` a CTA 14 dní zadarmo bez karty.
- Telo obsahuje presunuté fakty: Nehnuteľnosti.sk/TopReality/Reality.sk/Bazoš/Byty.sk, CSV aj .xlsx, RealSoft, zoznam klientov aj evidencia nehnuteľností.
- Telo neobsahuje `pilot`, `cenník`, `100 % peňazí`, refund.
- `PUBLIC_SITEMAP_PATHS` a `getPublishedBlogPaths()` neobsahujú ani starý, ani nový slug.
- `npx vitest run` a `npx tsc --noEmit` v `apps/marketing` exit 0.

## Riziká
- Duplicita s AI inzerát článkom pri generátore — v checkliste ostane len výberová otázka, nie postup písania.
- Historické reporty v `docs/reports/` spomínajú starý slug; nemažú sa (audit trail).
- Word count po zlúčení môže prekročiť 1200 — strih duplicít, nie faktov.

## Brány
- Founder GO 16. 11. 2026: zlúčiť starý draft do checklistu, draft PR, `published: false`. Zverejnenie NEMÁ GO.
- Merge, LIVE, `vercel.json`, Vercel, zmena CI: FOUNDER GO, mimo tohto PR.

## Kroky
1. Vetva `cursor/merge-crm-blog-drafts-611f` z `origin/main`.
2. Prepísať telo checklistu (plynulý text, 10 otázok + záver).
3. Odstrániť starý záznam a `CRM_ARTICLE_SLUG`.
4. Upraviť testy: starý slug chýba; checklist ostáva draft; sitemap bez oboch.
5. Vitest + tsc; report s plným znením a mapou presun/vynechanie; draft PR.

## Mimo rozsahu
Merge do `main`, LIVE, `published: true`, `vercel.json`, Vercel, CI workflow, presmerovanie, mazanie historických reportov.
