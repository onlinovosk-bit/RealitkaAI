# Auth pages: brand gradient + vykanie + real features

Dátum: 2026-10-15  
Vetva: `cursor/auth-pages-brand-vykanie-96e9`  
Stav: IMPLEMENTED (TESTED v tomto PR; bez merge/deploy)

## OBJECTIVE

Nahradiť na auth stránkach (`/login`, `/register`, `/forgot-password`, `/reset-password`) teal paletu tokenmi Slate Horizon (tmavomodrá → svetlá modrá z produkcie) a fiktívny Workdesk Preview (Ocean Trust, 128/17, vymyslené AI pulse) skutočnými funkciami. Formálne vykanie.

## WHAT CHANGED

- Login preview: reálne funkcie, žiadne vymyslené KPI.
- Farby: `SLATE_HORIZON.topbarGradient` (rovnaký ako `WorkdeskTopbar` a marketing `--brand-grad`).
- Copy: vykanie (`Prihláste sa`, `Nemáte účet?`, `Už máte účet?`, …).
- Listing Reel **nie je** v paneli — v kóde CRM/marketing neexistuje.

## FEATURES USED (source)

| Claim na logine | Zdroj v kóde | Marketing |
|---|---|---|
| Generátor inzerátu — texty na portál, FB, IG, e-mail | `apps/crm/src/app/(dashboard)/inzerat-generator/page.tsx`, `src/lib/ai/listing-content.ts` | ProductMock „Návrh inzerátu“ (`apps/marketing/components/landing/LandingInteractive.tsx`) |
| Horúce dopyty — triage | `apps/crm/src/lib/ai/lead-triage-batch.ts`, `src/lib/acquire/inbound-lead-triage.ts` | GOALS „Viac horúcich záujemcov“ |
| Návrh odpovede na dopyt na schválenie | `apps/crm/src/lib/inbound/process-lead.ts` (draft, not auto-send from this path), `src/lib/inbound/auto-reply.ts` | „Pripravené odpovede na nové dopyty“ |
| Ranný brief | `apps/crm/src/lib/morning-brief/assemble.ts`, `src/app/api/cron/morning-brief/route.ts` | „Ranný report odoslaný majiteľovi“ |
| Analyzátor hovorov (call coach) | `apps/crm/src/app/(dashboard)/call-analyzer/page.tsx`, `src/lib/ai/call-coach.ts` | — |
| Orientačný odhad ceny | `apps/crm/src/app/(marketing)/odhad/[agencySlug]/page.tsx` | UnifiedDemo „AI Odhadca“ |

## COLORS (existujúce tokeny, žiadny nový hex)

Z `apps/crm/src/lib/slate-horizon-theme.ts`:

- `topbarGradient`: `linear-gradient(90deg, #143A6B 0%, #1B4F8A 55%, #0C2348 100%)` — header + CTA
- `brand` `#1B4F8A`, `brandDeep` `#143A6B`, `brand2` `#3D6BA5`, `brandNavy` `#0C2348`
- `bg` `#F8FAFC`, `soft` `#E8EEF6`, `softBorder` `#B7C7DC`, `ink` `#0F172A`
- `noticeGradient` pre preview panel
- zhodné s marketing `apps/marketing/app/landing-v2.css` `--brand-grad`

## CHANGED FILES

- `apps/crm/src/lib/auth-page-theme.ts` (nový)
- `apps/crm/src/lib/auth-preview-features.ts` (nový)
- `apps/crm/src/components/auth/AuthFeaturePreview.tsx` (nový)
- `apps/crm/src/app/login/page.tsx`
- `apps/crm/src/app/(public)/register/page.tsx`
- `apps/crm/src/app/forgot-password/page.tsx`
- `apps/crm/src/app/reset-password/page.tsx`
- `apps/crm/src/components/marketing/BlogPromoTicker.tsx` (`tone="workdesk"` len na logine)
- `apps/crm/tests/verification/auth-pages-brand-copy.verification.test.ts` (nový)
- `docs/reports/2026-10-15-auth-pages-brand-vykanie.md` (tento súbor)

## RISKS

- Layout ostáva; zmena je vizuál + copy. Žiadna zmena auth logiky.
- Blog ticker na landingu ostáva teal (mimo scope).
- Auto-reply je formulovaný ako návrh na schválenie (default path je draft).
