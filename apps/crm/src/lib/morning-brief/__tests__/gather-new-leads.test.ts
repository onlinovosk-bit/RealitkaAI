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
  not: string[]
  is: string[]
  in: string[]
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
  contactedCount?: number
  staleCount?: number
  staleQueryFails?: boolean
  pendingCount?: number
  pendingQueryFails?: boolean
  hotPendingCount?: number
  hotPendingQueryFails?: boolean
  pipeline?: { budget: string; status: string }[]
  priority?: { name: string; ai_priority: string; score: number; last_contact: string }[]
  events?: { event_type: string; entity_id?: string | null; payload?: unknown; created_at?: string }[]
}) {
  const recorded: Recorded[] = []

  const client = {
    from(table: string) {
      const entry: Recorded = { table, columns: '', filters: {}, or: [], not: [], is: [], in: [] }
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
          // Two staleness queries now: the denominator ("does anyone carry a
          // contact timestamp at all") and the count itself. They are told
          // apart by the lt: filter, not by call order.
          const touchesLastContactAt = entry.not.some((n) => n.startsWith('last_contact_at.'))
          if (touchesLastContactAt) {
            if (opts.staleQueryFails) {
              return { data: null, count: null, error: { message: 'PostgREST said no' } }
            }
            if ('lt:last_contact_at' in entry.filters) {
              return { data: null, count: opts.staleCount ?? 0, error: null }
            }
            return { data: null, count: opts.contactedCount ?? 0, error: null }
          }
          // "No recorded contact" queries, told apart by the `is` filter. The
          // hot one additionally narrows by lead id, which is what separates
          // it from the whole-book pending count.
          if (entry.is.includes('last_contact_at.null')) {
            if (entry.in.some((f) => f.startsWith('id.'))) {
              if (opts.hotPendingQueryFails) {
                return { data: null, count: null, error: { message: 'PostgREST said no' } }
              }
              return { data: null, count: opts.hotPendingCount ?? 0, error: null }
            }
            if (opts.pendingQueryFails) {
              return { data: null, count: null, error: { message: 'PostgREST said no' } }
            }
            return { data: null, count: opts.pendingCount ?? 0, error: null }
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
        in: (col: string, vals: unknown) => {
          entry.in.push(`${col}.${Array.isArray(vals) ? vals.join(',') : String(vals)}`)
          return builder
        },
        order: chain,
        limit: chain,
        is: (col: string, val: unknown) => {
          entry.is.push(`${col}.${String(val)}`)
          return builder
        },
        not: (col: string, op: string, val: unknown) => {
          entry.not.push(`${col}.${op}.${String(val)}`)
          return builder
        },
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
    // active count, pipeline rows, priority rows, contacted denominator,
    // stale count, pending-contact count
    expect(scoped).toHaveLength(6)
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

  it('measures staleness on last_contact_at, never on the free-text last_contact', async () => {
    const { client, recorded } = makeClient({ newLeadCount: 0, contactedCount: 12, staleCount: 7 })
    mockCreateAdmin.mockReturnValue(client)

    const data = await gatherBriefData(PROFILE)

    const staleQuery = leadsQueries(recorded).find((r) => 'lt:last_contact_at' in r.filters)
    expect(staleQuery, 'no staleness query was issued').toBeDefined()
    // The free-text column must not be compared against a timestamp cutoff.
    expect(staleQuery?.filters).not.toHaveProperty('lt:last_contact')
    expect(data?.stats.staleContacts48h).toBe(7)
  })

  it('reports null, not 0, when no lead carries a contact timestamp', async () => {
    // Production today: last_contact_at is NULL on all 511 rows. The shape that
    // shipped in #727 answered this case with the broker's entire book —
    // measured 142/142, 72/72, 66/66, 47/47, 39/39 for the five largest
    // assignees — because `last_contact_at IS NULL` sat inside the staleness
    // test. Zero would be the opposite lie. Only null is true.
    const { client } = makeClient({ newLeadCount: 0, contactedCount: 0, staleCount: 40 })
    mockCreateAdmin.mockReturnValue(client)

    const data = await gatherBriefData(PROFILE)

    expect(data?.stats.staleContacts48h).toBeNull()
  })

  it('never counts a lead nobody has contacted as one that went quiet', async () => {
    const { client, recorded } = makeClient({ newLeadCount: 0, contactedCount: 12, staleCount: 7 })
    mockCreateAdmin.mockReturnValue(client)

    await gatherBriefData(PROFILE)

    // "no one ever called them" belongs to pendingContact, not to staleness.
    for (const q of leadsQueries(recorded)) {
      expect(
        q.or.join('|'),
        'staleness must not admit rows via last_contact_at IS NULL',
      ).not.toContain('last_contact_at.is.null')
    }
    const staleQuery = leadsQueries(recorded).find((r) => 'lt:last_contact_at' in r.filters)
    expect(staleQuery?.not.some((n) => n === 'last_contact_at.is.null')).toBe(true)
  })

  it('reports null, not 0, when the staleness query errors', async () => {
    // `?? 0` on a rejected query is the exact bug #727 had to undo on four
    // other counts. A failure must stay unknown.
    const { client } = makeClient({ newLeadCount: 0, staleQueryFails: true })
    mockCreateAdmin.mockReturnValue(client)

    const data = await gatherBriefData(PROFILE)

    expect(data?.stats.staleContacts48h).toBeNull()
  })

  it('starts reporting on its own once a contact timestamp exists', async () => {
    // No further code change should be needed the day something begins writing
    // last_contact_at.
    const { client } = makeClient({ newLeadCount: 0, contactedCount: 1, staleCount: 0 })
    mockCreateAdmin.mockReturnValue(client)

    const data = await gatherBriefData(PROFILE)

    expect(data?.stats.staleContacts48h).toBe(0)
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

// ================================================================
// "Čakajú na kontakt" was the broker's whole active book
//
// `pendingContact = activeLeads ?? 0` — a restatement of the row count wearing
// the name of a measurement. The brief's headline action read "Máte N leadov
// čakajúcich na kontakt" with N == every active lead the broker owns, on every
// day, whatever had actually happened. Measured on production 2026-10-02: all
// five largest assignees had active == pendingContact exactly (142, 72, 66,
// 47, 39). Third instance of this class after staleContacts48h (#735) and
// last_contact_at itself (#800).
//
// Every test below fails against the implementation that shipped before it.
// ================================================================
describe('morning brief — pendingContact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetHotLeads.mockResolvedValue([])
  })

  it('is never the active-lead count', async () => {
    // The whole defect in one assertion: a broker with 142 active leads of
    // which 11 carry no recorded contact must not be told 142 are waiting.
    const { client } = makeClient({
      newLeadCount: 0,
      activeCount: 142,
      contactedCount: 131,
      pendingCount: 11,
    })
    mockCreateAdmin.mockReturnValue(client)

    const data = await gatherBriefData(PROFILE)

    expect(data?.stats.activeLeads).toBe(142)
    expect(data?.stats.pendingContact).toBe(11)
    expect(data?.stats.pendingContact).not.toBe(data?.stats.activeLeads)
  })

  it('counts active leads with no recorded contact, excluding closed and lost', async () => {
    const { client, recorded } = makeClient({
      newLeadCount: 0,
      contactedCount: 5,
      pendingCount: 3,
    })
    mockCreateAdmin.mockReturnValue(client)

    const data = await gatherBriefData(PROFILE)

    expect(data?.stats.pendingContact).toBe(3)
    const pendingQuery = leadsQueries(recorded).find(
      (r) => r.is.includes('last_contact_at.null') && !r.in.some((f) => f.startsWith('id.')),
    )
    expect(pendingQuery, 'no query asks for active leads without a contact stamp').toBeDefined()
    expect(pendingQuery?.filters).toHaveProperty('eq:assigned_profile_id', PROFILE)
  })

  it('is null while the broker has no recorded contact at all', async () => {
    // Today's production state. "Nobody contacted them" cannot be told apart
    // from "we do not record contacts", so there is no honest number — and
    // rendering the row count would claim 100% again.
    const { client } = makeClient({
      newLeadCount: 0,
      activeCount: 142,
      contactedCount: 0,
      pendingCount: 142,
    })
    mockCreateAdmin.mockReturnValue(client)

    const data = await gatherBriefData(PROFILE)

    expect(data?.stats.pendingContact).toBeNull()
  })

  it('is null when the count query fails, never zero', async () => {
    // `?? 0` on a rejected query is the bug #724 left behind on four counts.
    const { client } = makeClient({
      newLeadCount: 0,
      contactedCount: 9,
      pendingQueryFails: true,
    })
    mockCreateAdmin.mockReturnValue(client)

    const data = await gatherBriefData(PROFILE)

    expect(data?.stats.pendingContact).toBeNull()
  })

  it('reports hotPending as the hot leads with no recorded contact', async () => {
    // Was hotLeads.length — a duplicate of stats.hotLeads printed as
    // "(z toho HOT: N)", which asserted it was the hot subset of those waiting.
    mockGetHotLeads.mockResolvedValue([
      { lead_id: 'aaaaaaaa-0000-0000-0000-000000000001', bri_score: 90, full_name: 'A', phone: null },
      { lead_id: 'aaaaaaaa-0000-0000-0000-000000000002', bri_score: 80, full_name: 'B', phone: null },
      { lead_id: 'aaaaaaaa-0000-0000-0000-000000000003', bri_score: 70, full_name: 'C', phone: null },
    ])
    const { client, recorded } = makeClient({
      newLeadCount: 0,
      contactedCount: 20,
      pendingCount: 4,
      hotPendingCount: 1,
    })
    mockCreateAdmin.mockReturnValue(client)

    const data = await gatherBriefData(PROFILE)

    expect(data?.stats.hotLeads).toBe(3)
    expect(data?.stats.hotPending).toBe(1)
    const hotQuery = leadsQueries(recorded).find(
      (r) => r.is.includes('last_contact_at.null') && r.in.some((f) => f.startsWith('id.')),
    )
    expect(hotQuery, 'hotPending was not measured against the hot lead ids').toBeDefined()
  })

  it('does not query for hot pending when there are no hot leads', async () => {
    const { client, recorded } = makeClient({
      newLeadCount: 0,
      contactedCount: 20,
      pendingCount: 4,
    })
    mockCreateAdmin.mockReturnValue(client)

    const data = await gatherBriefData(PROFILE)

    expect(data?.stats.hotPending).toBe(0)
    expect(
      leadsQueries(recorded).filter((r) => r.in.some((f) => f.startsWith('id.'))),
    ).toHaveLength(0)
  })

  it('is null for hotPending too while no contact trail exists', async () => {
    mockGetHotLeads.mockResolvedValue([
      { lead_id: 'aaaaaaaa-0000-0000-0000-000000000001', bri_score: 90, full_name: 'A', phone: null },
    ])
    const { client } = makeClient({ newLeadCount: 0, contactedCount: 0 })
    mockCreateAdmin.mockReturnValue(client)

    const data = await gatherBriefData(PROFILE)

    expect(data?.stats.hotPending).toBeNull()
    expect(data?.stats.hotLeads).toBe(1)
  })
})
