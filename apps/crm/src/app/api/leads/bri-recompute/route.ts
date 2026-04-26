// ================================================================
// Revolis.AI — POST /api/leads/bri-recompute
// On-demand BRI recompute for a single lead
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { computeBRI }                from '@/lib/bri/engine'

export async function POST(request: NextRequest) {
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

    const { leadId, trigger } = await request.json() as {
      leadId:   string
      trigger?: string
    }
    if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

    const result = await computeBRI(leadId, profile.id, trigger ?? 'manual_recompute')
    if (!result) return NextResponse.json({ error: 'Compute failed' }, { status: 500 })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[bri-recompute]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
