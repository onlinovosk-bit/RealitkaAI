// ================================================================
// Revolis.AI — BRI Score Engine
// Computes and caches Buyer Readiness Index for each lead
// ================================================================
import { createClient }        from '@/lib/supabase/server'
import type { BRIScore, BRIScoreChange } from '@/types/events'

export interface ScoreWeights {
  recency:    number   // 0–1, default 0.30
  engagement: number   // 0–1, default 0.25
  sourceQuality: number // 0–1, default 0.20
  propertyMatch: number // 0–1, default 0.15
  base:       number   // 0–1, default 0.10
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  recency:       0.30,
  engagement:    0.25,
  sourceQuality: 0.20,
  propertyMatch: 0.15,
  base:          0.10,
}

/**
 * Recompute BRI score for a lead using Postgres function.
 * Returns the new score and the delta from previous.
 */
export async function recomputeBRI(
  leadId:    string,
  profileId: string
): Promise<BRIScoreChange | null> {
  try {
    const supabase = await createClient()

    // Get current cached score before recompute
    const { data: current } = await supabase
      .from('lead_scores')
      .select('bri_score')
      .eq('lead_id', leadId)
      .eq('profile_id', profileId)
      .single()

    const oldScore = current?.bri_score ?? 0

    // Trigger Postgres computation
    const { data, error } = await supabase
      .rpc('compute_bri_score', {
        p_lead_id:    leadId,
        p_profile_id: profileId,
      })

    if (error) {
      console.error('[recomputeBRI] rpc error:', error.message)
      return null
    }

    const newScore = data as number
    return {
      lead_id:   leadId,
      old_score: oldScore,
      new_score: newScore,
      delta:     newScore - oldScore,
      trigger:   'bri_score_computed',
      timestamp: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[recomputeBRI] unexpected:', err)
    return null
  }
}

/**
 * Get current BRI score (from cache, fast).
 */
export async function getBRIScore(
  leadId:    string,
  profileId: string
): Promise<BRIScore | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lead_scores')
    .select('*')
    .eq('lead_id', leadId)
    .eq('profile_id', profileId)
    .single()

  if (error || !data) return null
  return data as BRIScore
}

/**
 * Get top N leads by BRI score for a profile.
 * Used by Morning Brief and dashboard.
 */
export async function getTopLeadsByBRI(
  profileId: string,
  limit = 10
): Promise<Array<BRIScore & { lead_name?: string }>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lead_scores')
    .select(`
      *,
      leads(full_name, email, phone)
    `)
    .eq('profile_id', profileId)
    .order('bri_score', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data.map(row => ({
    ...row,
    lead_name: (row.leads as any)?.full_name ?? 'Unknown',
  }))
}

/**
 * Batch recompute BRI for all active leads in a workspace.
 * Called by cron job every 6 hours.
 */
export async function batchRecomputeBRI(profileId: string): Promise<number> {
  const supabase = await createClient()
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id')
    .eq('profile_id', profileId)
    .eq('status', 'active')

  if (error || !leads) return 0

  const BATCH = 10
  let computed = 0
  for (let i = 0; i < leads.length; i += BATCH) {
    const results = await Promise.all(
      leads.slice(i, i + BATCH).map(lead => recomputeBRI(lead.id, profileId))
    )
    computed += results.filter(Boolean).length
  }
  return computed
}
