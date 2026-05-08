// GET /api/notifications/unsubscribe?profile=[profileId]
// One-click unsubscribe from email footer — no login required (standard email UX).
// profileId must be a valid UUID to prevent IDOR enumeration.
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

const BASE_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.revolis.ai'
const UUID_RE   = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get('profile')

  if (profileId && UUID_RE.test(profileId)) {
    const supabase = await createClient()
    await supabase
      .from('morning_brief_settings')
      .update({ enabled: false })
      .eq('profile_id', profileId)
  }

  return NextResponse.redirect(`${BASE_URL}/settings/notifications?unsubscribed=1`, { status: 302 })
}
