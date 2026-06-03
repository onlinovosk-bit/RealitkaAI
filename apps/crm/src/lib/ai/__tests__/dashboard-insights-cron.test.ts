import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { DashboardSummaryResponse } from '@/app/api/dashboard/summary/route'
import {
  buildEmptyInsights,
  buildDataFallback,
  hasTenantData,
  generateDashboardInsights,
} from '../dashboard-insights'
import {
  generateAndCacheAgencyInsights,
  listActiveAgencyIds,
} from '../dashboard-insights-cron'
import {
  DASHBOARD_INSIGHTS_OVERDUE_FOLLOWUP_DAYS,
  overdueFollowupCutoffIso,
} from '../dashboard-insights-gather'

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

const AGENCY_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

function mockAdminForCache(overrides: {
  summary?: DashboardSummaryResponse
  agencyName?: string
  upsertError?: string | null
}) {
  const summary = overrides.summary ?? smolkoSummary
  const upsert = vi.fn().mockResolvedValue({ error: overrides.upsertError ? { message: overrides.upsertError } : null })

  const chain = (result: unknown) => ({
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: overrides.agencyName ? { name: overrides.agencyName } : { name: 'Reality Smolko' }, error: null }),
    select: vi.fn().mockReturnThis(),
    then: undefined,
  })

  const from = vi.fn((table: string) => {
    if (table === 'agencies') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { name: overrides.agencyName ?? 'Reality Smolko' },
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'dashboard_insights_cache') {
      return { upsert }
    }
    if (table === 'leads') {
      return {
        select: vi.fn().mockImplementation((_cols: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.head) {
            return {
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({ count: summary.totals.newLeads, error: null }),
                neq: vi.fn().mockResolvedValue({ count: summary.totals.activeLeads, error: null }),
              }),
              neq: vi.fn().mockResolvedValue({ count: summary.totals.activeLeads, error: null }),
            }
          }
          const leadRows = summary.topHotLeads.map(l => ({
            id: l.id,
            name: l.name,
            property_type: 'byt',
            location: 'BA',
            budget: '250k',
            last_contact_at: l.lastActivityAt,
            created_at: l.lastActivityAt,
            score: l.readinessScore,
          }))
          const chain = {
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: leadRows, error: null }),
          }
          return chain
        }),
      }
    }
    if (table === 'lead_scores') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: summary.totals.hotLeads > 0 ? [{ bri_score: 88 }, { bri_score: 75 }] : [],
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      }
    }
    if (table === 'properties') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }
    }
    if (table === 'events') {
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        }),
      }
    }
    return chain(null)
  })

  return { from, upsert }
}

vi.mock('@/lib/ai/dashboard-insights', async importOriginal => {
  const actual = await importOriginal<typeof import('../dashboard-insights')>()
  return {
    ...actual,
    generateDashboardInsights: vi.fn(async (input: Parameters<typeof actual.generateDashboardInsights>[0]) => {
      if (!actual.hasTenantData(input.summary)) {
        return actual.buildEmptyInsights(input.userName)
      }
      return actual.buildDataFallback(input)
    }),
  }
})

vi.mock('@/lib/ai-action-audit', () => ({
  logAiActionAudit: vi.fn().mockResolvedValue(undefined),
}))

describe('dashboard-insights generator (cron path)', () => {
  it('hasTenantData returns false for empty tenant', () => {
    expect(hasTenantData(emptySummary)).toBe(false)
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
    expect(result.summary).not.toMatch(/Prešov|Košic|150–250k|80 %/)
  })

  it('generateDashboardInsights returns empty state without LLM for empty tenant', async () => {
    const result = await generateDashboardInsights({
      period: 'today',
      summary: emptySummary,
      userName: 'Nový tenant',
    })
    expect(result.actions).toHaveLength(0)
    expect(result.headline).toContain('Nový tenant')
  })
})

describe('dashboard-insights-cron cache writer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses shared overdue follow-up threshold constant', () => {
    expect(DASHBOARD_INSIGHTS_OVERDUE_FOLLOWUP_DAYS).toBe(3)
    const cutoff = overdueFollowupCutoffIso()
    const expected = new Date()
    expected.setDate(expected.getDate() - DASHBOARD_INSIGHTS_OVERDUE_FOLLOWUP_DAYS)
    expected.setHours(0, 0, 0, 0)
    expect(cutoff).toBe(expected.toISOString())
  })

  it('listActiveAgencyIds returns active agency ids', async () => {
    const admin = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: AGENCY_ID }],
            error: null,
          }),
        }),
      }),
    }
    const ids = await listActiveAgencyIds(admin as never)
    expect(ids).toEqual([AGENCY_ID])
  })

  it('generateAndCacheAgencyInsights upserts payload for tenant with data', async () => {
    const { from, upsert } = mockAdminForCache({ summary: smolkoSummary })
    const result = await generateAndCacheAgencyInsights({ from } as never, AGENCY_ID)
    expect(result.ok).toBe(true)
    expect(result.empty).toBe(false)
    expect(upsert).toHaveBeenCalledOnce()
    const row = upsert.mock.calls[0][0]
    expect(row.agency_id).toBe(AGENCY_ID)
    expect(row.payload.headline).toBeTruthy()
    expect(row.payload.actions.length).toBeGreaterThan(0)
  })

  it('generateAndCacheAgencyInsights marks empty agency honestly', async () => {
    const { from, upsert } = mockAdminForCache({ summary: emptySummary })
    const result = await generateAndCacheAgencyInsights({ from } as never, AGENCY_ID)
    expect(result.ok).toBe(true)
    expect(result.empty).toBe(true)
    expect(upsert.mock.calls[0][0].payload.actions).toHaveLength(0)
  })
})

describe('dashboard insights reader route', () => {
  it('does not call LLM or hardcode demo insights in route source', () => {
    const routePath = join(
      process.cwd(),
      'src/app/api/dashboard/insights/route.ts',
    )
    const source = readFileSync(routePath, 'utf8')
    expect(source).not.toContain('generateDashboardInsights')
    expect(source).not.toContain('slice(0, 3)')
    expect(source).not.toContain('slice(0,3)')
    expect(source).not.toMatch(/Prešov|Košic|150–250k|80 %/)
    expect(source).toContain('dashboard_insights_cache')
  })
})
