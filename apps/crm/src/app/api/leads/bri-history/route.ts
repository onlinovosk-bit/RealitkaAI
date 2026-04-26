// ================================================================
// Revolis.AI — GET /api/leads/bri-history?leadId=&limit=
// BRI score history for sparkline chart
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { getBRIHistory }             from '@/lib/bri/engine'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const params = request.nextUrl.searchParams
    const leadId = params.get('leadId')
    const limit  = parseInt(params.get('limit') ?? '30', 10)

    if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

    const history = await getBRIHistory(leadId, profile.id, Math.min(limit, 100))
    return NextResponse.json({ ok: true, history })
  } catch (err) {
    console.error('[bri-history]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
