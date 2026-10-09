/**
 * Dôkaz „vypnutý prepínač = výstup nezmenený“.
 * Zlaté súbory (__tests__/__golden__) boli vygenerované z ZÁKLADNÉHO commitu 26641e8 pred akoukoľvek
 * zmenou kódu; test ich porovnáva bajt po bajte s dnešným renderom pri vypnutom PRICING_V2_ENABLED
 * (nenastavené, prázdne, "false", "0", "off", "no").
 */
import { afterEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PricingSection from '../components/landing/PricingSection'
import LeadCaptureModal from '../components/LeadCaptureModal'
import { DemoCTASection, FaqSection } from '../components/demo/DemoSections'
import ZakulisiePage from '../app/zakulisie/[token]/page'
import ZakulisieLayout from '../app/zakulisie/[token]/layout'

const SEAT_ENV = ['STRIPE_PRICE_SOLO_SEAT', 'STRIPE_PRICE_TEAM_SEAT', 'STRIPE_PRICE_OFFICE_SEAT']
// Verejný web ukazuje v2 predvolene (6. 10. 2026); legacy výstup vráti len výslovné vypnutie.
const OFF_VALUES: Array<string | undefined> = ['false', '0', 'off', 'no', ' FALSE ']

function setEnv(flag: string | undefined, configured: boolean) {
  if (flag === undefined) delete process.env.PRICING_V2_ENABLED
  else process.env.PRICING_V2_ENABLED = flag
  for (const k of SEAT_ENV) {
    if (configured) process.env[k] = 'price_test_golden'
    else delete process.env[k]
  }
}

afterEach(() => {
  delete process.env.PRICING_V2_ENABLED
  delete process.env.PRICING_V2_SIGNUP_ENABLED
  for (const k of SEAT_ENV) delete process.env[k]
})

describe('legacy výstup pri vypnutom prepínači je zhodný so základným commitom', () => {
  for (const configured of [false, true]) {
    it(`PricingSection (checkout ${configured ? 'nakonfigurovaný' : 'nenakonfigurovaný'})`, async () => {
      for (const flag of OFF_VALUES) {
        setEnv(flag, configured)
        const html = renderToStaticMarkup(<PricingSection />)
        await expect(html).toMatchFileSnapshot(`./__golden__/pricing-section-${configured ? 'cfg' : 'nocfg'}.html`)
      }
    })
  }

  for (const source of ['pricing-smart-start', 'pricing-active-force', 'pricing-market-vision', 'waitlist', 'demo-hero']) {
    it(`LeadCaptureModal ${source}`, async () => {
      for (const flag of OFF_VALUES) {
        setEnv(flag, true)
        const html = renderToStaticMarkup(<LeadCaptureModal source={source} onClose={() => {}} />)
        await expect(html).toMatchFileSnapshot(`./__golden__/lead-modal-${source}.html`)
      }
    })
  }

  it('DemoSections (CTA + FAQ)', async () => {
    for (const flag of OFF_VALUES) {
      setEnv(flag, true)
      const html = renderToStaticMarkup(
        <>
          <DemoCTASection />
          <FaqSection />
        </>,
      )
      await expect(html).toMatchFileSnapshot('./__golden__/demo-sections.html')
    }
  })

  it('zakulisie stránka', async () => {
    for (const flag of OFF_VALUES) {
      setEnv(flag, true)
      const html = renderToStaticMarkup(<ZakulisiePage />)
      await expect(html).toMatchFileSnapshot('./__golden__/zakulisie-page.html')
    }
  })

  it('zakulisie layout', async () => {
    for (const flag of OFF_VALUES) {
      setEnv(flag, true)
      const el = await (ZakulisieLayout as any)({ children: <p>x</p>, params: Promise.resolve({ token: 'l99' }) })
      await expect(renderToStaticMarkup(el)).toMatchFileSnapshot('./__golden__/zakulisie-layout.html')
    }
  })
})
