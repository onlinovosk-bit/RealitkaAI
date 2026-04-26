// ================================================================
// Revolis.AI — logEvent() — the single entry point for all events
// Use this everywhere. Never insert into events table directly.
// ================================================================
import type { EntityType, EventType } from '@/types/events'

export interface LogEventOptions {
  profileId:   string
  entityType:  EntityType
  entityId?:   string | null
  eventType:   EventType
  payload?:    Record<string, unknown>
  sessionId?:  string
}

/**
 * Log an event to the Revolis event pipeline.
 * Fire-and-forget on the client, awaited on the server.
 * Never throws — failures are silently logged to console.
 */
export async function logEvent(opts: LogEventOptions): Promise<string | null> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('events')
      .insert({
        profile_id:  opts.profileId,
        entity_type: opts.entityType,
        entity_id:   opts.entityId ?? null,
        event_type:  opts.eventType,
        payload:     opts.payload ?? {},
        session_id:  opts.sessionId ?? null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[logEvent] insert failed:', error.message)
      return null
    }
    return data?.id ?? null
  } catch (err) {
    console.error('[logEvent] unexpected error:', err)
    return null
  }
}

/**
 * Client-side fire-and-forget via /api/events endpoint.
 * Use in React components — doesn't block UI.
 */
export function logEventClient(opts: Omit<LogEventOptions, 'profileId'>): void {
  const body = JSON.stringify(opts)
  if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
    navigator.sendBeacon('/api/events', body)
  } else {
    fetch('/api/events', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true })
      .catch(() => {}) // silent fail — events are best-effort
  }
}
