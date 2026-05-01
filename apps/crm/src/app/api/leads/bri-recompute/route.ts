// ================================================================
// Revolis.AI — POST /api/leads/bri-recompute
// On-demand BRI recompute for a single lead
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { createClient }              from '@/lib/supabase/server'
import { computeBRI }                from '@/lib/bri/engine'
import { UUIDSchema, validateBody }  from '@/lib/api-validate'

const BRIRecomputeSchema = z.object({
  leadId:  UUIDSchema,
  trigger: z.string().max(100).optional(),
})

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

    const validation = await validateBody(request, BRIRecomputeSchema)
    if (!validation.ok) return validation.response

    const { leadId, trigger } = validation.data

    const result = await computeBRI(leadId, profile.id, trigger ?? 'manual_recompute')
    if (!result) return NextResponse.json({ error: 'Compute failed' }, { status: 500 })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[bri-recompute]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
