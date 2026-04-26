// ================================================================
// Revolis.AI — usePriceTrail
// Real-time price trail with Supabase subscription
// ================================================================
'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabaseClient } from '@/lib/supabase/client'
import { generateNegotiationScript } from '@/lib/price-trail/negotiation-script'
import type {
  ChartPoint, NegotiationBrief, NegotiationLine,
  PriceAlert, PriceSource,
} from '@/types/price-trail'

interface UsePriceTrailOpts {
  profileId:   string
  listingId?:  string
  propertyId?: string
  withScript?: boolean
}

export function usePriceTrail(opts: UsePriceTrailOpts) {
  const { profileId, listingId, propertyId, withScript = true } = opts

  const [trail,      setTrail]      = useState<ChartPoint[]>([])
  const [brief,      setBrief]      = useState<NegotiationBrief | null>(null)
  const [script,     setScript]     = useState<NegotiationLine[]>([])
  const [isLoading,  setIsLoading]  = useState(true)
  const [isAdding,   setIsAdding]   = useState(false)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        ...(listingId  ? { listingId }  : {}),
        ...(propertyId ? { propertyId } : {}),
        withScript: String(withScript),
      })
      const res  = await fetch(`/api/price-trail?${params}`)
      const data = await res.json()
      if (data.ok) {
        setTrail(data.trail  ?? [])
        setBrief(data.brief  ?? null)
        setScript(data.script ?? [])
      }
    } finally {
      setIsLoading(false)
    }
  }, [listingId, propertyId, withScript])

  const addPoint = useCallback(async (opts: {
    price:   number
    source?: PriceSource
    note?:   string
  }) => {
    setIsAdding(true)
    try {
      const res = await fetch('/api/price-trail', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price:      opts.price,
          source:     opts.source ?? 'user_input',
          listingId,
          propertyId,
          note:       opts.note,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        await refresh()
        return data
      }
    } finally {
      setIsAdding(false)
    }
    return null
  }, [listingId, propertyId, refresh])

  useEffect(() => {
    refresh()

    // Realtime: new price points
    const supabase = supabaseClient
    const channel = supabase
      .channel(`price-trail-${listingId ?? propertyId}`)
      .on('postgres_changes', {
          event:  'INSERT',
          schema: 'public',
          table:  'property_price_trail',
          filter: listingId
            ? `listing_id=eq.${listingId}`
            : `property_id=eq.${propertyId}`,
        },
        () => { refresh() }   // refetch on any new point
      )
      .on('postgres_changes', {
          event:  'UPDATE',
          schema: 'public',
          table:  'seller_motivation',
          filter: listingId
            ? `listing_id=eq.${listingId}`
            : `property_id=eq.${propertyId}`,
        },
        (payload) => {
          if (payload.new) setBrief(prev => prev ? { ...prev, ...payload.new } : null)
          if (withScript && payload.new) {
            const updated = { ...(brief ?? {}), ...payload.new } as NegotiationBrief
            setScript(generateNegotiationScript(updated))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [listingId, propertyId, refresh])

  return { trail, brief, script, isLoading, isAdding, addPoint, refresh }
}
