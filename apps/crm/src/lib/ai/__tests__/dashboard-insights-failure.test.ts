import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardSummaryResponse } from '@/app/api/dashboard/summary/route'

const mockCallClaude = vi.hoisted(() => vi.fn())

vi.mock('../claude', () => ({
  CLAUDE_HAIKU: 'claude-haiku-4-5-20251001',
  CLAUDE_SONNET: 'claude-sonnet-4-6',
  callClaude: (...a: unknown[]) => mockCallClaude(...a),
  extractJson: (t: string) => JSON.parse(t),
}))

import { generateDashboardInsights } from '../dashboard-insights'

const summary: DashboardSummaryResponse = {
  period: 'today',
  totals: { newLeads: 1, activeLeads: 3, hotLeads: 1, dealsInPipeline: 0, dealsWon: 0 },
  buyerReadiness: { averageScore: 60, hotCount: 1, warmCount: 1, coldCount: 1 },
  topHotLeads: [
    {
      id: 'lead-1',
      name: 'Ján Novák',
      segment: 'buyer',
      readinessScore: 88,
      lastActivityAt: '2026-06-02T10:00:00Z',
      propertyInterestSummary: '3-izbový byt, Bratislava',
    },
  ],
  activity: { callsToday: 0, emailsToday: 0, viewingsScheduled: 0 },
}

const input = { period: 'today' as const, summary, userName: 'Maklér' }

describe('generateDashboardInsights — dôvod zlyhania v audite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('odmietnuté volanie: source fallback + failure s kódom dôvodu, insights sú stále zo zálohy', async () => {
    mockCallClaude.mockRejectedValue(
      Object.assign(new Error('invalid x-api-key'), { status: 401, requestID: 'req_7' }),
    )
    const res = await generateDashboardInsights(input)
    expect(res.audit.source).toBe('fallback')
    expect(res.audit.failure).toMatchObject({ reason: 'auth', httpStatus: 401, requestId: 'req_7' })
    expect(res.insights.headline).toBeTruthy()
  })

  it('úspech: source llm a žiadny failure', async () => {
    mockCallClaude.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ headline: 'H', summary: 'S', actions: [], notesForOwner: '' }),
        },
      ],
      usage: { input_tokens: 10, output_tokens: 10 },
    })
    const res = await generateDashboardInsights(input)
    expect(res.audit.source).toBe('llm')
    expect(res.audit.failure).toBeUndefined()
  })

  it('prázdny tenant: model sa nevolá a nie je čo hlásiť', async () => {
    const res = await generateDashboardInsights({
      ...input,
      summary: { ...summary, totals: { ...summary.totals, activeLeads: 0, newLeads: 0, hotLeads: 0 }, topHotLeads: [] },
    })
    expect(res.audit.source).toBe('empty')
    expect(res.audit.failure).toBeUndefined()
    expect(mockCallClaude).not.toHaveBeenCalled()
  })
})
