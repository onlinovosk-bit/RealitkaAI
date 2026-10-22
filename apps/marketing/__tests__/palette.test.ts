import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(__dirname, '..')

function read(rel: string) {
  return readFileSync(resolve(ROOT, rel), 'utf-8')
}

function parseTokens(css: string): Record<string, string> {
  const block = css.match(/:root\s*\{([\s\S]*?)\}/)
  if (!block) throw new Error(':root block missing')
  const tokens: Record<string, string> = {}
  for (const m of block[1].matchAll(/--([a-z0-9-]+):\s*([^;]+);/gi)) {
    tokens[m[1]] = m[2].trim()
  }
  return tokens
}

function lum(hex: string) {
  const n = hex.replace('#', '')
  const r = parseInt(n.slice(0, 2), 16) / 255
  const g = parseInt(n.slice(2, 4), 16) / 255
  const b = parseInt(n.slice(4, 6), 16) / 255
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function contrast(a: string, b: string) {
  const L1 = lum(a)
  const L2 = lum(b)
  const hi = Math.max(L1, L2)
  const lo = Math.min(L1, L2)
  return (hi + 0.05) / (lo + 0.05)
}

describe('marketing palette tokens', () => {
  const css = read('public/palette.css')
  const tokens = parseTokens(css)

  it('centralizes the navy + gold token set', () => {
    expect(tokens['rev-bg']).toBe('#0A1020')
    expect(tokens['rev-bg-mid']).toBe('#0F1A2E')
    expect(tokens['rev-surface']).toBe('#121C30')
    expect(tokens['rev-text']).toBe('#F5EFE6')
    expect(tokens['rev-muted']).toBe('#B8C0CC')
    expect(tokens['rev-gold']).toBe('#D9B26A')
    expect(tokens['rev-gold-hi']).toBe('#E2BC78')
    expect(tokens['rev-ink']).toBe('#0A1020')
  })

  it('meets WCAG AA (4.5:1) for text and primary buttons', () => {
    const pairs: Array<[string, string, string]> = [
      [tokens['rev-text'], tokens['rev-bg'], 'headline on page'],
      [tokens['rev-muted'], tokens['rev-surface'], 'body on card'],
      [tokens['rev-gold'], tokens['rev-bg'], 'gold label on page'],
      [tokens['rev-ink'], tokens['rev-gold'], 'CTA ink on gold'],
      [tokens['rev-ink'], tokens['rev-gold-hi'], 'CTA ink on gold-hi'],
      [tokens['rev-good'], tokens['rev-bg'], 'check/success on page'],
    ]
    for (const [fg, bg, label] of pairs) {
      expect(contrast(fg, bg), label).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('is imported by Next marketing CSS and linked from the campaign homepage', () => {
    expect(read('app/globals.css')).toContain("import '../public/palette.css'")
    expect(read('public/index.html')).toContain('href="/palette.css"')
    expect(read('app/landing-v2.css')).toContain('var(--rev-bg)')
    expect(read('app/demo/demo.css')).toContain('var(--rev-gold)')
    expect(read('app/balik/balik.css')).toContain('var(--rev-gold)')
  })

  it('does not introduce the word pilot and keeps campaign prices/CTAs', () => {
    const html = read('public/index.html')
    expect(html).not.toMatch(/pilot/i)
    expect(html).toContain('href="https://realitka-ai.vercel.app/register"')
    expect(html).toContain('7 maklérov = 83 €, 10 maklérov = 110 €')
    expect(html).toContain('<link rel="canonical" href="https://www.revolis.ai/">')
  })
})
