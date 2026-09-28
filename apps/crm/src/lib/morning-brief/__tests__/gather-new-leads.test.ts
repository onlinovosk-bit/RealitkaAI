// ================================================================
// Revolis.AI — morning brief reads columns that actually exist
//
// Two regressions guarded here, both found by EVENTS-PIPELINE-AUDIT (#724):
//
//  1. "Nové dopyty" was counted out of `events`, a table that has never held a
//     single row in production, so it read 0 on every day — including days when
//     leads really did arrive.
//  2. The four stats queries filtered on `leads.profile_id` and selected
//     `leads.full_name`. Neither column exists, PostgREST rejected them, the
//     errors were discarded and `?? 0` turned each rejection into a zero.
//
// Every test below fails against the implementation that shipped before it.
// ================================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateAdmin = vi.fn()
const mockGetHotLeads = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockCreateAdmin(),
}))

vi.mock('@/lib/bri/engine', () => ({
  getHotLeads: (...args: unknown[]) => mockGetHotLeads(...args),
}))

import { gatherBriefData } from '../gather'

const AGENCY = '11111111-1111-1111-1111-111111111111'
const PROFILE = '22222222-2222-2222-2222-222222222222'

type Filters = Record<string, unknown>
interface Recorded {
  table: string
  columns: string
  filters: Filters
  or: string[]
}

/**
 * Minimal chainable Supabase double.
 *
 * `leads` answers by the shape of the query rather than by call order, so the
 * assertions survive any reordering inside gatherBriefData.
 */
function makeClient(opts: {
  newLeadCount: number
  activeCount?: number
  staleCount?: number
  pipeline?: { budget: string; status: string }[]
  priority?: { name: string; ai_priority: string; score: number; last_contact: string }[]
  events?: { event_type: string; entity_id?: string | null; payload?: unknown; created_at?: string }[]
}) {
  const recorded: Recorded[] = []

  const client = {
    from(table: string) {
      const entry: Recorded = { table, columns: '', filters: {}, or: [] }
      recorded.push(entry)

      const resolve = (): Record<string, unknown> => {
        if (table === 'profiles') {
          return {
            data: { full_name: 'Test Maklér', email: 'test@example.com', agency_id: AGENCY },
            error: null,
          }
        }
        if (table === 'morning_brief_settings') {
          return {
            data: {
              profile_id: PROFILE,
              lead_count: 5,
              include_lv_changes: true,
              include_arbitrage: true,
              include_price_drops: true,
            },
            error: null,
          }
        }
        if (table === 'events') {
          return { data: opts.events ?? [], error: null }
        }
        if (table === 'leads') {
          // Overnight count: the only leads query bounded by created_at >= since.
          if ('gte:created_at' in entry.filters) {
            return { data: null, count: opts.newLeadCount, error: null }
          }
          if (entry.or.length > 0) {
            return { data: null, count: opts.staleCount ?? 0, error: null }
          }
          if (entry.columns.includes('budget')) {
            return { data: opts.pipeline ?? [], error: null }
          }
          if (entry.columns.includes('ai_priority')) {
            return { data: opts.priority ?? [], error: null }
          }
          return { data: null, count: opts.activeCount ?? 0, error: null }
        }
        return { data: null, count: 0, error: null }
      }

      const builder: Record<string, unknown> = {}
      const chain = () => builder
      Object.assign(builder, {
        select: (cols?: unknown) => {
          if (typeof cols === 'string') entry.columns = cols
          return builder
        },
        neq: chain,
        in: chain,
        order: chain,
        limit: chain,
        or: (expr: string) => {
          entry.or.push(expr)
          return builder
        },
        eq: (col: string, val: unknown) => {
          entry.filters[`eq:${col}`] = val
          return builder
        },
        gte: (col: string, val: unknown) => {
          entry.filters[`gte:${col}`] = val
          return builder
        },
        lt: (col: string, val: unknown) => {
          entry.filters[`lt:${col}`] = val
          return builder
        },
        single: () => Promise.resolve(resolve()),
        then: (onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) =>
          Promise.resolve(resolve()).then(onOk, onErr),
      })
      return builder
    },
  }

  return { client, recorded }
}

const leadsQueries = (recorded: Recorded[]) => recorded.filter((r) => r.table === 'leads')

describe('morning brief — nové dopyty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetHotLeads.mockResolvedValue([])
  })

  it('counts leads from the leads table, not from events', async () => {
    const { client } = makeClient({ newLeadCount: 3, events: [] })
    mockCreateAdmin.mockReturnValue(client)

    const data = await gatherBriefData(PROFILE)

    // The old implementation read an empty `events` array and reported 0.
    expect(data?.overnight.newLeads).toBe(3)
    expect(data?.stats.newInquiries).toBe(3)
  })

  it('ignores lead_created rows in events even when some exist', async () => {
    // If `events` is ever repopulated, the brief must still report the truth
    // from `leads` instead of silently falling back to a partial mirror.
    const { client } = makeClient({
      newLeadCount: 1,
      events: [
        { event_type: 'lead_created', created_at: '2026-09-28T01:00:00.000Z' },
        { event_type: 'lead_created', created_at: '2026-09-28T02:00:00.000Z' },
      ],
    })
    mockCreateAdmin.mockReturnValue(client)

    const data = await gatherBriefData(PROFILE)

    expect(data?.overnight.newLeads).toBe(1)
  })

  it('scopes the count to the profile agency and the overnight window', async () => {
    const { client, recorded } = makeClient({ newLeadCount: 2, events: [] })
    mockCreateAdmin.mockReturnValue(client)

    await gatherBriefData(PROFILE)

    const countQuery = leadsQueries(recorded).find((r) => 'gte:created_at' in r.filters)
    expect(countQuery, 'no overnight count query was issued against leads').toBeDefined()
    expect(countQuery?.filters['eq:agency_id']).toBe(AGENCY)

    const since = new Date(String(countQuery?.filters['gte:created_at'])).getTime()
    const hoursBack = (Date.now() - since) / 3_600_000
    expect(hoursBack).toBeGreaterThan(9)
    expect(hoursBack).toBeLessThan(11)
  })

  it('reports 0 rather than throwing when the count comes back empty', async () => {
    const { client } = makeClient({ newLeadCount: 0, events: [] })
    mockCreateAdmin.mockReturnValue(client)

    const data = await gatherBriefData(PROFILE)

    expect(data?.overnight.newLeads).toBe(0)
  })
})

describe('morning brief — stats query columns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetHotLeads.mockResolvedValue([])
  })

  it('never filters leads on the non-existent profile_id column', async () => {
    const { client, recorded } = makeClient({ newLeadCount: 0 })
    mockCreateAdmin.mockReturnValue(client)

    await gatherBriefData(PROFILE)

    for (const q of leadsQueries(recorded)) {
      expect(q.filters, `leads query still filters on profile_id: ${q.columns}`).not.toHaveProperty(
        'eq:profile_id',
      )
    }
  })

  it('scopes pipeline, priority and stale counts by assigned_profile_id', async () => {
    const { client, recorded } = makeClient({ newLeadCount: 0 })
    mockCreateAdmin.mockReturnValue(client)

    await gatherBriefData(PROFILE)

    const scoped = leadsQueries(recorded).filter(
      (r) => r.filters['eq:assigned_profile_id'] === PROFILE,
    )
    // active count, pipeline rows, priority rows, stale count
    expect(scoped).toHaveLength(4)
  })

  it('selects leads.name, never the non-existent full_name', async () => {
    const { client, recorded } = makeClient({
      newLeadCount: 0,
      priority: [
        { name: 'Ján Kováč', ai_priority: 'Vysoká', score: 80, last_contact: 'Práve vytvorený' },
      ],
    })
    mockCreateAdmin.mockReturnValue(client)

    const data = await gatherBriefData(PROFILE)

    for (const q of leadsQueries(recorded)) {
      expect(q.columns).not.toContain('full_name')
    }
    expect(data?.stats.priorityLeadNames).toEqual(['Ján Kováč'])
  })

  it('measures staleness on last_contact_at and excludes leads younger than the cutoff', async () => {
    const { client, recorded } = makeClient({ newLeadCount: 0, staleCount: 7 })
    mockCreateAdmin.mockReturnValue(client)

    const data = await gatherBriefData(PROFILE)

    const staleQuery = leadsQueries(recorded).find((r) => r.or.length > 0)
    expect(staleQuery, 'no staleness query was issued').toBeDefined()
    expect(staleQuery?.or[0]).toContain('last_contact_at')
    // The free-text column must not be compared against a timestamp cutoff.
    expect(staleQuery?.or[0]).not.toMatch(/(^|[^_])last_contact\.(is|lt)/)
    expect(staleQuery?.filters).toHaveProperty('lt:created_at')

    expect(data?.stats.staleContacts48h).toBe(7)
  })

  it('sums pipeline value from the scoped rows', async () => {
    const { client } = makeClient({
      newLeadCount: 0,
      pipeline: [
        { budget: '120 000 €', status: 'Nový' },
        { budget: '80 000 €', status: 'Nový' },
        { budget: '999 000 €', status: 'lost' },
      ],
    })
    mockCreateAdmin.mockReturnValue(client)

    const data = await gatherBriefData(PROFILE)

    expect(data?.stats.pipelineValueEur).toBe(200_000)
  })
})
