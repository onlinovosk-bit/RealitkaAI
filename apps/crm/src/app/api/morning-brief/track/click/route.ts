// GET /api/morning-brief/track/click?brief=[briefId]&lead=[leadId]
// Records click, redirects to lead detail
import { NextRequest, NextResponse } from 'next/server'
import { createClient }               from '@/lib/supabase/server'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.revolis.ai'

export async function GET(request: NextRequest) {
  const briefId = request.nextUrl.searchParams.get('brief')
  const leadId  = request.nextUrl.searchParams.get('lead')

  if (briefId && leadId) {
    const supabase = await createClient()
    await supabase.rpc('record_brief_click', {
      p_brief_id: briefId,
      p_lead_id:  leadId,
    })
  }

  const destination = leadId
    ? `${BASE_URL}/leads/${leadId}`
    : `${BASE_URL}/leads`

  return NextResponse.redirect(destination, { status: 302 })
}
