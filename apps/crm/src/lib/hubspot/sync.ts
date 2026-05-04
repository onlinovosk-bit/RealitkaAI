import { logError } from '@/lib/logger'
import { upsertContact, createOrUpdateDeal } from './client'
import type { HubSpotSyncResult } from './types'

const DEAL_STAGE_MAP: Record<string, string> = {
  new: 'appointmentscheduled',
  warm: 'qualifiedtobuy',
  hot: 'presentationscheduled',
  viewing: 'decisionmakerboughtin',
  offer: 'contractsent',
}

const HS_LEAD_STATUS_MAP: Record<string, string> = {
  new: 'NEW',
  warm: 'OPEN',
  hot: 'IN_PROGRESS',
  viewing: 'OPEN_DEAL',
  offer: 'IN_PROGRESS',
}

export async function syncLeadToHubSpot(lead: {
  id: string
  email: string
  name?: string
  phone?: string
  status: string
  score?: number
  source?: string
  estimatedPrice?: number
}): Promise<HubSpotSyncResult> {
  if (!process.env.HUBSPOT_API_KEY) {
    return { ok: false, error: 'HUBSPOT_API_KEY not configured' }
  }

  try {
    const nameParts = (lead.name ?? '').trim().split(' ')
    const firstname = nameParts[0] || undefined
    const lastname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined

    const { id: contactId } = await upsertContact({
      email: lead.email,
      firstname,
      lastname,
      phone: lead.phone,
      revolis_lead_id: lead.id,
      revolis_status: lead.status,
      revolis_score: lead.score,
      revolis_source: lead.source,
      hs_lead_status: HS_LEAD_STATUS_MAP[lead.status] ?? 'NEW',
    })

    const { id: dealId } = await createOrUpdateDeal(
      {
        dealname: `${lead.name ?? lead.email} — Revolis.AI`,
        dealstage: DEAL_STAGE_MAP[lead.status] ?? 'appointmentscheduled',
        amount: lead.estimatedPrice,
        revolis_lead_id: lead.id,
      },
      contactId
    )

    return { ok: true, contactId, dealId }
  } catch (err) {
    logError('[HubSpot] syncLeadToHubSpot failed', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown HubSpot sync error',
    }
  }
}

export async function syncLeadStatusToHubSpot(
  hubspotContactId: string,
  newStatus: string,
  score?: number
): Promise<HubSpotSyncResult> {
  if (!process.env.HUBSPOT_API_KEY) {
    return { ok: false, error: 'HUBSPOT_API_KEY not configured' }
  }

  try {
    const properties: Record<string, string | number> = {
      revolis_status: newStatus,
      hs_lead_status: HS_LEAD_STATUS_MAP[newStatus] ?? 'OPEN',
    }
    if (score !== undefined) properties.revolis_score = score

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    let res: Response
    try {
      res = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${hubspotContactId}`,
        {
          method: 'PATCH',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
          },
          body: JSON.stringify({ properties }),
        }
      )
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      const body = await res.text()
      logError('[HubSpot] syncLeadStatusToHubSpot failed', { status: res.status, body })
      return { ok: false, error: `HubSpot PATCH failed: ${res.status}` }
    }

    return { ok: true, contactId: hubspotContactId }
  } catch (err) {
    logError('[HubSpot] syncLeadStatusToHubSpot failed', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown HubSpot sync error',
    }
  }
}
