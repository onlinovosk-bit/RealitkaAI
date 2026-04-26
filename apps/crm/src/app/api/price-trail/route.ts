// ================================================================
// Revolis.AI — /api/price-trail
// GET  ?listingId=&propertyId=&limit=
// POST { price, source, listingId?, propertyId?, leadId?, note? }
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient }               from '@/lib/supabase/server'
import {
  getPriceTrail, addPricePoint, getNegotiationBrief,
} from '@/lib/price-trail/engine'
import { generateNegotiationScript } from '@/lib/price-trail/negotiation-script'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('id').eq('auth_user_id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const p          = request.nextUrl.searchParams
    const listingId  = p.get('listingId')  ?? undefined
    const propertyId = p.get('propertyId') ?? undefined
    const withScript = p.get('withScript') === 'true'
    const limit      = parseInt(p.get('limit') ?? '100')

    if (!listingId && !propertyId) {
      return NextResponse.json({ error: 'listingId or propertyId required' }, { status: 400 })
    }

    const [trail, brief] = await Promise.all([
      getPriceTrail({ profileId: profile.id, listingId, propertyId, limit }),
      getNegotiationBrief({ profileId: profile.id, listingId, propertyId }),
    ])

    const script = (withScript && brief)
      ? generateNegotiationScript(brief)
      : null

    return NextResponse.json({ ok: true, trail, brief, script })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('id').eq('auth_user_id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json() as {
      price:       number
      source?:     string
      listingId?:  string
      propertyId?: string
      leadId?:     string
      note?:       string
    }

    if (!body.price || body.price <= 0) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
    }

    const result = await addPricePoint({
      profileId:  profile.id,
      price:      body.price,
      source:     (body.source as any) ?? 'user_input',
      listingId:  body.listingId,
      propertyId: body.propertyId,
      leadId:     body.leadId,
      note:       body.note,
    })

    if (!result) return NextResponse.json({ error: 'Add failed' }, { status: 500 })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
