// ================================================================
// Revolis.AI — useMorningBrief
// Settings management + push subscription registration
// ================================================================
'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabaseClient } from '@/lib/supabase/client'
import type { BriefSettings, BriefWeekStats } from '@/types/morning-brief'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

export function useMorningBrief(profileId: string) {
  const [settings,    setSettings]    = useState<BriefSettings | null>(null)
  const [weekStats,   setWeekStats]   = useState<BriefWeekStats[]>([])
  const [pushSupported, setPushSupported] = useState(false)
  const [isLoading,   setIsLoading]   = useState(true)
  const [isSaving,    setIsSaving]    = useState(false)

  useEffect(() => {
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window)
    fetchSettings()
    fetchStats()
  }, [profileId])

  const fetchSettings = async () => {
    const supabase = supabaseClient
    const { data } = await supabase
      .from('morning_brief_settings')
      .select('*')
      .eq('profile_id', profileId)
      .single()

    // Create defaults if not exist
    if (!data) {
      const { data: created } = await supabase
        .from('morning_brief_settings')
        .insert({ profile_id: profileId })
        .select()
        .single()
      setSettings(created as BriefSettings)
    } else {
      setSettings(data as BriefSettings)
    }
    setIsLoading(false)
  }

  const fetchStats = async () => {
    const supabase = supabaseClient
    const { data } = await supabase
      .from('morning_brief_stats')
      .select('*')
      .eq('profile_id', profileId)
      .limit(8)
    setWeekStats((data ?? []) as BriefWeekStats[])
  }

  const saveSettings = useCallback(async (updates: Partial<BriefSettings>) => {
    setIsSaving(true)
    const supabase = supabaseClient
    const { data } = await supabase
      .from('morning_brief_settings')
      .upsert({ profile_id: profileId, ...updates, updated_at: new Date().toISOString() },
               { onConflict: 'profile_id' })
      .select()
      .single()
    if (data) setSettings(data as BriefSettings)
    setIsSaving(false)
  }, [profileId])

  const subscribePush = useCallback(async (): Promise<boolean> => {
    if (!pushSupported || !VAPID_PUBLIC) return false
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
      })
      await fetch('/api/notifications/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(sub.toJSON()),
      })
      await fetchSettings()
      return true
    } catch (err) {
      console.error('[subscribePush]', err)
      return false
    }
  }, [pushSupported, fetchSettings])

  return {
    settings, weekStats, pushSupported,
    isLoading, isSaving,
    saveSettings, subscribePush,
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding  = '='.repeat((4 - base64String.length % 4) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = window.atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}
