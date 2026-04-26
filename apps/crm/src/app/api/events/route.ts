// ================================================================
// Revolis.AI — POST /api/events
// Client-side event beacon endpoint
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { logEvent }                  from '@/lib/events/log-event'
import { checkIntegrity }            from '@/lib/events/integrity-monitor'
import { recomputeBRI }              from '@/lib/events/bri-score'
import type { EntityType, EventType } from '@/types/events'

// Events that trigger BRI recomputation
const BRI_TRIGGER_EVENTS: EventType[] = [
  'message_opened', 'message_replied', 'call_completed',
  'property_viewed', 'lead_viewed',
]

// Events that trigger integrity check
const INTEGRITY_EVENTS: EventType[] = [
  'export_contacts', 'bulk_view', 'csv_download', 'data_export',
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await request.json() as {
      entityType: EntityType
      entityId?:  string
      eventType:  EventType
      payload?:   Record<string, unknown>
      sessionId?: string
    }

    // Insert event
    const eventId = await logEvent({
      profileId:  profile.id,
      entityType: body.entityType,
      entityId:   body.entityId,
      eventType:  body.eventType,
      payload:    body.payload ?? {},
      sessionId:  body.sessionId,
    })

    // Side effects (fire-and-forget, don't block response)
    const sideEffects: Promise<unknown>[] = []

    // 1. Recompute BRI if triggered
    if (BRI_TRIGGER_EVENTS.includes(body.eventType) && body.entityId) {
      sideEffects.push(
        recomputeBRI(body.entityId, profile.id).catch(console.error)
      )
    }

    // 2. Check integrity if export action
    if (INTEGRITY_EVENTS.includes(body.eventType)) {
      const entityCount = (body.payload?.count as number) ?? 1
      sideEffects.push(
        checkIntegrity(profile.id, user.id, body.eventType, entityCount)
          .catch(console.error)
      )
    }

    // Don't await side effects — respond immediately
    Promise.all(sideEffects).catch(console.error)

    return NextResponse.json({ ok: true, event_id: eventId })
  } catch (err) {
    console.error('[POST /api/events]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
