import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DashboardSummaryResponse } from '@/app/api/dashboard/summary/route'

const mockCallClaude = vi.hoisted(() => vi.fn())

vi.mock('../claude', () => ({
  CLAUDE_HAIKU: 'claude-haiku-4-5-20251001',
  CLAUDE_SONNET: 'claude-sonnet-4-6',
  callClaude: (...a: unknown[]) => mockCallClaude(...a),
  extractJson: (t: string) => JSON.parse(t),
}))

import {
  DASHBOARD_LLM_TIMEOUT_MS,
  generateDashboardInsights,
} from '../dashboard-insights'
import { INSIGHTS_AI_TIMEOUT_MS, INSIGHTS_LLM_TIMEOUT_MS } from '../dashboard-insights-cron'

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

const okResponse = {
  content: [
    {
      type: 'text',
      text: JSON.stringify({ headline: 'H', summary: 'S', actions: [], notesForOwner: '' }),
    },
  ],
  usage: { input_tokens: 10, output_tokens: 10 },
}

/** Model odpovie až po `ms` (na fake timeroch). */
function modelAnswersAfter(ms: number) {
  mockCallClaude.mockImplementation(
    () => new Promise((resolve) => setTimeout(() => resolve(okResponse), ms)),
  )
}

describe('generateDashboardInsights — okno na odpoveď modelu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('odpoveď po 1,5 s sa prijme (pôvodných 800 ms by skončilo timeoutom)', async () => {
    modelAnswersAfter(1500)
    const promise = generateDashboardInsights(input)
    await vi.advanceTimersByTimeAsync(1500)
    const res = await promise

    expect(res.audit.source).toBe('llm')
    expect(res.audit.failure).toBeUndefined()
  })

  it('odpoveď po 5 s sa s predvoleným oknom ešte prijme; po jeho vypršaní je to timeout s dôvodom', async () => {
    modelAnswersAfter(5000)
    const fast = generateDashboardInsights(input)
    await vi.advanceTimersByTimeAsync(5000)
    expect((await fast).audit.source).toBe('llm')

    modelAnswersAfter(DASHBOARD_LLM_TIMEOUT_MS + 1000)
    const slow = generateDashboardInsights(input)
    await vi.advanceTimersByTimeAsync(DASHBOARD_LLM_TIMEOUT_MS)
    const res = await slow
    expect(res.audit.source).toBe('fallback')
    expect(res.audit.failure).toMatchObject({ reason: 'timeout' })
  })

  it('vlastné okno volajúceho sa rešpektuje (kratšie aj dlhšie než predvolené)', async () => {
    modelAnswersAfter(2000)
    const tooShort = generateDashboardInsights(input, { timeoutMs: 1000 })
    await vi.advanceTimersByTimeAsync(1000)
    expect((await tooShort).audit).toMatchObject({ source: 'fallback', failure: { reason: 'timeout' } })

    modelAnswersAfter(9000)
    const longer = generateDashboardInsights(input, { timeoutMs: 10_000 })
    await vi.advanceTimersByTimeAsync(9000)
    expect((await longer).audit.source).toBe('llm')
  })

  it('po skončení nezostane visieť žiadny časovač (okno sa uvoľní)', async () => {
    modelAnswersAfter(100)
    const p = generateDashboardInsights(input)
    await vi.advanceTimersByTimeAsync(100)
    await p
    expect(vi.getTimerCount()).toBe(0)
  })

  it('predvolené okno nesmie klesnúť k pôvodným 800 ms', () => {
    expect(DASHBOARD_LLM_TIMEOUT_MS).toBeGreaterThanOrEqual(3000)
  })
})

describe('cron — okno modelu musí byť kratšie než vonkajšie', () => {
  it('INSIGHTS_LLM_TIMEOUT_MS < INSIGHTS_AI_TIMEOUT_MS, aby zlyhanie nieslo dôvod', () => {
    expect(INSIGHTS_LLM_TIMEOUT_MS).toBeLessThan(INSIGHTS_AI_TIMEOUT_MS)
    expect(INSIGHTS_LLM_TIMEOUT_MS).toBeGreaterThanOrEqual(2500)
  })

  it('okno je dosť dlhé na volania po 6–8 s (merané 1. 10.: 6,4 s a 7,5 s)', () => {
    expect(INSIGHTS_LLM_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000)
  })

  it('3 dávky (do 9 agentúr) v najhoršom prípade stihnú maxDuration (zber dát ~5 s + okno)', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/app/api/cron/dashboard-insights/route.ts'),
      'utf8',
    )
    const maxDuration = Number(source.match(/export const maxDuration\s*=\s*(\d+)/)![1])
    const gatherMs = 5_000
    const batches = 3
    expect((INSIGHTS_AI_TIMEOUT_MS + gatherMs) * batches).toBeLessThanOrEqual(maxDuration * 1000)
  })

  it('route exportuje maxDuration, ktoré pokryje 2 dávky s dlhým oknom (>= 30 s)', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/app/api/cron/dashboard-insights/route.ts'),
      'utf8',
    )
    const m = source.match(/export const maxDuration\s*=\s*(\d+)/)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(30)
  })
})
