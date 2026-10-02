// ================================================================
// Revolis.AI — POST /api/events
// Client-side event beacon endpoint
//
// EVENTS-WIRE-01 — prečo tu pribudla validácia:
//
// Táto route brala telo ako `as { entityType, eventType, ... }` a posielala ho
// priamo do insertu. Pretypovanie nie je kontrola: jediný volajúci v appke
// (tlačidlo na detaile leadu) posielal `{ leadId, signals }`, takže
// `entity_type` aj `event_type` boli `undefined`, insert padol na NOT NULL,
// `logEvent` chybu zapísal do `console.error` a route aj tak vrátila `ok: true`.
// Výsledok: `public.events` mala štyri mesiace 0 riadkov, BRI preto zámerne
// odmietalo počítať (EVENTS-REVIVE-01) a desať tabuliek AI vrstvy zostalo
// prázdnych. Jedno tiché `catch` pod jedným `as` zastavilo celú vrstvu.
//
// `event_type` navyše NEMÁ v DB CHECK (len `entity_type` ho má), takže preklep
// v názve by sa zapísal a otrávil pipeline natrvalo. Kód je jediná brána.
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { createClient }              from '@/lib/supabase/server'
import { validateBody }              from '@/lib/api-validate'
import { logEventDetailed }          from '@/lib/events/log-event'
import { checkIntegrity }            from '@/lib/events/integrity-monitor'
import { recomputeBRI }              from '@/lib/events/bri-score'
import { ENTITY_TYPES, EVENT_TYPES } from '@/types/events'
import type { EventType }            from '@/types/events'

/**
 * Schéma ukazuje na uzavreté slovníky v `@/types/events`, nerestatuje ich.
 * Pridanie typu na jednom mieste tak nemôže nechať API a typy v nezhode.
 *
 * `payload` je zámerne `unknown` record bez tvaru — nesie fakt, nie osobné
 * údaje, a každý producent má vlastné polia.
 */
const EventBody = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId:   z.string().trim().min(1).max(200).optional(),
  eventType:  z.enum(EVENT_TYPES),
  // zod 4 vyžaduje aj typ kľúča; jednoargumentový `z.record` je zod 3.
  payload:    z.record(z.string(), z.unknown()).optional(),
  sessionId:  z.string().trim().min(1).max(200).optional(),
})

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

    const parsed = await validateBody(request, EventBody)
    if (!parsed.ok) return parsed.response
    const body = parsed.data

    // Zápis, a jeho zlyhanie sa NEZAHADZUJE. `logEvent` vracia `null` rovnako
    // pri „nezapísalo sa" ako pri „politika ma odmietla", a práve tá
    // nerozlíšiteľnosť držala prázdnu tabuľku. Volajúci musí vedieť, že jeho
    // event neexistuje — inak sa signál stráca presne tak ako doteraz.
    const { id: eventId, error: logError } = await logEventDetailed({
      profileId:  profile.id,
      entityType: body.entityType,
      entityId:   body.entityId,
      eventType:  body.eventType,
      payload:    body.payload ?? {},
      sessionId:  body.sessionId,
    })

    if (logError || !eventId) {
      return NextResponse.json(
        { ok: false, error: logError ?? 'Event sa nezapísal.' },
        { status: 500 },
      )
    }

    // Side effects (fire-and-forget, don't block response)
    const sideEffects: Promise<unknown>[] = []

    // 1. Recompute BRI if triggered
    if (BRI_TRIGGER_EVENTS.includes(body.eventType as EventType) && body.entityId) {
      sideEffects.push(
        recomputeBRI(body.entityId, profile.id).catch(console.error)
      )
    }

    // 2. Check integrity if export action
    if (INTEGRITY_EVENTS.includes(body.eventType as EventType)) {
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
