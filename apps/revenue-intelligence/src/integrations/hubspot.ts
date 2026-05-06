import axios from 'axios'

const BASE = 'https://api.hubapi.com'

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN ?? ''}`,
    'Content-Type': 'application/json',
  }
}

export interface HubSpotContact {
  id: string
  email: string
  firstname?: string
  lastname?: string
  company?: string
}

export async function createOrUpdateContact(params: {
  email: string
  firstname?: string
  lastname?: string
  company?: string
}): Promise<HubSpotContact> {
  const res = await axios.post(
    `${BASE}/crm/v3/objects/contacts`,
    {
      properties: {
        email: params.email,
        firstname: params.firstname ?? '',
        lastname: params.lastname ?? '',
        company: params.company ?? '',
        hs_lead_status: 'NEW',
      },
    },
    { headers: headers() }
  )
  return {
    id: res.data.id as string,
    email: params.email,
    firstname: params.firstname,
    lastname: params.lastname,
    company: params.company,
  }
}

export async function createDeal(params: {
  dealname: string
  hubspot_owner_id?: string
  amount?: number
}): Promise<string> {
  const res = await axios.post(
    `${BASE}/crm/v3/objects/deals`,
    {
      properties: {
        dealname: params.dealname,
        dealstage: 'appointmentscheduled',
        amount: params.amount?.toString() ?? '',
        hubspot_owner_id: params.hubspot_owner_id ?? '',
      },
    },
    { headers: headers() }
  )
  return res.data.id as string
}

export async function associateContactToDeal(contactId: string, dealId: string): Promise<void> {
  await axios.put(
    `${BASE}/crm/v4/objects/contacts/${contactId}/associations/deals/${dealId}`,
    [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }],
    { headers: headers() }
  )
}

export async function updateDealStage(dealId: string, stage: string): Promise<void> {
  await axios.patch(
    `${BASE}/crm/v3/objects/deals/${dealId}`,
    { properties: { dealstage: stage } },
    { headers: headers() }
  )
}
