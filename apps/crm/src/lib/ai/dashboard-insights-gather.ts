import type { SupabaseClient } from '@supabase/supabase-js'
import type { DashboardSummaryResponse } from '@/app/api/dashboard/summary/route'

/** Hot lead with no contact longer than this → overdue follow-up priority in insights. */
export const DASHBOARD_INSIGHTS_OVERDUE_FOLLOWUP_DAYS = 3

export const DASHBOARD_INSIGHTS_HOT_SCORE_MIN = 70

export function overdueFollowupCutoffIso(
  days = DASHBOARD_INSIGHTS_OVERDUE_FOLLOWUP_DAYS,
): string {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  cutoff.setHours(0, 0, 0, 0)
  return cutoff.toISOString()
}

type LeadRow = {
  id: string
  name: string
  property_type: string | null
  location: string | null
  budget: string | null
  last_contact_at: string | null
  created_at: string
  score: number | null
}

function mapLeadRow(l: LeadRow) {
  return {
    id: l.id,
    name: l.name,
    segment: 'buyer' as const,
    readinessScore: Number(l.score ?? 0),
    lastActivityAt: (l.last_contact_at ?? l.created_at) as string,
    propertyInterestSummary:
      [l.property_type, l.location, l.budget].filter(Boolean).join(', ') || undefined,
  }
}

function mergeTopHotLeads(overdueRows: LeadRow[], topRows: LeadRow[]) {
  const seen = new Set<string>()
  const merged: ReturnType<typeof mapLeadRow>[] = []
  for (const row of [...overdueRows, ...topRows]) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    merged.push(mapLeadRow(row))
    if (merged.length >= 10) break
  }
  return merged
}

export async function gatherAgencyDashboardSummary(
  admin: SupabaseClient,
  agencyId: string,
): Promise<DashboardSummaryResponse> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayISO = todayStart.toISOString()
  const overdueCutoff = overdueFollowupCutoffIso()

  const [
    { count: newLeads },
    { count: activeLeads },
    { data: hotLeadsData },
    { data: overdueHotLeads },
    { data: topLeads },
    { data: profiles },
  ] = await Promise.all([
    admin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .gte('created_at', todayISO),
    admin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .neq('status', 'Archivovaný'),
    admin
      .from('lead_scores')
      .select('bri_score')
      .eq('agency_id', agencyId)
      .gte('bri_score', DASHBOARD_INSIGHTS_HOT_SCORE_MIN),
    admin
      .from('leads')
      .select('id, name, property_type, location, budget, last_contact_at, created_at, score')
      .eq('agency_id', agencyId)
      .gte('score', DASHBOARD_INSIGHTS_HOT_SCORE_MIN)
      .neq('status', 'Archivovaný')
      .or(`last_contact_at.is.null,last_contact_at.lt.${overdueCutoff}`)
      .order('score', { ascending: false })
      .limit(10),
    admin
      .from('leads')
      .select('id, name, property_type, location, budget, last_contact_at, created_at, score')
      .eq('agency_id', agencyId)
      .order('score', { ascending: false })
      .limit(10),
    admin.from('profiles').select('id').eq('agency_id', agencyId).eq('is_active', true),
  ])

  const profileIds = (profiles ?? []).map(p => String(p.id))
  let callsToday = 0
  let emailsToday = 0

  if (profileIds.length > 0) {
    const [{ count: calls }, { count: emails }] = await Promise.all([
      admin
        .from('events')
        .select('id', { count: 'exact', head: true })
        .in('profile_id', profileIds)
        .eq('event_type', 'call_completed')
        .gte('created_at', todayISO),
      admin
        .from('events')
        .select('id', { count: 'exact', head: true })
        .in('profile_id', profileIds)
        .eq('event_type', 'message_sent')
        .gte('created_at', todayISO),
    ])
    callsToday = calls ?? 0
    emailsToday = emails ?? 0
  }

  const scores = (hotLeadsData ?? []).map(r => r.bri_score as number)
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const hotCnt = scores.filter(s => s >= 70).length
  const warmCnt = scores.filter(s => s >= 40 && s < 70).length
  const coldCnt = scores.filter(s => s < 40).length

  const topHotLeads = mergeTopHotLeads(
    (overdueHotLeads ?? []) as LeadRow[],
    (topLeads ?? []) as LeadRow[],
  )

  return {
    period: 'today',
    totals: {
      newLeads: newLeads ?? 0,
      activeLeads: activeLeads ?? 0,
      hotLeads: hotCnt,
      dealsInPipeline: 0,
      dealsWon: 0,
    },
    buyerReadiness: {
      averageScore: avg,
      hotCount: hotCnt,
      warmCount: warmCnt,
      coldCount: coldCnt,
    },
    topHotLeads,
    activity: {
      callsToday,
      emailsToday,
      viewingsScheduled: 0,
    },
  }
}

export async function gatherAgencyProperties(
  admin: SupabaseClient,
  agencyId: string,
) {
  const { data } = await admin
    .from('properties')
    .select('id, title, location, price, status')
    .eq('agency_id', agencyId)
    .neq('status', 'Archivovaná')
    .order('created_at', { ascending: false })
    .limit(5)

  return (data ?? []).map(p => ({
    id: p.id as string,
    title: p.title as string,
    location: (p.location as string) ?? '',
    price: (p.price as number) ?? 0,
    status: (p.status as string) ?? '',
  }))
}
