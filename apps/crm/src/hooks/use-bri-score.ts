// ================================================================
// Revolis.AI — useBRIScore React hook
// Real-time BRI score with Supabase realtime subscription
// ================================================================
'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabaseClient }                    from '@/lib/supabase/client'
import type { BRIScore, BRIScoreChange }     from '@/types/events'

interface UseBRIScoreResult {
  score:        number | null
  scoreData:    BRIScore | null
  scoreChange:  BRIScoreChange | null
  isLoading:    boolean
  recompute:    () => Promise<void>
}

export function useBRIScore(leadId: string, profileId: string): UseBRIScoreResult {
  const [scoreData, setScoreData]   = useState<BRIScore | null>(null)
  const [scoreChange, setScoreChange] = useState<BRIScoreChange | null>(null)
  const [isLoading, setIsLoading]   = useState(true)

  const fetchScore = useCallback(async () => {
    const supabase = supabaseClient
    const { data } = await supabase
      .from('lead_scores')
      .select('*')
      .eq('lead_id', leadId)
      .eq('profile_id', profileId)
      .single()
    if (data) setScoreData(data as BRIScore)
    setIsLoading(false)
  }, [leadId, profileId])

  const recompute = useCallback(async () => {
    const res = await fetch('/api/leads/bri-recompute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, profileId }),
    })
    const data = await res.json() as BRIScoreChange
    if (data?.new_score !== undefined) {
      setScoreChange(data)
      await fetchScore()
    }
  }, [leadId, profileId, fetchScore])

  useEffect(() => {
    fetchScore()

    // Subscribe to real-time score updates
    const supabase = supabaseClient
    const channel = supabase
      .channel(`bri-score-${leadId}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'lead_scores',
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          const newData = payload.new as BRIScore
          const oldData = payload.old as Partial<BRIScore>
          setScoreData(newData)
          if (oldData.bri_score !== undefined && newData.bri_score !== oldData.bri_score) {
            setScoreChange({
              lead_id:   leadId,
              old_score: oldData.bri_score,
              new_score: newData.bri_score,
              delta:     newData.bri_score - oldData.bri_score,
              trigger:   'bri_score_computed',
              timestamp: new Date().toISOString(),
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [leadId, profileId, fetchScore])

  return {
    score:       scoreData?.bri_score ?? null,
    scoreData,
    scoreChange,
    isLoading,
    recompute,
  }
}
