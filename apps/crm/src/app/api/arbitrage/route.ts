// ================================================================
// Revolis.AI — GET /api/arbitrage
// Returns arbitrage matches for the current user
// Supports: ?status=new&city=Prešov&limit=20&sort=delta_eur
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient }               from '@/lib/supabase/server'
import type { MatchStatus }           from '@/types/arbitrage'

const VALID_SORTS   = ['delta_eur', 'delta_pct', 'match_score', 'detected_at', 'price_drop_count']
const VALID_STATUSES: MatchStatus[] = ['new', 'viewed', 'contacted', 'dismissed', 'expired']

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

    const params  = request.nextUrl.searchParams
    const status  = params.get('status') as MatchStatus | null
    const city    = params.get('city')
    const limit   = Math.min(parseInt(params.get('limit') ?? '20'), 100)
    const sort    = VALID_SORTS.includes(params.get('sort') ?? '') ? params.get('sort')! : 'delta_eur'
    const minPct  = parseFloat(params.get('min_delta_pct') ?? '0')

    let query = supabase
      .from('arbitrage_matches')
      .select(`
        *,
        portal_listing:listing_portal(
          id, source, external_url, title, price, area_m2,
          rooms, city, street, cover_photo_url, seller_name
        ),
        bazos_listing:listing_bazos(
          id, source, external_url, title, price, area_m2,
          rooms, seller_type, seller_phone
        )
      `)
      .eq('profile_id', profile.id)

    if (status && VALID_STATUSES.includes(status)) {
      query = query.eq('status', status)
    } else {
      query = query.in('status', ['new', 'viewed'])
    }

    if (city) query = query.eq('city', city)
    if (minPct > 0) query = query.gte('delta_pct', minPct)

    query = query
      .order(sort, { ascending: false })
      .limit(limit)

    const { data: matches, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Get stats
    const { data: stats } = await supabase
      .from('arbitrage_stats')
      .select('*')
      .eq('profile_id', profile.id)
      .single()

    return NextResponse.json({
      ok:      true,
      matches: matches ?? [],
      stats:   stats   ?? null,
      count:   (matches ?? []).length,
    })
  } catch (err) {
    console.error('[GET /api/arbitrage]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH /api/arbitrage — update match status
export async function PATCH(request: NextRequest) {
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

    const { matchId, status, dismissed_reason } = await request.json() as {
      matchId:           string
      status:            MatchStatus
      dismissed_reason?: string
    }

    if (!matchId || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
    }

    const { error } = await supabase
      .from('arbitrage_matches')
      .update({
        status,
        dismissed_reason: dismissed_reason ?? null,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', matchId)
      .eq('profile_id', profile.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
