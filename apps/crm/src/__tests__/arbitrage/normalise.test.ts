// ================================================================
// Revolis.AI — Arbitrage Engine Tests
// Run: npx jest src/__tests__/arbitrage/
// ================================================================
import {
  normaliseStreet, normaliseCity, normalisePrice,
  areaBucket, roomsBucket, computePropertyHash,
} from '../../lib/arbitrage/normalise'

describe('normalisePrice', () => {
  it('parses "150 000 €"', () => expect(normalisePrice('150 000 €')).toBe(150000))
  it('parses "120000"',     () => expect(normalisePrice('120000')).toBe(120000))
  it('parses number',       () => expect(normalisePrice(95000)).toBe(95000))
  it('returns null for ""', () => expect(normalisePrice('')).toBeNull())
  it('parses "1 200 €/mes"', () => expect(normalisePrice('1 200 €/mes')).toBe(1200))
})

describe('areaBucket', () => {
  it('rounds 73m² to 75', () => expect(areaBucket(73)).toBe(75))
  it('rounds 77m² to 75', () => expect(areaBucket(77)).toBe(75))
  it('rounds 80m² to 80', () => expect(areaBucket(80)).toBe(80))
  it('handles null',       () => expect(areaBucket(null)).toBe(0))
})

describe('roomsBucket', () => {
  it('rounds 2.9 to 3.0',  () => expect(roomsBucket(2.9)).toBe(3.0))
  it('rounds 3.1 to 3.0',  () => expect(roomsBucket(3.1)).toBe(3.0))
  it('handles 3+1 = 3.5',  () => expect(roomsBucket(3.5)).toBe(3.5))
  it('handles null',        () => expect(roomsBucket(null)).toBe(0))
})

describe('normaliseStreet', () => {
  it('removes "ul." prefix',    () => expect(normaliseStreet('Hlavná ul.')).toBe('hlavna'))
  it('removes "ulica" suffix',  () => expect(normaliseStreet('Masarykova ulica')).toBe('masarykova'))
  it('lowercases',              () => expect(normaliseStreet('Štúrova')).toBe('sturova'))
  it('handles empty string',    () => expect(normaliseStreet('')).toBe(''))
})

describe('normaliseCity', () => {
  it('maps Prešov → presov',   () => expect(normaliseCity('Prešov')).toBe('presov'))
  it('maps prešov → presov',   () => expect(normaliseCity('prešov')).toBe('presov'))
  it('maps Košice → kosice',   () => expect(normaliseCity('Košice')).toBe('kosice'))
  it('maps BA → bratislava',   () => expect(normaliseCity('BA')).toBe('bratislava'))
})

describe('computePropertyHash', () => {
  it('is deterministic', () => {
    const a = computePropertyHash({ property_type:'apartment', rooms:3, area_m2:72, city:'Prešov', street:'Hlavná' })
    const b = computePropertyHash({ property_type:'apartment', rooms:3, area_m2:72, city:'Prešov', street:'Hlavná' })
    expect(a).toBe(b)
  })
  it('tolerates 3m² area difference (same bucket)', () => {
    const a = computePropertyHash({ property_type:'apartment', rooms:3, area_m2:73, city:'Prešov', street:'Hlavná' })
    const b = computePropertyHash({ property_type:'apartment', rooms:3, area_m2:74, city:'Prešov', street:'Hlavná' })
    expect(a).toBe(b)
  })
  it('differentiates different rooms', () => {
    const a = computePropertyHash({ property_type:'apartment', rooms:2, area_m2:72, city:'Prešov', street:'Hlavná' })
    const b = computePropertyHash({ property_type:'apartment', rooms:3, area_m2:72, city:'Prešov', street:'Hlavná' })
    expect(a).not.toBe(b)
  })
})
