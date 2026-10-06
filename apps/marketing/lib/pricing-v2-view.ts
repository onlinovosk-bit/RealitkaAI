/**
 * Cenník v2 pre marketingový web — čistý pohľad (view model) nad katalógom z CRM.
 *
 * Bez runtime importu z ./pricing, aby sa CRM billing moduly nedostali do klientského bundlu (importuje ho
 * aj LeadCaptureModal). Server-side vstup s čítaním env je v `pricing-v2-server.ts`.
 *
 * Žiadna cena sa tu nepíše ručne: všetko ide z `buildPricingV2Catalog()` (čistá cena bez DPH aj
 * konečná cena s DPH). Modul nemá žiadne vedľajšie efekty; env sa číta len v `resolvePricingV2View`
 * a výsledok sa posiela komponentom ako prop (serializovateľný objekt).
 *
 * Predajné CTA vedie do registrácie v CRM, NIKDY priamo do Stripe: marketing nepozná `agencyId`,
 * bez neho CRM webhook nezaradí platbu ako v2 a grant by sa nepridelil (kontrakt W2, kritérium C).
 */
import type { PricingV2Catalog } from './pricing'
import { CALENDLY_DEMO_URL } from './calendly'

/** Rovnaký fallback ako dnes používa `api/checkout/subscription` (NEXT_PUBLIC_CRM_URL ?? app.revolis.ai). */
export const DEFAULT_CRM_URL = 'https://app.revolis.ai'

/**
 * BLOCKER (W2-C): cieľová URL registrácie s parametrami plánu nie je v kontrakte.
 * CRM `/register` dnes číta len `error` a `email`. Dočasný zdokumentovaný placeholder:
 * `{CRM}/register?pricing=v2&plan=<bandId>[&pack=<kredity>]`. CRM stranu (čítanie parametrov a
 * presmerovanie na checkout so správnym agencyId) musí dodať vetva B/koordinátor pred zapnutím v produkcii.
 */
export const V2_REGISTER_PATH = '/register'

export type PricingV2BandView = {
  id: string
  label: string
  usersLabel: string
  /** napr. „60 €“ alebo „od 349 €“ */
  netLabel: string
  /** napr. „73,80 € s DPH“ */
  grossLabel: string
  creditsLabel: string
  isFromPrice: boolean
  /** adresa CTA: registrácia v CRM (alebo demo pri objemovom pásme Sieť) */
  ctaHref: string
  ctaLabel: string
  /** true = CTA vedie na demo (Calendly), nie do registrácie */
  ctaIsDemo: boolean
}

export type PricingV2PackView = {
  credits: number
  creditsLabel: string
  netLabel: string
  grossLabel: string
  perCreditLabel: string
}

export type PricingV2View = {
  vatPercent: number
  crmUrl: string
  bands: PricingV2BandView[]
  packs: PricingV2PackView[]
  extraCredit: { netLabel: string; grossLabel: string }
  /** CTA pod blokom balíkov: balík sa pridáva až po registrácii v CRM */
  packsCtaHref: string
}

/** Cena z centov v sk formáte: 2500 -> „25 €“, 3075 -> „30,75 €“ (nezlomiteľná medzera pred €). */
export function formatEurCents(cents: number): string {
  if (!Number.isFinite(cents) || cents < 0) throw new RangeError(`Neplatná suma v centoch: ${cents}`)
  const rounded = Math.round(cents)
  const euros = Math.floor(rounded / 100)
  const rest = rounded % 100
  const body = rest === 0 ? String(euros) : `${euros},${String(rest).padStart(2, '0')}`
  return `${body} €`
}

/** Bezpečná základná URL CRM: len http(s), nikdy Stripe; inak default. */
export function safeCrmUrl(raw: string | undefined | null): string {
  const value = (raw ?? '').trim()
  if (!value) return DEFAULT_CRM_URL
  try {
    const u = new URL(value)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return DEFAULT_CRM_URL
    if (/(^|\.)stripe\.com$/i.test(u.hostname)) return DEFAULT_CRM_URL
    return `${u.origin}${u.pathname.replace(/\/+$/, '')}`
  } catch {
    return DEFAULT_CRM_URL
  }
}

export function buildRegisterUrl(crmUrl: string, params: { plan?: string; pack?: number }): string {
  const q = new URLSearchParams({ pricing: 'v2' })
  if (params.plan) q.set('plan', params.plan)
  if (params.pack) q.set('pack', String(params.pack))
  return `${safeCrmUrl(crmUrl)}${V2_REGISTER_PATH}?${q.toString()}`
}

function usersLabel(min: number, max: number | null): string {
  if (max === null) return `${min}+ používateľov`
  if (min === max) return min === 1 ? '1 používateľ' : `${min} používatelia`
  return `${min}–${max} používateľov`
}

export function buildPricingV2View(catalog: PricingV2Catalog, crmUrlRaw?: string | null): PricingV2View {
  const crmUrl = safeCrmUrl(crmUrlRaw)
  return {
    vatPercent: catalog.vatPercent,
    crmUrl,
    bands: catalog.bands.map((b) => {
      const ctaIsDemo = b.isFromPrice
      return {
        id: b.id,
        label: b.label,
        usersLabel: usersLabel(b.minUsers, b.maxUsers),
        netLabel: `${b.isFromPrice ? 'od ' : ''}${formatEurCents(b.netCents)}`,
        grossLabel: `${b.isFromPrice ? 'od ' : ''}${formatEurCents(b.grossCents)} s DPH`,
        creditsLabel: `${b.monthlyCredits} kreditov mesačne pre celú kanceláriu`,
        isFromPrice: b.isFromPrice,
        ctaIsDemo,
        ctaHref: ctaIsDemo ? `${CALENDLY_DEMO_URL}?utm_content=pricing_v2_${b.id}` : buildRegisterUrl(crmUrl, { plan: b.id }),
        ctaLabel: ctaIsDemo ? 'Dohodnúť cenu na deme →' : 'Založiť kanceláriu →',
      }
    }),
    packs: catalog.packs.map((p) => ({
      credits: p.credits,
      creditsLabel: `${p.credits} kreditov`,
      netLabel: formatEurCents(p.netCents),
      grossLabel: `${formatEurCents(p.grossCents)} s DPH`,
      perCreditLabel: `${formatEurCents(Math.round(p.netCentsPerCredit))} / kredit`,
    })),
    extraCredit: {
      netLabel: formatEurCents(catalog.creditUnit.netCents),
      grossLabel: `${formatEurCents(catalog.creditUnit.grossCents)} s DPH`,
    },
    packsCtaHref: buildRegisterUrl(crmUrl, {}),
  }
}

const LEGACY_SOURCE_TO_BAND: Record<string, string> = {
  'pricing-smart-start': 'start',
  'pricing-active-force': 'team',
  'pricing-market-vision': 'office',
}

/** Štítok plánu pre LeadCaptureModal vo v2: zdroj `pricing-v2-<pásmo>` alebo legacy zdroj namapovaný na pásmo. */
export function resolveModalBandV2(source: string, view: PricingV2View): PricingV2BandView | null {
  const id = source.startsWith('pricing-v2-') ? source.slice('pricing-v2-'.length) : LEGACY_SOURCE_TO_BAND[source]
  return view.bands.find((b) => b.id === id) ?? null
}
