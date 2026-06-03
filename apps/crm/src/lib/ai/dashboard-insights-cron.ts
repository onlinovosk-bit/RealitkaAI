import type { SupabaseClient } from '@supabase/supabase-js'
import {
  generateDashboardInsights,
  hasTenantData,
  type DashboardInsightsOutput,
} from '@/lib/ai/dashboard-insights'
import {
  gatherAgencyDashboardSummary,
  gatherAgencyProperties,
} from '@/lib/ai/dashboard-insights-gather'
import { logAiActionAudit } from '@/lib/ai-action-audit'

export type DashboardInsightsCachePayload = DashboardInsightsOutput & {
  period: 'today' | 'last_7_days'
  displayName: string
}

export async function listActiveAgencyIds(admin: SupabaseClient): Promise<string[]> {
  const { data, error } = await admin
    .from('agencies')
    .select('id')
    .eq('is_active', true)

  if (error) {
    throw new Error(`agencies list: ${error.message}`)
  }

  return (data ?? []).map(row => String(row.id))
}

export async function resolveAgencyDisplayName(
  admin: SupabaseClient,
  agencyId: string,
): Promise<string> {
  const { data: agency } = await admin
    .from('agencies')
    .select('name')
    .eq('id', agencyId)
    .maybeSingle()

  if (agency?.name) return String(agency.name)

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  return profile?.full_name ? String(profile.full_name) : 'Tím'
}

export async function generateAndCacheAgencyInsights(
  admin: SupabaseClient,
  agencyId: string,
): Promise<{ agencyId: string; ok: boolean; empty: boolean; error?: string }> {
  try {
    const displayName = await resolveAgencyDisplayName(admin, agencyId)
    const summary = await gatherAgencyDashboardSummary(admin, agencyId)
    const properties = await gatherAgencyProperties(admin, agencyId)

    const insights = await generateDashboardInsights({
      period: 'today',
      summary,
      userName: displayName,
      properties,
    })

    const payload: DashboardInsightsCachePayload = {
      ...insights,
      period: 'today',
      displayName,
    }

    const generatedAt = new Date().toISOString()
    const { error: upsertErr } = await admin.from('dashboard_insights_cache').upsert({
      agency_id: agencyId,
      payload,
      generated_at: generatedAt,
    })

    if (upsertErr) {
      return { agencyId, ok: false, empty: false, error: upsertErr.message }
    }

    await logAiActionAudit({
      agencyId,
      leadId: null,
      actionKind: 'ai_suggested',
      channel: 'email',
      subjectPreview: payload.headline.slice(0, 200),
      meta: {
        feature: 'dashboard-insights',
        source: 'cron',
        actions_count: payload.actions.length,
        empty: payload.actions.length === 0 && !insights.headline.includes('priorita'),
      },
    })

    return { agencyId, ok: true, empty: !hasTenantData(summary) }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { agencyId, ok: false, empty: false, error: msg }
  }
}
