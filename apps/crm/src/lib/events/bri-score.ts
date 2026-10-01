// ================================================================
// Revolis.AI — BRI Score Engine
// Computes and caches Buyer Readiness Index for each lead
// ================================================================
import type { SupabaseClient } from '@supabase/supabase-js'
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

/** Výsledok jedného prepočtu aj s dôvodom, keď sa nepodaril. */
export interface BRIRecomputeOutcome {
  change: BRIScoreChange | null
  error:  string | null
}

/**
 * Recompute BRI score for a lead using Postgres function.
 * Returns the new score and the delta from previous.
 *
 * Tenká obálka nad `recomputeBRIDetailed` — volajúci, ktorých zaujíma len
 * výsledok (napr. fire-and-forget v /api/events), zostávajú nedotknutí.
 */
export async function recomputeBRI(
  leadId:    string,
  profileId: string,
  client?:   SupabaseClient,
): Promise<BRIScoreChange | null> {
  return (await recomputeBRIDetailed(leadId, profileId, client)).change
}

/**
 * To isté, ale s dôvodom zlyhania. Batch beh ho potrebuje: bez neho sa `null`
 * z neúspešného RPC nedá odlíšiť od ničoho iného a v denníku zostane len počet
 * — presne ten stav, ktorý 2026-09-30 nechal beh cronu nevyšetriteľný.
 */
export async function recomputeBRIDetailed(
  leadId:    string,
  profileId: string,
  client?:   SupabaseClient,
): Promise<BRIRecomputeOutcome> {
  try {
    const supabase = client ?? await createClient()

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
      return { change: null, error: `rpc compute_bri_score: ${error.message}` }
    }

    const newScore = data as number
    return {
      change: {
        lead_id:   leadId,
        old_score: oldScore,
        new_score: newScore,
        delta:     newScore - oldScore,
        trigger:   'bri_score_computed',
        timestamp: new Date().toISOString(),
      },
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[recomputeBRI] unexpected:', message)
    return { change: null, error: message }
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
      leads(name, email, phone)
    `)
    .eq('profile_id', profileId)
    .order('bri_score', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data.map(row => ({
    ...row,
    lead_name: (row.leads as any)?.name ?? 'Unknown',
  }))
}

/**
 * Batch recompute BRI for all active leads in a workspace.
 * Called by cron job every 6 hours.
 *
 * Column names here were wrong on all three filters, and because supabase-js
 * hands back `{ data: null, error }` rather than throwing, every one of them
 * turned into `return 0` — silently (BRI-DEAD-PATH, #738):
 *
 *   .eq('profile_id', …)     `leads` has no such column; it has assigned_profile_id
 *   .eq('status', 'active')  real statuses are Horúci / Nový / Obhliadka /
 *                            Ponuka / Uzavretý — 0 leads ever matched 'active'
 *
 * `client` lets the cron pass a service-role client. Without it this used the
 * cookie client, which in a cron has no session, so RLS returned nothing even
 * once the column names were right.
 *
 * Vracia rozpis, nie jedno číslo (BRI-CRON-OBSERVE-01). Predtým sa neúspešné
 * prepočty odfiltrovali cez `.filter(Boolean)` a zmizli: „0 zapísaných" tak
 * znamenalo zároveň „profil nemá leady" aj „všetkých 26 RPC zlyhalo". To sú
 * dve úplne odlišné poruchy a denník ich musí vedieť rozlíšiť.
 */
export interface BRIBatchResult {
  leads:      number
  computed:   number
  failed:     number
  firstError: string | null
}

export async function batchRecomputeBRI(
  profileId: string,
  client?:   SupabaseClient,
): Promise<BRIBatchResult> {
  const supabase = client ?? await createClient()
  const empty: BRIBatchResult = { leads: 0, computed: 0, failed: 0, firstError: null }

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id')
    .eq('assigned_profile_id', profileId)
    .eq('is_active', true)
    .neq('status', 'Uzavretý')

  if (error) {
    console.error('[batchRecomputeBRI] lead fetch failed:', error.message)
    return { ...empty, firstError: `leads fetch: ${error.message}` }
  }
  if (!leads?.length) return empty

  const BATCH = 10
  const result: BRIBatchResult = { leads: leads.length, computed: 0, failed: 0, firstError: null }

  for (let i = 0; i < leads.length; i += BATCH) {
    const outcomes = await Promise.all(
      leads.slice(i, i + BATCH).map(lead => recomputeBRIDetailed(lead.id, profileId, supabase))
    )
    for (const outcome of outcomes) {
      if (outcome.change) {
        result.computed++
      } else {
        result.failed++
        result.firstError ??= outcome.error ?? 'neznáma chyba pri prepočte'
      }
    }
  }
  return result
}
