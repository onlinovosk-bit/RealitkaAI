export interface HubSpotContact {
  id?: string
  email: string
  firstname?: string
  lastname?: string
  phone?: string
  company?: string
  revolis_lead_id?: string
  revolis_status?: string
  revolis_score?: number
  revolis_source?: string
  hs_lead_status?: string
}

export interface HubSpotDeal {
  id?: string
  dealname: string
  dealstage: string
  pipeline?: string
  amount?: number
  closedate?: string
  revolis_lead_id?: string
}

export interface HubSpotSyncResult {
  ok: boolean
  contactId?: string
  dealId?: string
  error?: string
}
