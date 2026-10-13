/**
 * Cenník v2 na webe (W2-C): správanie pri zapnutom prepínači. Vypnutý prepínač = zhodný výstup
 * dokazuje legacy-golden.test.tsx.
 */
import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PricingSection from '../components/landing/PricingSection'
import PricingSectionV2 from '../components/landing/PricingSectionV2'
import LandingPage from '../components/landing/LandingPage'
import LeadCaptureModal from '../components/LeadCaptureModal'
import { FaqSection } from '../components/demo/DemoSections'
import ZakulisiePage from '../app/zakulisie/[token]/page'
import ZakulisieLayout from '../app/zakulisie/[token]/layout'
import { buildPricingV2Catalog } from '../lib/pricing'
import {
  DEFAULT_CRM_URL,
  buildPricingV2View,
  buildRegisterUrl,
  formatEurCents,
  resolveModalBandV2,
  safeCrmUrl,
} from '../lib/pricing-v2-view'
import { resolvePricingV2View } from '../lib/pricing-v2-server'

const norm = (html: string) => html.replace(/ /g, ' ')

function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const prev: Record<string, string | undefined> = {}
  for (const k of Object.keys(env)) prev[k] = process.env[k]
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  try {
    return fn()
  } finally {
    // pozor: pri async fn sa env obnoví hneď; async prípady používajú withEnvAsync
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }
}

async function withEnvAsync(env: Record<string, string | undefined>, fn: () => Promise<void>) {
  const prev: Record<string, string | undefined> = {}
  for (const k of Object.keys(env)) prev[k] = process.env[k]
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  try {
    await fn()
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }
}

afterEach(() => {
  delete process.env.PRICING_V2_ENABLED
  delete process.env.PRICING_V2_SIGNUP_ENABLED
  delete process.env.NEXT_PUBLIC_CRM_URL
})

// Nezávislé očakávanie (ručne spočítané z W1: bez DPH x 1,23 zaokrúhlené na cent).
const EXPECTED_BANDS = [
  { label: 'Start', net: '25 €', gross: '30,75 € s DPH' },
  { label: 'Team', net: '60 €', gross: '73,80 € s DPH' },
  { label: 'Kancelária', net: '149 €', gross: '183,27 € s DPH' },
  { label: 'Sieť', net: 'od 349 €', gross: 'od 429,27 € s DPH' },
]
const EXPECTED_PACKS = [
  ['60 kreditov', '34 €', '41,82 € s DPH'],
  ['120 kreditov', '62 €', '76,26 € s DPH'],
  ['180 kreditov', '86 €', '105,78 € s DPH'],
  ['240 kreditov', '108 €', '132,84 € s DPH'],
  ['300 kreditov', '129 €', '158,67 € s DPH'],
]

describe('formatEurCents', () => {
  it('formátuje celé aj desatinné sumy v sk tvare', () => {
    expect(norm(formatEurCents(2500))).toBe('25 €')
    expect(norm(formatEurCents(3075))).toBe('30,75 €')
    expect(norm(formatEurCents(5))).toBe('0,05 €')
  })
  it('odmietne neplatný vstup', () => {
    expect(() => formatEurCents(-1)).toThrow()
    expect(() => formatEurCents(NaN)).toThrow()
  })
})

describe('resolvePricingV2View (prepínač)', () => {
  it('výslovne vypnuté (false / 0 / off / no) -> legacy (null)', () => {
    for (const v of ['false', '0', 'off', 'no', ' FALSE ']) {
      expect(resolvePricingV2View({ PRICING_V2_ENABLED: v })).toBeNull()
    }
  })
  it('predvolene (nenastavené / prázdne) web ukazuje cenník v2', () => {
    for (const v of [undefined, '']) {
      expect(resolvePricingV2View({ PRICING_V2_ENABLED: v })).not.toBeNull()
    }
    expect(resolvePricingV2View({})!.bands.map((b) => b.id)).toEqual(['start', 'team', 'office', 'network'])
  })
  it('zapnuté (true/1/on) -> katalóg', () => {
    for (const v of ['true', '1', 'on', ' TRUE ']) {
      expect(resolvePricingV2View({ PRICING_V2_ENABLED: v })).not.toBeNull()
    }
  })
})

describe('režim „len plány“ na webe', () => {
  const env = { PRICING_V2_ENABLED: 'true' }
  it('predvolene bez balíkov a bez bloku „Mesačné balíky kreditov“', () => {
    const view = resolvePricingV2View(env)!
    expect(view.plansOnly).toBe(true)
    expect(view.packs).toEqual([])
    const html = renderToStaticMarkup(<PricingSectionV2 view={view} />)
    expect(html).not.toContain('baliky-kreditov')
    expect(html).not.toContain('Mesačné balíky kreditov')
    expect(html).not.toContain('Samostatne dokúpené')
    expect(html).toContain('Jedna cena za celú kanceláriu')
  })
  it('PRICING_V2_PLANS_ONLY=false vráti balíky', () => {
    const view = resolvePricingV2View({ ...env, PRICING_V2_PLANS_ONLY: 'false' })!
    expect(view.plansOnly).toBe(false)
    expect(view.packs).toHaveLength(5)
    expect(renderToStaticMarkup(<PricingSectionV2 view={view} />)).toContain('baliky-kreditov')
  })
})

describe('ročné platenie na webe (12 × mesačná, bez zľavy)', () => {
  it('karty ukážu ročnú cenu bez DPH aj s DPH; Sieť s predponou „od“', () => {
    const view = buildPricingV2View(buildPricingV2Catalog())
    expect(view.bands.map((b) => norm(b.annualLabel))).toEqual([
      'Ročne 300 € bez DPH (369 € s DPH)',
      'Ročne 720 € bez DPH (885,60 € s DPH)',
      'Ročne 1788 € bez DPH (2199,24 € s DPH)',
      'Ročne od 4188 € bez DPH (od 5151,24 € s DPH)',
    ])
    const html = norm(renderToStaticMarkup(<PricingSectionV2 view={view} />))
    expect(html).toContain('Ročne 720 € bez DPH (885,60 € s DPH)')
    expect(html).not.toContain('Ušetríte')
    expect(html).not.toMatch(/zľav/i)
  })
})

describe('zahrnuté kredity plánov (rozhodnutie 13. 10. 2026: 25 / 60 / 120 / 175)', () => {
  it('karty plánov ukážu kredity na celú kanceláriu, nie staré 20 / 50 / 100 / 150', () => {
    const view = buildPricingV2View(buildPricingV2Catalog())
    expect(view.bands.map((b) => b.creditsLabel)).toEqual([
      '25 kreditov mesačne pre celú kanceláriu',
      '60 kreditov mesačne pre celú kanceláriu',
      '120 kreditov mesačne pre celú kanceláriu',
      '175 kreditov mesačne pre celú kanceláriu',
    ])
    const html = renderToStaticMarkup(<PricingSectionV2 view={view} />)
    for (const label of view.bands.map((b) => b.creditsLabel)) expect(html).toContain(label)
    // „120 kreditov…“ obsahuje podreťazec „20 kreditov…“, preto staré čísla pinujeme celým labelom, nie substringom.
    expect(html).not.toMatch(/(?<!\d)20 kreditov mesačne pre celú kanceláriu/)
    expect(html).not.toMatch(/(?<!\d)50 kreditov mesačne pre celú kanceláriu/)
    expect(html).not.toMatch(/(?<!\d)100 kreditov mesačne pre celú kanceláriu/)
    expect(html).not.toMatch(/(?<!\d)150 kreditov mesačne pre celú kanceláriu/)
  })
})

describe('ceny pochádzajú z katalógu', () => {
  it('view zodpovedá nezávislým očakávaniam', () => {
    const view = buildPricingV2View(buildPricingV2Catalog())
    expect(view.bands.map((b) => [b.label, norm(b.netLabel), norm(b.grossLabel)])).toEqual(
      EXPECTED_BANDS.map((b) => [b.label, b.net, b.gross]),
    )
    expect(view.packs.map((p) => [p.creditsLabel, norm(p.netLabel), norm(p.grossLabel)])).toEqual(EXPECTED_PACKS)
    expect(norm(view.extraCredit.netLabel)).toBe('0,70 €')
    expect(norm(view.extraCredit.grossLabel)).toBe('0,86 € s DPH')
  })

  it('zmena sadzby DPH v katalógu sa prejaví bez zásahu do komponentov', () => {
    const view = buildPricingV2View(buildPricingV2Catalog(20))
    expect(norm(view.bands[0].grossLabel)).toBe('30 € s DPH')
    expect(view.vatPercent).toBe(20)
  })
})

describe('PricingSection pri zapnutom prepínači', () => {
  const render = () =>
    withEnv({ PRICING_V2_ENABLED: 'true', PRICING_V2_PLANS_ONLY: 'false', PRICING_V2_SIGNUP_ENABLED: 'true', NEXT_PUBLIC_CRM_URL: undefined }, () => norm(renderToStaticMarkup(<PricingSection />)))

  it('ukáže 4 pásma s čistou aj konečnou cenou', () => {
    const html = render() as unknown as string
    for (const b of EXPECTED_BANDS) {
      expect(html).toContain(`<h3>${b.label}</h3>`)
      expect(html).toContain(b.net)
      expect(html).toContain(b.gross)
    }
    expect((html.match(/class="plan(?: featured)?"/g) ?? []).length).toBe(4)
    expect(html).toContain('bez DPH')
    expect(html).toContain('23 %')
  })

  it('mesačné balíky kreditov sú samostatný blok s cenami z katalógu', () => {
    const html = render() as unknown as string
    expect(html).toContain('Mesačné balíky kreditov')
    for (const [credits, net, gross] of EXPECTED_PACKS) {
      expect(html).toContain(credits)
      expect(html).toContain(net)
      expect(html).toContain(gross)
    }
  })

  it('Owner Cockpit 349 € a seat ceny sa vo v2 nezobrazia', () => {
    const html = render() as unknown as string
    expect(html).not.toContain('Owner Cockpit')
    expect(html).not.toContain('Cockpit Lite')
    expect(html).not.toContain('/ seat')
    expect(html).not.toContain('249')
    expect(html).not.toContain('79 €')
    expect(html).not.toContain('71 €')
    expect(html).not.toContain('63 €')
    // 349 € smie byť len ako cena pásma Sieť („od 349 €“), nie ako samostatný produkt
    expect((html.match(/349/g) ?? []).length).toBe(1)
  })

  it('CTA nikdy nevedie na priamy Stripe checkout ani na starý marketingový checkout', () => {
    const html = render() as unknown as string
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
    expect(hrefs.length).toBeGreaterThanOrEqual(5)
    for (const h of hrefs) {
      expect(h).not.toMatch(/stripe/i)
      expect(h).not.toContain('/api/checkout')
    }
    const register = hrefs.filter((h) => h.startsWith(DEFAULT_CRM_URL))
    expect(register).toContain(`${DEFAULT_CRM_URL}/register?pricing=v2&amp;plan=start`)
    expect(register).toContain(`${DEFAULT_CRM_URL}/register?pricing=v2&amp;plan=team`)
    expect(register).toContain(`${DEFAULT_CRM_URL}/register?pricing=v2&amp;plan=office`)
    // balíky: registrácia bez konkrétneho pásma
    expect(register).toContain(`${DEFAULT_CRM_URL}/register?pricing=v2`)
    expect(register).toContain(`${DEFAULT_CRM_URL}/register?pricing=v2&amp;plan=network`)
    // Calendly ostáva ako vedľajší odkaz (aj Sieť)
    expect(hrefs.some((h) => h.includes('calendly.com') && h.includes('pricing_v2_network'))).toBe(true)
    expect(html).toContain('Dohodnite si ukážku')
    // žiadne tlačidlo otvárajúce legacy modal
    expect(html).not.toContain('<button')
  })

  it('URL CRM sa berie z NEXT_PUBLIC_CRM_URL a Stripe doména sa odmietne', () => {
    expect(safeCrmUrl('https://crm.example.sk/')).toBe('https://crm.example.sk')
    expect(safeCrmUrl('https://checkout.stripe.com/c/pay')).toBe(DEFAULT_CRM_URL)
    expect(safeCrmUrl('javascript:alert(1)')).toBe(DEFAULT_CRM_URL)
    expect(safeCrmUrl('')).toBe(DEFAULT_CRM_URL)
    expect(buildRegisterUrl('https://crm.example.sk', { plan: 'team', pack: 60 })).toBe(
      'https://crm.example.sk/register?pricing=v2&plan=team&pack=60',
    )
  })
})

describe('CTA na webe: predvolene 14-dňová skúška, Calendly vedľajší', () => {
  const v2 = { PRICING_V2_ENABLED: 'true' }
  it('predvolene (nenastavené / prázdne / true) vedú všetky pásma vrátane Siete na /register', () => {
    for (const v of [undefined, '', 'true', '1', 'on', 'yes', 'nonsense']) {
      const view = resolvePricingV2View({ ...v2, PRICING_V2_SIGNUP_ENABLED: v })!
      expect(view.signupEnabled).toBe(true)
      expect(view.bands.every((b) => b.ctaIsDemo)).toBe(false)
      expect(view.bands.map((b) => b.ctaLabel)).toEqual([
        'Začať 14 dní zadarmo →',
        'Začať 14 dní zadarmo →',
        'Začať 14 dní zadarmo →',
        'Začať 14 dní zadarmo →',
      ])
      expect(view.bands.map((b) => b.ctaHref)).toEqual([
        `${DEFAULT_CRM_URL}/register?pricing=v2&plan=start`,
        `${DEFAULT_CRM_URL}/register?pricing=v2&plan=team`,
        `${DEFAULT_CRM_URL}/register?pricing=v2&plan=office`,
        `${DEFAULT_CRM_URL}/register?pricing=v2&plan=network`,
      ])
    }
    const html = renderToStaticMarkup(<PricingSectionV2 view={resolvePricingV2View(v2)!} />)
    expect(html).toContain('/register?pricing=v2&amp;plan=start')
    expect(html).toContain('/register?pricing=v2&amp;plan=network')
    expect(html).toContain('Dohodnite si ukážku')
    expect((html.match(/calendly\.com/g) ?? []).length).toBeGreaterThanOrEqual(4)
  })
  it.each(['false', '0', 'off', 'no', ' FALSE '])(
    'PRICING_V2_SIGNUP_ENABLED=%j je núdzový vypínač: primárne CTA na demo, bez /register',
    (v) => {
      const view = resolvePricingV2View({ ...v2, PRICING_V2_SIGNUP_ENABLED: v })!
      expect(view.signupEnabled).toBe(false)
      expect(view.bands.every((b) => b.ctaIsDemo)).toBe(true)
      const html = renderToStaticMarkup(<PricingSectionV2 view={view} />)
      expect(html).not.toContain('/register')
      expect(html).not.toContain('app.revolis.ai')
      expect((html.match(/calendly\.com/g) ?? []).length).toBeGreaterThanOrEqual(4)
    },
  )
  it('modal pri zapnutom signupe láka do 14-dňovej skúšky, Calendly je vedľajší', () => {
    const view = resolvePricingV2View(v2)!
    const out = norm(renderToStaticMarkup(<LeadCaptureModal source="pricing-v2-team" onClose={() => {}} pricingV2={view} />))
    expect(out).toContain('14 dní zadarmo, bez platobnej karty')
    expect(out).toContain('/register')
    expect(out).toContain('Dohodnite si ukážku')
    expect(out).not.toContain('platba prebehne tam')
  })
  it('modal pri núdzovom vypnutí neláka do aplikácie', () => {
    const view = resolvePricingV2View({ ...v2, PRICING_V2_SIGNUP_ENABLED: 'false' })!
    const out = norm(renderToStaticMarkup(<LeadCaptureModal source="pricing-v2-team" onClose={() => {}} pricingV2={view} />))
    expect(out).toContain('na krátkom deme')
    expect(out).not.toContain('Kanceláriu založíte v aplikácii')
    expect(out).not.toContain('/register')
  })
})

describe('LeadCaptureModal vo v2', () => {
  const view = buildPricingV2View(buildPricingV2Catalog(), undefined, { signupEnabled: true })
  const html = (source: string) =>
    norm(renderToStaticMarkup(<LeadCaptureModal source={source} onClose={() => {}} pricingV2={view} />))

  it('berie cenu z katalógu, bez zadrôtovaných 79/71/63 a bez formulára do checkoutu', () => {
    for (const source of ['pricing-smart-start', 'pricing-active-force', 'pricing-market-vision', 'pricing-v2-team']) {
      const out = html(source)
      expect(out).not.toMatch(/79 €|71 €|63 €/)
      expect(out).not.toContain('/seat/mes')
      expect(out).not.toContain('<form')
      expect(out).not.toContain('Prejsť na platbu')
      expect(out).toContain('bez DPH')
    }
    expect(html('pricing-v2-team')).toContain('60 €')
    expect(html('pricing-v2-team')).toContain('73,80 € s DPH')
    expect(html('pricing-smart-start')).toContain('25 €')
  })

  it('CTA vedie do registrácie v CRM, nie do Stripe', () => {
    const out = html('pricing-v2-office')
    expect(out).toContain(`${DEFAULT_CRM_URL}/register?pricing=v2&amp;plan=office`)
    expect(out).not.toMatch(/stripe/i)
  })

  it('neznáme pásmo nespadne ani nevedie do checkoutu', () => {
    expect(resolveModalBandV2('pricing-v2-nope', view)).toBeNull()
    const out = html('pricing-v2-nope')
    expect(out).not.toContain('<form')
    expect(out).toContain('už nie je v ponuke')
  })

  it('bez katalógu sa zdroj pricing-v2-* nikdy nespracuje legacy checkoutom', () => {
    const out = renderToStaticMarkup(<LeadCaptureModal source="pricing-v2-team" onClose={() => {}} />)
    expect(out).not.toContain('Prejsť na platbu')
  })
})

describe('ostatné povrchy (zakulisie, demo FAQ) vo v2', () => {
  it('zakulisie layout dodá katalóg a stránka ukáže ceny pásiem z neho', async () => {
    await withEnvAsync({ PRICING_V2_ENABLED: 'true' }, async () => {
      const el = await (ZakulisieLayout as any)({
        children: <ZakulisiePage />,
        params: Promise.resolve({ token: 'l99' }),
      })
      const out = norm(renderToStaticMarkup(el))
      expect(out).toContain('25 € bez DPH (30,75 € s DPH)')
      expect(out).toContain('Aktivujte plán od 25 € / mes bez DPH (30,75 € s DPH)')
      expect(out).not.toContain('79 €')
      expect(out).not.toContain('71 €')
      expect(out).not.toContain('Office seat')
    })
  })

  it('demo FAQ: cena z katalógu, ostatné odpovede nezmenené', () => {
    withEnv({ PRICING_V2_ENABLED: 'true' }, () => {
      const out = norm(renderToStaticMarkup(<FaqSection />))
      expect(out).toContain('Plán Start od 25 € / mes bez DPH (30,75 € s DPH)')
      expect(out).not.toContain('79 €')
      expect(out).toContain('30-dňová garancia vrátenia peňazí')
    })
  })
})

describe('starý marketingový checkout', () => {
  const root = resolve(__dirname, '..')
  it('api/checkout/subscription je nezmenený oproti základnému commitu', () => {
    const bytes = readFileSync(resolve(root, 'app/api/checkout/subscription/route.ts'))
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      '91402066467cd28105035053d2eed1fcb9a7f51a7cb80921a997d525b135f8e9',
    )
  })

  it('v2 moduly neodkazujú na Stripe ani na starý checkout', () => {
    for (const f of [
      'lib/pricing-v2-view.ts',
      'lib/pricing-v2-server.ts',
      'components/landing/PricingSectionV2.tsx',
      'components/landing/PricingV2Cta.tsx',
    ]) {
      const src = readFileSync(resolve(root, f), 'utf8')
      // komentáre smú Stripe spomínať; kontrolujeme kód bez komentárov
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
      expect(code, f).not.toMatch(/checkout\/subscription|api\/checkout|checkout\.stripe|js\.stripe|STRIPE_|fetch\(/i)
      expect(code, f).not.toMatch(/lemon|lemonsqueezy/i)
    }
  })

  it('CTA cenníka v2 nikdy nevedie na Lemon Squeezy', () => {
    const view = buildPricingV2View(buildPricingV2Catalog(), undefined, { signupEnabled: true })
    for (const band of view.bands) {
      expect(band.ctaHref).not.toMatch(/lemon|lemonsqueezy/i)
    }
    expect(view.packsCtaHref).not.toMatch(/lemon|lemonsqueezy/i)
    const html = renderToStaticMarkup(<PricingSectionV2 view={view} />)
    expect(html).not.toMatch(/lemon|lemonsqueezy/i)
  })
})

describe('primárne CTA na landingu (hero, nav, sticky, kalkulačka)', () => {
  it('predvolene vedú na /register?plan=start, Calendly je vedľajší', () => {
    const html = withEnv({ PRICING_V2_SIGNUP_ENABLED: undefined, NEXT_PUBLIC_CRM_URL: undefined }, () =>
      renderToStaticMarkup(<LandingPage />),
    )
    expect(html).toContain(`${DEFAULT_CRM_URL}/register?pricing=v2&amp;plan=start`)
    expect(html).toContain('Začať 14 dní zadarmo')
    expect(html).toContain('Dohodnite si ukážku')
    expect(html).toContain('calendly.com/revoliscrm/30min')
    expect(html).not.toContain('Rezervovať demo zdarma')
  })
  it('núdzový vypínač vráti primárne CTA na Calendly bez /register', () => {
    const html = withEnv({ PRICING_V2_SIGNUP_ENABLED: 'false' }, () => renderToStaticMarkup(<LandingPage />))
    expect(html).not.toContain('/register')
    expect(html).toContain('Rezervovať demo')
    expect(html).toContain('calendly.com/revoliscrm/30min')
  })
})

describe('funkcie plánov v kartách cenníka', () => {
  const view = buildPricingV2View(buildPricingV2Catalog())
  const byId = Object.fromEntries(view.bands.map((b) => [b.id, b.features]))

  it('každé pásmo má funkcie a vyššie pásma nadväzujú na nižšie', () => {
    for (const b of view.bands) expect(b.features.length).toBeGreaterThan(0)
    expect(byId.team[0]).toBe('Všetko zo Start')
    expect(byId.office[0]).toBe('Všetko z Team')
    expect(byId.network[0]).toBe('Všetko z Kancelárie')
  })

  it('karta ukáže funkcie, prioritná podpora je až od Kancelárie', () => {
    const html = renderToStaticMarkup(<PricingSectionV2 view={view} />)
    expect(html).toContain('Denný briefing priorít')
    expect(html).toContain('Tímový prehľad pre majiteľa')
    expect(byId.start).not.toContain('Prioritná podpora')
    expect(byId.team).not.toContain('Prioritná podpora')
    expect(byId.office).toContain('Prioritná podpora')
  })
})
