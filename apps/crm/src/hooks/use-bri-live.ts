// ================================================================
// Revolis.AI — useBRILive
// Real-time BRI with Supabase subscription + pulse animation
// ================================================================
'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { supabaseClient }  from '@/lib/supabase/client'
import type {
  BRIScoreV2, BRIHistoryPoint, BRILiveState, BRIComputeResult
} from '@/types/bri'
import { getBRIColorTier } from '@/types/bri'

const PULSE_DURATION_MS = 1400

export interface UseBRILiveOptions {
  leadId:       string
  profileId:    string
  autoRefresh?: boolean       // subscribe to realtime updates (default: true)
}

export function useBRILive(opts: UseBRILiveOptions): BRILiveState & {
  colorTier:  ReturnType<typeof getBRIColorTier>
  recompute:  () => Promise<BRIComputeResult | null>
  history:    BRIHistoryPoint[]
  config:     { hotThreshold: number } | null
} {
  const { leadId, profileId, autoRefresh = true } = opts

  const [state, setState] = useState<BRILiveState>({
    score: 0, previousScore: 0, delta: 0,
    trajectory: 'stable', velocity: 0,
    isHot: false, isPulsing: false,
    isLoading: true, factors: null,
    history: [], lastUpdated: null,
  })
  const [config, setConfig] = useState<{ hotThreshold: number } | null>(null)
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initial data fetch
  const fetchInitial = useCallback(async () => {
    const supabase = supabaseClient

    // Score
    const { data: scoreData } = await supabase
      .from('lead_scores')
      .select('*')
      .eq('lead_id', leadId)
      .eq('profile_id', profileId)
      .single()

    // History (last 20 points)
    const { data: histData } = await supabase
      .from('bri_score_history')
      .select('*')
      .eq('lead_id', leadId)
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Config
    const { data: cfgData } = await supabase
      .from('bri_config')
      .select('hot_threshold')
      .eq('profile_id', profileId)
      .single()

    const score = (scoreData as BRIScoreV2 | null)

    setState(prev => ({
      ...prev,
      score:         score?.bri_score        ?? 0,
      previousScore: score?.score_24h_ago    ?? 0,
      delta:         score?.velocity         ?? 0,
      trajectory:    score?.trajectory       ?? 'stable',
      velocity:      score?.velocity         ?? 0,
      isHot:         (score?.bri_score ?? 0) >= (cfgData?.hot_threshold ?? 75),
      factors:       score?.score_factors    ?? null,
      history:       ((histData ?? []) as BRIHistoryPoint[]).reverse(),
      isLoading:     false,
      lastUpdated:   score ? new Date(score.computed_at) : null,
    }))

    setConfig({ hotThreshold: cfgData?.hot_threshold ?? 75 })
  }, [leadId, profileId])

  // Trigger pulse animation
  const triggerPulse = useCallback(() => {
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
    setState(prev => ({ ...prev, isPulsing: true }))
    pulseTimerRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, isPulsing: false }))
    }, PULSE_DURATION_MS)
  }, [])

  // Manual recompute
  const recompute = useCallback(async (): Promise<BRIComputeResult | null> => {
    try {
      const res = await fetch('/api/leads/bri-recompute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ leadId, trigger: 'manual_recompute' }),
      })
      if (!res.ok) return null
      const data = await res.json() as BRIComputeResult
      triggerPulse()
      return data
    } catch {
      return null
    }
  }, [leadId, triggerPulse])

  useEffect(() => {
    fetchInitial()

    if (!autoRefresh) return

    // Real-time subscription on lead_scores
    const supabase = supabaseClient
    const channel = supabase
      .channel(`bri-live-${leadId}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'lead_scores',
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          const next = payload.new as BRIScoreV2
          const prev = payload.old as Partial<BRIScoreV2>

          setState(s => ({
            ...s,
            previousScore: prev.bri_score ?? s.score,
            score:         next.bri_score,
            delta:         next.bri_score - (prev.bri_score ?? s.score),
            trajectory:    next.trajectory,
            velocity:      next.velocity,
            isHot:         next.bri_score >= (config?.hotThreshold ?? 75),
            factors:       next.score_factors ?? s.factors,
            lastUpdated:   new Date(next.computed_at),
          }))

          // Only pulse on meaningful change
          if (Math.abs(next.bri_score - (prev.bri_score ?? 0)) >= 2) {
            triggerPulse()
          }
        }
      )
      // Also subscribe to new history points (for live chart updates)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'bri_score_history',
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          const point = payload.new as BRIHistoryPoint
          setState(s => ({
            ...s,
            history: [...s.history.slice(-29), point],
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
    }
  }, [leadId, profileId, autoRefresh, fetchInitial, triggerPulse, config?.hotThreshold])

  return {
    ...state,
    colorTier: getBRIColorTier(state.score),
    recompute,
    history: state.history,
    config,
  }
}
