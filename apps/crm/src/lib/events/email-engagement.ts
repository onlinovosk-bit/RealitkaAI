// ================================================================
// Revolis.AI — otvorenie a klik v e-maile ako trvalá udalosť
//
// ENGAGEMENT-EMAIL-01. Prvý skutočný engagement signál v systéme.
//
// Doteraz webhook z Resendu volal `recordEmailOpen` / `recordEmailClick`, čo
// zapisovalo do `new Map()` v pamäti procesu. Na serverless tá mapa zmizne
// s inštanciou a `getEmailEngagement` nemal v repe ani jedného volajúceho —
// signál sa teda prijímal a zahadzoval. Teraz končí v `events`, odkiaľ ho
// číta RPC pre BRI (zložky `recency` a `engagement`).
//
// `events.profile_id` je NOT NULL, ale 24 aktívnych leadov nemá
// `assigned_profile_id`. Preto je tu záloha na aktívny profil tej istej
// agentúry: bez nej by sa udalosť pre nepriradený lead ticho stratila —
// a práve nepriradený, čerstvý lead je ten, o ktorého záujem stojí najviac.
// ================================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import { logEventDetailed } from '@/lib/events/log-event'
import type { EventType } from '@/types/events'

export type EmailEngagementKind = 'opened' | 'clicked'

const EVENT_TYPE: Record<EmailEngagementKind, EventType> = {
  opened:  'message_opened',
  clicked: 'message_clicked',
}

export interface EmailEngagementResult {
  recorded: boolean
  /** Prečo sa nezapísalo. `null` pri úspechu. */
  reason:   string | null
}

/**
 * Nájde profil, pod ktorý udalosť patrí.
 *
 * Poradie: priradený maklér → ľubovoľný aktívny profil tej istej agentúry.
 * Vracia `null`, keď ani jedno neexistuje — vtedy sa udalosť nezapíše a dôvod
 * sa vráti volajúcemu. Ticho ju zahodiť by znamenalo vrátiť sa presne k tomu,
 * čo táto úloha opravuje.
 */
export async function resolveProfileForLead(
  client: SupabaseClient,
  leadId: string,
): Promise<{ profileId: string | null; reason: string | null }> {
  const { data: lead, error } = await client
    .from('leads')
    .select('assigned_profile_id, agency_id')
    .eq('id', leadId)
    .single()

  if (error) return { profileId: null, reason: `lead lookup: ${error.message}` }
  if (!lead)  return { profileId: null, reason: `lead ${leadId} neexistuje` }

  if (lead.assigned_profile_id) {
    return { profileId: lead.assigned_profile_id as string, reason: null }
  }

  if (!lead.agency_id) {
    return { profileId: null, reason: `lead ${leadId} nemá makléra ani agentúru` }
  }

  const { data: fallback, error: fbErr } = await client
    .from('profiles')
    .select('id')
    .eq('agency_id', lead.agency_id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (fbErr)     return { profileId: null, reason: `profile fallback: ${fbErr.message}` }
  if (!fallback) return { profileId: null, reason: `agentúra leadu ${leadId} nemá aktívny profil` }

  return { profileId: fallback.id as string, reason: null }
}

/**
 * Zapíše otvorenie alebo klik ako udalosť na leade.
 *
 * `client` musí byť service-role: webhook nemá session, takže cookie klient
 * by na RLS pohorel (EVENTS-WRITE-PATH-01).
 */
export async function recordEmailEngagement(
  client: SupabaseClient,
  input: { leadId: string; kind: EmailEngagementKind; occurredAt: string },
): Promise<EmailEngagementResult> {
  const { profileId, reason } = await resolveProfileForLead(client, input.leadId)
  if (!profileId) {
    console.error('[email-engagement] nezapísané:', reason)
    return { recorded: false, reason }
  }

  const { error } = await logEventDetailed({
    client,
    profileId,
    entityType: 'lead',
    entityId:   input.leadId,
    eventType:  EVENT_TYPE[input.kind],
    payload: {
      channel:     'email',
      occurred_at: input.occurredAt,
      // Zámerne žiadny predmet, telo ani adresa — do `events` nepatria osobné
      // údaje, stačí fakt, že sa e-mail otvoril.
      source:      'resend_webhook',
    },
  })

  if (error) {
    console.error('[email-engagement] zápis zlyhal:', error)
    return { recorded: false, reason: error }
  }
  return { recorded: true, reason: null }
}
