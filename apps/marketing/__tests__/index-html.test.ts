import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

const html = readFileSync(resolve(__dirname, '../public/index.html'), 'utf-8')

/** Nezávislá implementácia cenníka v3 (centy -> eurá), bez DPH, mesačne pri ročnej platbe. */
function expectedMonthly(n: number): number {
  if (n <= 1) return 25
  if (n <= 5) return 65
  if (n <= 10) return 65 + 9 * (n - 5)
  if (n <= 20) return 110 + 6 * (n - 10)
  return 170 + 5 * (n - 20)
}

function loadCalc(): (n: number) => { plan: string; p: number } {
  const m = html.match(/function annualMonthly\(n\)\{[\s\S]*?\n  \}/)
  if (!m) throw new Error('annualMonthly nenájdená')
  return new Function(`${m[0]}; return annualMonthly;`)() as (n: number) => { plan: string; p: number }
}

describe('public/index.html — kampaň cenník v3', () => {
  it('kalkulačka sedí na cenník v3 pre 1..200 maklérov', () => {
    const calc = loadCalc()
    for (let n = 1; n <= 200; n++) expect(calc(n).p).toBe(expectedMonthly(n))
    expect(calc(1).plan).toBe('Start')
    expect(calc(3).plan).toBe('Team')
    expect(calc(7).plan).toBe('Kancelária')
    expect(calc(11).plan).toBe('Sieť')
  })

  it('kontrolné body a príklady v texte', () => {
    for (const [n, p] of [[1, 25], [3, 65], [5, 65], [6, 74], [7, 83], [10, 110], [11, 116], [20, 170], [21, 175], [30, 220]]) {
      expect(expectedMonthly(n)).toBe(p)
    }
    expect(html).toContain('7 maklérov = 83 €, 10 maklérov = 110 €')
    expect(html).toContain('20 maklérov = 170 €, 30 maklérov = 220 €')
    // prvý rok 9 z 12: 25→225/300, 65→585/780, 74→666/888, 116→1 044/1 392
    for (const s of ['225 € namiesto 300 €', '585 € namiesto 780 €', '666 € namiesto 888 €', '1 044 € namiesto 1 392 €']) {
      expect(html).toContain(s)
    }
  })

  it('balíky kreditov a cena kreditu', () => {
    for (const [c, p] of [[50, 26], [100, 51], [150, 74], [200, 94], [250, 114], [300, 131]]) {
      expect(html).toContain(`<b>${c}</b><span>${p} €</span>`)
    }
    expect(html).toContain('0,75 €')
  })

  it('odpočet je na piatok 23. 10. 2026 12:00 (CEST) a po termíne sa texty prepnú', () => {
    expect(html).toContain('new Date("2026-10-23T12:00:00+02:00")')
    expect(html).toContain('data-after=')
    expect(html).toContain('el.textContent=el.getAttribute("data-after")')
  })

  it('garancia 100 % / 30 dní, bez "+50 €", bez slova pilot a bez mena referenčného klienta', () => {
    expect(html).toContain('do 30 dní vám vrátime 100 % peňazí')
    expect(html).not.toMatch(/\+ ?50 ?€/)
    expect(html).not.toMatch(/pilot/i)
    expect(html).not.toMatch(/smolko/i)
  })

  it('hero hovorí o rýchlosti a netvrdí funkcie, ktoré nie sú LIVE', () => {
    expect(html).toContain('Inzerát hotový za minúty.')
    expect(html).toContain('Dopyty v CRM samé.')
    expect(html).not.toMatch(/komu volať ako prvému/i)
    expect(html).not.toMatch(/virtuáln(y|y) staging|vyprázdnenie miestnosti|pôdorys|tiktok|reels/i)
    expect(html).not.toMatch(/watermark/i)
  })

  it('SEO: canonical a og:url na www, CTA vedú na registráciu a nesú UTM', () => {
    expect(html).toContain('<link rel="canonical" href="https://www.revolis.ai/">')
    expect(html).toContain('<meta property="og:url" content="https://www.revolis.ai/">')
    expect(html).toContain('href="https://realitka-ai.vercel.app/register"')
    expect(html).toContain('/^utm_/i.test(k)')
  })

  it('next.config presmeruje root na index.html cez rewrite', () => {
    const cfg = readFileSync(resolve(__dirname, '../next.config.ts'), 'utf-8')
    expect(cfg).toContain("source: '/', destination: '/index.html'")
  })

  it('počet miest: bez sľubu "zadarmo" pre role, ktoré CRM zatiaľ nevynucuje (SEAT-AUDIT)', () => {
    expect(html).toContain('Cena sa riadi počtom maklérov v tíme')
    expect(html).not.toMatch(/asistentka a back office sú zadarmo/)
  })

  it('prepínač ročne/mesačne: mesačné ceny = ročné × 1,2 a sú v kóde stránky', () => {
    expect(html).toContain('id="billToggle"')
    expect(html).toContain('id="billYear"')
    expect(html).toContain('id="billMonth"')
    // karty: mesačná cena bez záväzku = ročná základná cena × 1,2
    for (const [yearly, monthly] of [['25', '30'], ['65', '78'], ['74', '88,80'], ['116', '139,20']]) {
      expect(Math.round(Number(yearly) * 1.2 * 100) / 100).toBe(Number(monthly.replace(',', '.')))
      expect(html).toContain(`${monthly} € <small>/ mesiac</small>`)
    }
    // príklady pre Kanceláriu a Sieť (mesačne): 7 = 99,60; 10 = 132; 20 = 204; 30 = 264
    expect(html).toContain('7 maklérov = 99,60 €, 10 maklérov = 132 €')
    expect(html).toContain('20 maklérov = 204 €, 30 maklérov = 264 €')
    // kalkulačka mesačne počíta z ročnej ceny × 1,2
    expect(html).toContain('r.p*1.2*100')
  })

  it('výber plánu: 4 karty sú voliteľné (radio), n určuje vybraný plán a kalkulačku', () => {
    expect(html).toContain('id="planGrid"')
    for (const [plan, n] of [['start', '1'], ['team', '3'], ['office', '6'], ['network', '11']]) {
      expect(html).toContain(`data-plan="${plan}" data-n="${n}" role="radio" tabindex="0"`)
    }
    expect((html.match(/<div class="pick">/g) ?? []).length).toBe(4)
    // rozsahy plánov musia sedieť s cenníkom v3: 1 / 2–5 / 6–10 / 11+
    expect(html).toContain('function planKey(n){ return n<=1?"start":n<=5?"team":n<=10?"office":"network"; }')
    expect(html).toContain('addEventListener("click",function(){ selectPlan(card); })')
  })
})
