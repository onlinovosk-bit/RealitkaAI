// GET /api/notifications/unsubscribe?profile=[profileId]
// One-click unsubscribe from email footer
import { NextRequest, NextResponse } from 'next/server'
import { createClient }               from '@/lib/supabase/server'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.revolis.ai'

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get('profile')
  if (profileId) {
    const supabase = await createClient()
    await supabase
      .from('morning_brief_settings')
      .update({ enabled: false })
      .eq('profile_id', profileId)
  }
  return NextResponse.redirect(`${BASE_URL}/settings/notifications?unsubscribed=1`, { status: 302 })
}
