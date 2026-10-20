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
  delete process.env.NEXT_PUBLIC_CRM_URL
})

// Nezávislé očakávanie cenníka v3 (PR #884), ručne spočítané: základ = mesačná cena pri ročnej fakturácii
// pre začiatok pásma (1 / 2 / 6 / 11 maklérov): 25 / 65 / 65+9=74 / 110+6=116 €; konečná = bez DPH x 1,23 na cent.
const EXPECTED_BANDS = [
  { label: 'Start', net: '25 €', gross: '30,75 € s DPH' },
  { label: 'Team', net: '65 €', gross: '79,95 € s DPH' },
  { label: 'Kancelária', net: 'od 74 €', gross: 'od 91,02 € s DPH' },
  { label: 'Sieť', net: 'od 116 €', gross: 'od 142,68 € s DPH' },
]
// Balíky kreditov v3: 50/100/150/200/250/300 kreditov za 26/51/74/94/114/131 € bez DPH.
const EXPECTED_PACKS = [
  ['50 kreditov', '26 €', '31,98 € s DPH'],
  ['100 kreditov', '51 €', '62,73 € s DPH'],
  ['150 kreditov', '74 €', '91,02 € s DPH'],
  ['200 kreditov', '94 €', '115,62 € s DPH'],
  ['250 kreditov', '114 €', '140,22 € s DPH'],
  ['300 kreditov', '131 €', '161,13 € s DPH'],
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
    expect(view.packs).toHaveLength(6)
    expect(renderToStaticMarkup(<PricingSectionV2 view={view} />)).toContain('baliky-kreditov')
  })
})

describe('ročné platenie na webe (12 × základ, bez zľavy; akcia 9/12 sa na webe neukazuje)', () => {
  it('karty ukážu ročnú cenu bez DPH aj s DPH; Sieť s predponou „od“', () => {
    const view = buildPricingV2View(buildPricingV2Catalog())
    expect(view.bands.map((b) => norm(b.annualLabel))).toEqual([
      'Ročne 300 € bez DPH (369 € s DPH)',
      'Ročne 780 € bez DPH (959,40 € s DPH)',
      'Ročne od 888 € bez DPH (od 1092,24 € s DPH)',
      'Ročne od 1392 € bez DPH (od 1712,16 € s DPH)',
    ])
    const html = norm(renderToStaticMarkup(<PricingSectionV2 view={view} />))
    expect(html).toContain('Ročne 780 € bez DPH (959,40 € s DPH)')
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
    expect(norm(view.extraCredit.netLabel)).toBe('0,75 €')
    expect(norm(view.extraCredit.grossLabel)).toBe('0,92 € s DPH')
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
    // 349 € (Owner Cockpit) sa v v3 nikde nezobrazí; Sieť je „od 116 €“
    expect(html).not.toContain('349')
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
    // Kancelária (6–10) a Sieť (11+) sú „od“ ceny podľa počtu maklérov: dojednáva sa na deme, nie checkout
    expect(register).not.toContain(`${DEFAULT_CRM_URL}/register?pricing=v2&amp;plan=office`)
    expect(register).not.toContain(`${DEFAULT_CRM_URL}/register?pricing=v2&amp;plan=network`)
    // balíky: registrácia bez konkrétneho pásma
    expect(register).toContain(`${DEFAULT_CRM_URL}/register?pricing=v2`)
    expect(hrefs.some((h) => h.includes('calendly.com') && h.includes('pricing_v2_office'))).toBe(true)
    expect(hrefs.some((h) => h.includes('calendly.com') && h.includes('pricing_v2_network'))).toBe(true)
    // žiadne tlačidlo otvárajúce legacy modal
    expect(html).not.toContain('<button')
  })

  it('URL CRM sa berie z NEXT_PUBLIC_CRM_URL a Stripe doména sa odmietne', () => {
    expect(safeCrmUrl('https://crm.example.sk/')).toBe('https://crm.example.sk')
    expect(safeCrmUrl('https://checkout.stripe.com/c/pay')).toBe(DEFAULT_CRM_URL)
    expect(safeCrmUrl('javascript:alert(1)')).toBe(DEFAULT_CRM_URL)
    expect(safeCrmUrl('')).toBe(DEFAULT_CRM_URL)
    expect(buildRegisterUrl('https://crm.example.sk', { plan: 'team', pack: 50 })).toBe(
      'https://crm.example.sk/register?pricing=v2&plan=team&pack=50',
    )
  })
})

describe('CTA na webe: demo, kým nie je zapnutý signup', () => {
  const noSignup = { PRICING_V2_ENABLED: 'true' }
  it('predvolene vedú všetky pásma na demo, nie do registrácie v CRM', () => {
    const view = resolvePricingV2View(noSignup)!
    expect(view.signupEnabled).toBe(false)
    expect(view.bands.every((b) => b.ctaIsDemo)).toBe(true)
    expect(view.bands.map((b) => b.ctaLabel)).toEqual([
      'Rezervovať demo →',
      'Rezervovať demo →',
      'Dohodnúť cenu na deme →',
      'Dohodnúť cenu na deme →',
    ])
    const html = renderToStaticMarkup(<PricingSectionV2 view={view} />)
    expect(html).not.toContain('/register')
    expect(html).not.toContain('app.revolis.ai')
    expect((html.match(/calendly\.com/g) ?? []).length).toBeGreaterThanOrEqual(4)
  })
  it('PRICING_V2_SIGNUP_ENABLED=true|1|on zapne registráciu len pre pásma s pevnou cenou Start/Team (Kancelária a Sieť sú „od“ ceny: demo)', () => {
    for (const v of ['true', '1', 'on', ' ON ']) {
      const view = resolvePricingV2View({ ...noSignup, PRICING_V2_SIGNUP_ENABLED: v })!
      expect(view.bands.map((b) => b.ctaIsDemo)).toEqual([false, false, true, true])
    }
  })
  it.each(['', 'false', '0', 'yes', 'nonsense'])('PRICING_V2_SIGNUP_ENABLED=%j ostáva v bezpečnom režime (demo)', (v) => {
    expect(resolvePricingV2View({ ...noSignup, PRICING_V2_SIGNUP_ENABLED: v })!.signupEnabled).toBe(false)
  })
  it('modal bez signupu neláka do aplikácie', () => {
    const view = resolvePricingV2View(noSignup)!
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
    expect(html('pricing-v2-team')).toContain('65 €')
    expect(html('pricing-v2-team')).toContain('79,95 € s DPH')
    expect(html('pricing-smart-start')).toContain('25 €')
  })

  it('CTA vedie do registrácie v CRM, nie do Stripe', () => {
    const out = html('pricing-v2-team')
    expect(out).toContain(`${DEFAULT_CRM_URL}/register?pricing=v2&amp;plan=team`)
    expect(out).not.toMatch(/stripe/i)
  })

  it('„od“ pásmo (Kancelária) vedie aj v modale na demo, nie do registrácie', () => {
    const out = html('pricing-v2-office')
    expect(out).toContain('calendly.com')
    expect(out).not.toContain('/register')
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
