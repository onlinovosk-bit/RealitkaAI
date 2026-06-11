import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardSummaryResponse } from '@/app/api/dashboard/summary/route'
import {
  buildEmptyInsights,
  buildDataFallback,
  hasTenantData,
  generateDashboardInsights,
} from '../dashboard-insights'

const emptySummary: DashboardSummaryResponse = {
  period: 'today',
  totals: {
    newLeads: 0,
    activeLeads: 0,
    hotLeads: 0,
    dealsInPipeline: 0,
    dealsWon: 0,
  },
  buyerReadiness: { averageScore: 0, hotCount: 0, warmCount: 0, coldCount: 0 },
  topHotLeads: [],
  activity: { callsToday: 0, emailsToday: 0, viewingsScheduled: 0 },
}

const smolkoSummary: DashboardSummaryResponse = {
  period: 'today',
  totals: {
    newLeads: 2,
    activeLeads: 12,
    hotLeads: 3,
    dealsInPipeline: 0,
    dealsWon: 0,
  },
  buyerReadiness: { averageScore: 72, hotCount: 3, warmCount: 5, coldCount: 4 },
  topHotLeads: [
    {
      id: 'lead-1',
      name: 'Ján Novák',
      segment: 'buyer',
      readinessScore: 88,
      lastActivityAt: '2026-06-02T10:00:00Z',
      propertyInterestSummary: '3-izbový byt, Bratislava, 250k €',
    },
    {
      id: 'lead-2',
      name: 'Mária Kováčová',
      segment: 'buyer',
      readinessScore: 75,
      lastActivityAt: '2026-06-01T14:00:00Z',
      propertyInterestSummary: 'Rodinný dom, Trnava',
    },
  ],
  activity: { callsToday: 1, emailsToday: 2, viewingsScheduled: 0 },
}

vi.mock('../claude', async importOriginal => {
  const actual = await importOriginal<typeof import('../claude')>()
  return {
    ...actual,
    callClaude: vi.fn(),
    extractJson: vi.fn((text: string) => JSON.parse(text)),
  }
})

import { callClaude } from '../claude'

describe('dashboard-insights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('hasTenantData returns false for empty tenant', () => {
    expect(hasTenantData(emptySummary)).toBe(false)
  })

  it('hasTenantData returns true when leads exist', () => {
    expect(hasTenantData(smolkoSummary)).toBe(true)
  })

  it('buildEmptyInsights returns honest empty state without fake actions', () => {
    const result = buildEmptyInsights('Test Maklér')
    expect(result.actions).toHaveLength(0)
    expect(result.headline).toContain('Test Maklér')
    expect(result.summary).toMatch(/lead|nehnuteľnost/i)
    expect(result.summary).not.toMatch(/Prešov|Košic|150–250k|80 %/)
  })

  it('buildDataFallback uses real lead names from summary', () => {
    const result = buildDataFallback({
      period: 'today',
      summary: smolkoSummary,
      userName: 'Peter',
    })
    expect(result.headline).toContain('Ján Novák')
    expect(result.actions[0].relatedLeadIds).toContain('lead-1')
    expect(result.actions[0].title).toContain('Ján Novák')
    expect(result.summary).not.toMatch(/Prešov|Košic|150–250k|80 %/)
  })

  it('generateDashboardInsights returns empty state without LLM for empty tenant', async () => {
    const result = await generateDashboardInsights({
      period: 'today',
      summary: emptySummary,
      userName: 'Nový tenant',
    })
    expect(result.insights.actions).toHaveLength(0)
    expect(result.audit.source).toBe('empty')
    expect(result.insights.headline).toContain('Nový tenant')
    expect(callClaude).not.toHaveBeenCalled()
  })

  it('generateDashboardInsights uses LLM path when mock succeeds', async () => {
    vi.mocked(callClaude).mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          headline: 'LLM priorita: Ján Novák',
          summary: 'Konkrétny LLM súhrn z dát.',
          actions: [{
            title: 'Zavolaj Jánovi',
            description: 'Horúci lead podľa dát.',
            recommendedChannel: 'call',
            relatedLeadIds: ['lead-1'],
            impact: 'high',
          }],
        }),
      }],
      usage: { input_tokens: 500, output_tokens: 120 },
    } as never)

    const result = await generateDashboardInsights({
      period: 'today',
      summary: smolkoSummary,
      userName: 'Peter',
    })

    expect(callClaude).toHaveBeenCalledOnce()
    expect(result.audit.source).toBe('llm')
    expect(result.audit.costEur).toBeGreaterThan(0)
    expect(result.insights.headline).toContain('Ján Novák')
  })

  it('generateDashboardInsights falls back when LLM rejects', async () => {
    vi.mocked(callClaude).mockRejectedValue(new Error('API down'))

    const result = await generateDashboardInsights({
      period: 'today',
      summary: smolkoSummary,
      userName: 'Peter',
    })

    expect(result.audit.source).toBe('fallback')
    expect(result.audit.costEur).toBeNull()
    expect(result.insights.headline).toContain('Ján Novák')
    expect(result.insights.summary).not.toMatch(/Prešov|Košic|150–250k|80 %/)
  })
})
