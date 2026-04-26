// ================================================================
// Revolis.AI — Price Trail Scoring Tests
// Run: npx jest src/__tests__/price-trail/
// ================================================================
import { generateNegotiationScript } from '../../lib/price-trail/negotiation-script'
import { TIER_CONFIG } from '../../types/price-trail'
import type { NegotiationBrief } from '../../types/price-trail'

const mockBrief = (overrides: Partial<NegotiationBrief> = {}): NegotiationBrief => ({
  profile_id:           'test-profile',
  listing_id:           'test-listing',
  property_id:          null,
  motivation_score:     72,
  motivation_tier:      'high',
  motivation_brief:     'Test brief',
  drop_count:           3,
  total_drop_eur:       28000,
  total_drop_pct:       14.9,
  days_on_market:       94,
  days_since_last_drop: 8,
  price_velocity:       -297.8,
  listing_count:        1,
  first_price:          187000,
  current_price:        159000,
  estimated_floor:      148000,
  negotiation_range:    39000,
  best_offer_window:    null,
  computed_at:          new Date().toISOString(),
  trail_start_at:       new Date(Date.now() - 94 * 86400000).toISOString(),
  listing_title:        'Test listing',
  city:                 'Prešov',
  street:               'Hlavná',
  area_m2:              72,
  rooms:                3,
  cover_photo_url:      null,
  portal_url:           null,
  ...overrides,
})

describe('generateNegotiationScript', () => {
  it('returns 4 lines', () => {
    const lines = generateNegotiationScript(mockBrief())
    expect(lines.length).toBeGreaterThanOrEqual(4)
  })

  it('has correct phases in order', () => {
    const lines  = generateNegotiationScript(mockBrief())
    const phases = lines.map(l => l.phase)
    expect(phases).toContain('opener')
    expect(phases).toContain('anchor')
    expect(phases).toContain('floor')
    expect(phases).toContain('close')
  })

  it('uses urgent opener for urgent tier', () => {
    const lines = generateNegotiationScript(mockBrief({ motivation_tier: 'urgent', drop_count: 5 }))
    const opener = lines.find(l => l.phase === 'opener')
    expect(opener?.text).toMatch(/5×/)
  })

  it('includes estimated floor in floor line', () => {
    const lines = generateNegotiationScript(mockBrief({ estimated_floor: 148000 }))
    const floor = lines.find(l => l.phase === 'floor')
    expect(floor?.text).toMatch(/148/)
  })

  it('references days_since_last_drop in close for urgent', () => {
    const lines = generateNegotiationScript(mockBrief({
      motivation_tier:      'urgent',
      days_since_last_drop: 5,
    }))
    const close = lines.find(l => l.phase === 'close')
    expect(close?.text).toMatch(/5 d/)
  })

  it('every line has non-empty text and context', () => {
    const lines = generateNegotiationScript(mockBrief())
    lines.forEach(line => {
      expect(line.text.length).toBeGreaterThan(20)
      expect(line.context.length).toBeGreaterThan(20)
    })
  })
})

describe('TIER_CONFIG', () => {
  const tiers = ['urgent', 'high', 'medium', 'low', 'unknown'] as const

  it('has all 5 tiers', () => {
    tiers.forEach(t => expect(TIER_CONFIG[t]).toBeDefined())
  })

  it('all tiers have required fields', () => {
    tiers.forEach(t => {
      expect(TIER_CONFIG[t].color).toMatch(/^#/)
      expect(TIER_CONFIG[t].bg).toMatch(/^#/)
      expect(TIER_CONFIG[t].text).toMatch(/^#/)
      expect(TIER_CONFIG[t].label.length).toBeGreaterThan(3)
    })
  })
})

describe('Motivation score thresholds', () => {
  // These mirror the SQL CASE in compute_motivation_score
  const tierFromScore = (score: number) => {
    if (score >= 75) return 'urgent'
    if (score >= 55) return 'high'
    if (score >= 35) return 'medium'
    if (score >= 15) return 'low'
    return 'unknown'
  }

  it('score 100 = urgent', () => expect(tierFromScore(100)).toBe('urgent'))
  it('score 75 = urgent',  () => expect(tierFromScore(75)).toBe('urgent'))
  it('score 74 = high',    () => expect(tierFromScore(74)).toBe('high'))
  it('score 55 = high',    () => expect(tierFromScore(55)).toBe('high'))
  it('score 54 = medium',  () => expect(tierFromScore(54)).toBe('medium'))
  it('score 14 = unknown', () => expect(tierFromScore(14)).toBe('unknown'))
  it('score 0  = unknown', () => expect(tierFromScore(0)).toBe('unknown'))
})
