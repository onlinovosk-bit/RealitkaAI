// ================================================================
// Revolis.AI — BRI Score Tests
// Run: npx jest src/__tests__/bri/
// ================================================================
import { getBRIColorTier, BRI_TIER_COLORS } from '@/types/bri'

describe('getBRIColorTier', () => {
  it('returns hot for score >= 80', () => {
    expect(getBRIColorTier(80)).toBe('hot')
    expect(getBRIColorTier(100)).toBe('hot')
    expect(getBRIColorTier(99)).toBe('hot')
  })
  it('returns warm for 60–79', () => {
    expect(getBRIColorTier(60)).toBe('warm')
    expect(getBRIColorTier(79)).toBe('warm')
  })
  it('returns cool for 40–59', () => {
    expect(getBRIColorTier(40)).toBe('cool')
    expect(getBRIColorTier(59)).toBe('cool')
  })
  it('returns cold for 20–39', () => {
    expect(getBRIColorTier(20)).toBe('cold')
    expect(getBRIColorTier(39)).toBe('cold')
  })
  it('returns dormant for < 20', () => {
    expect(getBRIColorTier(0)).toBe('dormant')
    expect(getBRIColorTier(19)).toBe('dormant')
  })
})

describe('BRI_TIER_COLORS', () => {
  it('has all required tiers', () => {
    const tiers = ['hot', 'warm', 'cool', 'cold', 'dormant'] as const
    tiers.forEach(tier => {
      expect(BRI_TIER_COLORS[tier]).toBeDefined()
      expect(BRI_TIER_COLORS[tier].stroke).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(BRI_TIER_COLORS[tier].label).toBeTruthy()
    })
  })
})

describe('BRI score boundary conditions', () => {
  it('score 0 = dormant tier', () => {
    expect(getBRIColorTier(0)).toBe('dormant')
  })
  it('score 100 = hot tier', () => {
    expect(getBRIColorTier(100)).toBe('hot')
  })
  it('boundary 80 is hot not warm', () => {
    expect(getBRIColorTier(80)).toBe('hot')
    expect(getBRIColorTier(79)).toBe('warm')
  })
})
