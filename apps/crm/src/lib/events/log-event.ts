// ================================================================
// Revolis.AI — logEvent() — the single entry point for all events
// Use this everywhere. Never insert into events table directly.
//
// EVENTS-WRITE-PATH-01 — prečo tu pribudol `client`:
//
// `public.events` má za celú dobu 0 riadkov (#724). Príčina NIE JE RLS politika
// — tá je v poriadku a `service role full access` na tabuľke existuje. Príčinou
// bolo to, že táto funkcia zapisovala VŽDY cookie klientom. V cron-e a webhooku
// žiadna session nie je, `auth.uid()` je NULL, politika „users insert own
// profile events" teda nikdy neprešla, a chyba skončila v console.error.
// Zo štyroch serverových zapisovateľov tak nezapísal ani jeden.
//
// Serverový volajúci preto podá service-role klienta. Session cesta
// (/api/events z prehliadača) zostáva nedotknutá a ďalej beží pod RLS.
// ================================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import type { EntityType, EventType } from '@/types/events'

export interface LogEventOptions {
  profileId:   string
  entityType:  EntityType
  entityId?:   string | null
  eventType:   EventType
  payload?:    Record<string, unknown>
  sessionId?:  string
  /**
   * Klient, ktorým sa má zapísať. Serverové cesty (cron, webhook) sem podajú
   * service-role klienta; bez neho sa použije cookie klient a zápis mimo
   * session RLS odmietne.
   */
  client?:     SupabaseClient
}

export interface LogEventResult {
  id:    string | null
  error: string | null
}

/**
 * Log an event to the Revolis event pipeline.
 * Fire-and-forget on the client, awaited on the server.
 * Never throws — failures are silently logged to console.
 *
 * Tenká obálka nad `logEventDetailed`, aby doterajší volajúci zostali bez zmeny.
 */
export async function logEvent(opts: LogEventOptions): Promise<string | null> {
  return (await logEventDetailed(opts)).id
}

/**
 * To isté, ale s dôvodom zlyhania.
 *
 * `logEvent` vracia `null` rovnako pri „zapísalo sa nič" ako pri „politika ma
 * odmietla" — a práve tá nerozlíšiteľnosť držala prázdnu tabuľku štyri mesiace
 * bez povšimnutia. Volajúci, ktorý chce vedieť prečo, použije túto.
 */
export async function logEventDetailed(opts: LogEventOptions): Promise<LogEventResult> {
  try {
    let supabase = opts.client
    if (!supabase) {
      const { createClient } = await import('@/lib/supabase/server')
      supabase = await createClient()
    }

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
      return { id: null, error: error.message }
    }
    return { id: data?.id ?? null, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[logEvent] unexpected error:', message)
    return { id: null, error: message }
  }
}

/**
 * Client-side fire-and-forget via /api/events endpoint.
 * Use in React components — doesn't block UI.
 */
export function logEventClient(opts: Omit<LogEventOptions, 'profileId' | 'client'>): void {
  const body = JSON.stringify(opts)
  if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
    navigator.sendBeacon('/api/events', body)
  } else {
    fetch('/api/events', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true })
      .catch(() => {}) // silent fail — events are best-effort
  }
}
