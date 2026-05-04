import { logError } from '@/lib/logger'
import type { HubSpotContact, HubSpotDeal } from './types'

const BASE_URL = 'https://api.hubapi.com'
const TIMEOUT_MS = 8000

function getApiKey(): string {
  const key = process.env.HUBSPOT_API_KEY
  if (!key) throw new Error('HUBSPOT_API_KEY not configured')
  return key
}

async function hubspotFetch(
  path: string,
  options: RequestInit
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
        ...(options.headers ?? {}),
      },
    })
    return res
  } finally {
    clearTimeout(timer)
  }
}

export async function searchContactByEmail(email: string): Promise<string | null> {
  const res = await hubspotFetch('/crm/v3/objects/contacts/search', {
    method: 'POST',
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            { propertyName: 'email', operator: 'EQ', value: email },
          ],
        },
      ],
      properties: ['email'],
      limit: 1,
    }),
  })

  if (!res.ok) {
    logError('[HubSpot] searchContactByEmail failed', { status: res.status, email })
    return null
  }

  const data = await res.json() as { results: Array<{ id: string }> }
  return data.results[0]?.id ?? null
}

export async function upsertContact(props: HubSpotContact): Promise<{ id: string }> {
  const existingId = await searchContactByEmail(props.email)

  const properties: Record<string, string | number | undefined> = {
    email: props.email,
    firstname: props.firstname,
    lastname: props.lastname,
    phone: props.phone,
    company: props.company,
    revolis_lead_id: props.revolis_lead_id,
    revolis_status: props.revolis_status,
    revolis_score: props.revolis_score,
    revolis_source: props.revolis_source,
    hs_lead_status: props.hs_lead_status,
  }

  // Strip undefined so HubSpot doesn't overwrite with blank
  const cleanProps = Object.fromEntries(
    Object.entries(properties).filter(([, v]) => v !== undefined)
  )

  if (existingId) {
    const res = await hubspotFetch(`/crm/v3/objects/contacts/${existingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties: cleanProps }),
    })
    if (!res.ok) {
      const body = await res.text()
      logError('[HubSpot] upsertContact PATCH failed', { status: res.status, body })
      throw new Error(`HubSpot PATCH contact failed: ${res.status}`)
    }
    return { id: existingId }
  }

  const res = await hubspotFetch('/crm/v3/objects/contacts', {
    method: 'POST',
    body: JSON.stringify({ properties: cleanProps }),
  })
  if (!res.ok) {
    const body = await res.text()
    logError('[HubSpot] upsertContact POST failed', { status: res.status, body })
    throw new Error(`HubSpot POST contact failed: ${res.status}`)
  }
  const created = await res.json() as { id: string }
  return { id: created.id }
}

export async function createOrUpdateDeal(
  props: HubSpotDeal,
  contactId: string
): Promise<{ id: string }> {
  const properties: Record<string, string | number | undefined> = {
    dealname: props.dealname,
    dealstage: props.dealstage,
    pipeline: props.pipeline ?? 'default',
    amount: props.amount,
    closedate: props.closedate,
    revolis_lead_id: props.revolis_lead_id,
  }

  const cleanProps = Object.fromEntries(
    Object.entries(properties).filter(([, v]) => v !== undefined)
  )

  const res = await hubspotFetch('/crm/v3/objects/deals', {
    method: 'POST',
    body: JSON.stringify({
      properties: cleanProps,
      associations: [
        {
          to: { id: contactId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }],
        },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    logError('[HubSpot] createOrUpdateDeal failed', { status: res.status, body })
    throw new Error(`HubSpot POST deal failed: ${res.status}`)
  }

  const created = await res.json() as { id: string }
  return { id: created.id }
}
