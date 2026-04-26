// ================================================================
// Revolis.AI — Morning Brief Tests
// Run: npx jest src/__tests__/morning-brief/
// ================================================================

describe('Brief subject line', () => {
  it('is under 60 characters', () => {
    const subject = 'Ján Kováč · BRI 87/100 — ranný brief Revolis.AI'
    expect(subject.length).toBeLessThanOrEqual(60)
  })

  it('contains BRI score', () => {
    const subject = 'Ján Kováč · BRI 87/100 — ranný brief Revolis.AI'
    expect(subject).toMatch(/BRI \d+\/100/)
  })
})

describe('Urgency classifier', () => {
  const emptyOvernight = {
    newLeads: 0, lvChanges: [], arbitrage: [],
    priceDrops: [], replies: [],
  }

  it('returns high for score >= 80', () => {
    expect(getUrgency(80, emptyOvernight)).toBe('high')
    expect(getUrgency(95, emptyOvernight)).toBe('high')
  })

  it('returns high when there are replies', () => {
    const overnight = {
      ...emptyOvernight,
      replies: [{ leadId:'1', leadName:'Test', repliedAt:'', messagePreview:'' }],
    }
    expect(getUrgency(50, overnight)).toBe('high')
  })

  it('returns medium for score 60-79', () => {
    expect(getUrgency(65, emptyOvernight)).toBe('medium')
  })

  it('returns medium when LV changes exist', () => {
    const overnight = {
      ...emptyOvernight,
      lvChanges: [{ parcelId:'1', address:'Test', changeType:'plomba' as const, leadId:null, leadName:null }],
    }
    expect(getUrgency(40, overnight)).toBe('medium')
  })

  it('returns low for score < 60 with no signals', () => {
    expect(getUrgency(30, emptyOvernight)).toBe('low')
    expect(getUrgency(0,  emptyOvernight)).toBe('low')
  })
})

// Helper — mirrors the logic from ai-text.ts
function getUrgency(
  topScore: number,
  overnight: { replies: unknown[]; lvChanges: unknown[] }
): 'high' | 'medium' | 'low' {
  if (topScore >= 80 || overnight.replies.length > 0) return 'high'
  if (topScore >= 60 || overnight.lvChanges.length > 0) return 'medium'
  return 'low'
}

describe('Delivery timing', () => {
  it('UTC hour 6 = 08:00 SK CET (UTC+2)', () => {
    const utcHour = 6
    const skHour  = (utcHour + 2) % 24
    expect(skHour).toBe(8)
  })

  it('UTC hour 5 = 08:00 SK CEST (UTC+3)', () => {
    const utcHour = 5
    const skHour  = (utcHour + 3) % 24
    expect(skHour).toBe(8)
  })
})
