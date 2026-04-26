// POST /api/notifications/subscribe
// Saves Web Push subscription to morning_brief_settings
import { NextRequest, NextResponse }  from 'next/server'
import { createClient }                from '@/lib/supabase/server'
import type { PushSubscriptionJSON }   from '@/types/morning-brief'

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

    const subscription = await request.json() as PushSubscriptionJSON

    await supabase
      .from('morning_brief_settings')
      .upsert({
        profile_id:        profile.id,
        push_subscription: subscription,
        channels:          ['email', 'push'],
        updated_at:        new Date().toISOString(),
      }, { onConflict: 'profile_id' })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
