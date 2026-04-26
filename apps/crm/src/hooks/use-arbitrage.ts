// ================================================================
// Revolis.AI — useArbitrage
// Real-time arbitrage matches with Supabase subscription
// ================================================================
'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabaseClient } from '@/lib/supabase/client'
import type {
  ArbitrageMatch, ArbitrageStats, MatchStatus, ArbitrageConfig,
} from '@/types/arbitrage'

interface UseArbitrageOptions {
  profileId:      string
  status?:        MatchStatus
  city?:          string
  limit?:         number
  autoRefresh?:   boolean
}

interface UseArbitrageResult {
  matches:    ArbitrageMatch[]
  stats:      ArbitrageStats | null
  config:     ArbitrageConfig | null
  isLoading:  boolean
  isMutating: boolean
  newCount:   number
  refresh:    () => Promise<void>
  updateStatus: (matchId: string, status: MatchStatus, reason?: string) => Promise<void>
  saveConfig:   (updates: Partial<ArbitrageConfig>) => Promise<void>
}

export function useArbitrage(opts: UseArbitrageOptions): UseArbitrageResult {
  const { profileId, status = 'new', city, limit = 20, autoRefresh = true } = opts

  const [matches,    setMatches]    = useState<ArbitrageMatch[]>([])
  const [stats,      setStats]      = useState<ArbitrageStats | null>(null)
  const [config,     setConfig]     = useState<ArbitrageConfig | null>(null)
  const [isLoading,  setIsLoading]  = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [newCount,   setNewCount]   = useState(0)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        status, limit: String(limit),
        ...(city ? { city } : {}),
      })
      const res  = await fetch(`/api/arbitrage?${params}`)
      const data = await res.json()
      if (data.ok) {
        setMatches(data.matches ?? [])
        setStats(data.stats ?? null)
        setNewCount((data.matches ?? []).filter((m: ArbitrageMatch) => m.status === 'new').length)
      }
    } finally {
      setIsLoading(false)
    }
  }, [status, city, limit])

  const updateStatus = useCallback(async (
    matchId: string, newStatus: MatchStatus, reason?: string
  ) => {
    setIsMutating(true)
    try {
      await fetch('/api/arbitrage', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ matchId, status: newStatus, dismissed_reason: reason }),
      })
      setMatches(prev => prev.map(m =>
        m.id === matchId ? { ...m, status: newStatus } : m
      ))
      if (newStatus !== 'new') {
        setNewCount(prev => Math.max(0, prev - 1))
      }
    } finally {
      setIsMutating(false)
    }
  }, [])

  const saveConfig = useCallback(async (updates: Partial<ArbitrageConfig>) => {
    const supabase = supabaseClient
    const { data } = await supabase
      .from('arbitrage_config')
      .upsert({ profile_id: profileId, ...updates, updated_at: new Date().toISOString() },
               { onConflict: 'profile_id' })
      .select()
      .single()
    if (data) setConfig(data as ArbitrageConfig)
  }, [profileId])

  useEffect(() => {
    refresh()

    // Load config
    const supabase = supabaseClient
    supabase
      .from('arbitrage_config')
      .select('*')
      .eq('profile_id', profileId)
      .single()
      .then(({ data }) => { if (data) setConfig(data as ArbitrageConfig) })

    if (!autoRefresh) return

    // Realtime: new matches
    const channel = supabase
      .channel(`arbitrage-${profileId}`)
      .on('postgres_changes', {
          event:  'INSERT',
          schema: 'public',
          table:  'arbitrage_matches',
          filter: `profile_id=eq.${profileId}`,
        },
        (payload) => {
          const newMatch = payload.new as ArbitrageMatch
          setMatches(prev => [newMatch, ...prev].slice(0, limit))
          setNewCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profileId, status, city, limit, autoRefresh, refresh])

  return {
    matches, stats, config, isLoading, isMutating,
    newCount, refresh, updateStatus, saveConfig,
  }
}
