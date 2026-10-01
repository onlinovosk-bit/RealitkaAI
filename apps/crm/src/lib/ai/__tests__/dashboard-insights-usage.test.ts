import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardSummaryResponse } from '@/app/api/dashboard/summary/route'

const mockCallClaude = vi.hoisted(() => vi.fn())

vi.mock('../claude', () => ({
  CLAUDE_HAIKU: 'claude-haiku-4-5-20251001',
  CLAUDE_SONNET: 'claude-sonnet-4-6',
  callClaude: (...a: unknown[]) => mockCallClaude(...a),
  extractJson: (t: string) => JSON.parse(t),
}))

import { DASHBOARD_LLM_MAX_TOKENS, generateDashboardInsights } from '../dashboard-insights'

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

const goodJson = JSON.stringify({ headline: 'H', summary: 'S', actions: [], notesForOwner: '' })

function reply(text: string, stop_reason: string | null, output_tokens: number) {
  return { content: [{ type: 'text', text }], stop_reason, usage: { input_tokens: 420, output_tokens } }
}

describe('generateDashboardInsights — čo model skutočne vrátil (usage)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('úspech: audit nesie stop_reason a počty tokenov', async () => {
    mockCallClaude.mockResolvedValue(reply(goodJson, 'end_turn', 310))
    const res = await generateDashboardInsights(input)

    expect(res.audit.source).toBe('llm')
    expect(res.audit.usage).toEqual({ stopReason: 'end_turn', inputTokens: 420, outputTokens: 310 })
  })

  it('bad_output po orezaní na max_tokens: usage prežije a odlíši orezanie od zlého JSON', async () => {
    const truncated = goodJson.slice(0, goodJson.length - 15) // nedokončený JSON
    mockCallClaude.mockResolvedValue(reply(truncated, 'max_tokens', DASHBOARD_LLM_MAX_TOKENS))
    const res = await generateDashboardInsights(input)

    expect(res.audit.source).toBe('fallback')
    expect(res.audit.failure).toMatchObject({ reason: 'bad_output' })
    expect(res.audit.usage).toEqual({
      stopReason: 'max_tokens',
      inputTokens: 420,
      outputTokens: DASHBOARD_LLM_MAX_TOKENS,
    })
  })

  it('bad_output so zlým JSON, ale dokončenou odpoveďou: stop_reason end_turn', async () => {
    mockCallClaude.mockResolvedValue(reply('Tu je analýza: žiadny JSON', 'end_turn', 40))
    const res = await generateDashboardInsights(input)

    expect(res.audit.failure).toMatchObject({ reason: 'bad_output' })
    expect(res.audit.usage?.stopReason).toBe('end_turn')
  })

  it('odmietnuté volanie (model neodpovedal): usage je null', async () => {
    mockCallClaude.mockRejectedValue(Object.assign(new Error('x'), { status: 529 }))
    const res = await generateDashboardInsights(input)

    expect(res.audit.source).toBe('fallback')
    expect(res.audit.usage).toBeNull()
  })

  it('do auditu sa nedostane text výstupu ani meno leadu', async () => {
    mockCallClaude.mockResolvedValue(
      reply('{"headline":"Ján Novák chce byt", broken', 'max_tokens', 1000),
    )
    const res = await generateDashboardInsights(input)

    const serialized = JSON.stringify(res.audit)
    expect(serialized).not.toContain('Ján')
    expect(serialized).not.toContain('Novák')
  })

  it('volanie modelu dostane strop výstupu z konštanty (>= 1000 tokenov)', async () => {
    mockCallClaude.mockResolvedValue(reply(goodJson, 'end_turn', 300))
    await generateDashboardInsights(input)

    expect(DASHBOARD_LLM_MAX_TOKENS).toBeGreaterThanOrEqual(1000)
    expect(mockCallClaude.mock.calls[0][0]).toMatchObject({ max_tokens: DASHBOARD_LLM_MAX_TOKENS })
  })
})
