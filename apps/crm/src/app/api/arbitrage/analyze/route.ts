import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkAiRateLimit } from '@/lib/ai/rate-guard'
import { ARBITRAGE_DEMO_CANDIDATES } from '@/lib/arbitrage/demo-candidates'
import { isArbitrageDemoAllowed } from '@/lib/arbitrage/demo-guard'
import { listMatchesForProfile } from '@/lib/arbitrage/list-matches'
import { mapMatchesToAcquisitionCandidates } from '@/lib/arbitrage/map-to-acquisition'

export const ARBITRAGE_EMPTY_MESSAGE =
  'Arbitrážny scan beží — zatiaľ žiadne zhody. Zobrazia sa po prvom prebehnutí cronu.'

type AnalyzeBody = {
  demo?: boolean
  limit?: number
  status?: 'active' | 'all' | 'new' | 'viewed' | 'contacted' | 'dismissed' | 'expired'
}

export async function POST(request: Request) {
  const supabaseAuth = await createServerClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const block = await checkAiRateLimit(user.id, 'arbitrage-analyze', 20)
  if (block) return NextResponse.json(block, { status: 429 })

  try {
    const body = (await request.json().catch(() => ({}))) as AnalyzeBody
    const demoAllowed = isArbitrageDemoAllowed()

    if (body.demo === true && demoAllowed) {
      return NextResponse.json({
        candidates: ARBITRAGE_DEMO_CANDIDATES,
        source: 'demo',
        demoAllowed,
        empty: false,
      })
    }

    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const limit = Math.min(body.limit ?? 20, 50)
    const status = body.status ?? 'active'

    const matches = await listMatchesForProfile({
      profileId: profile.id,
      limit,
      status,
    })

    const candidates = mapMatchesToAcquisitionCandidates(matches)

    if (candidates.length === 0) {
      return NextResponse.json({
        candidates: [],
        source: 'live',
        demoAllowed,
        empty: true,
        message: ARBITRAGE_EMPTY_MESSAGE,
      })
    }

    return NextResponse.json({
      candidates,
      source: 'live',
      demoAllowed,
      empty: false,
    })
  } catch (err) {
    console.error('[arbitrage/analyze]', err)
    return NextResponse.json({ error: 'Analýza arbitráže zlyhala.' }, { status: 500 })
  }
}
