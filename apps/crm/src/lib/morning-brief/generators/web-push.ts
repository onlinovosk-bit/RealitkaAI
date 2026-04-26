// ================================================================
// Revolis.AI — Web Push Notification Sender
// Uses web-push library (VAPID keys required)
// ================================================================
import type { BriefSettings, MorningBriefData } from '@/types/morning-brief'

// Lazy-load web-push to avoid build errors if package not installed
async function getWebPush() {
  try {
    return await import('web-push') as typeof import('web-push')
  } catch {
    console.warn('[web-push] package not installed: npm install web-push')
    return null
  }
}

export async function sendPushNotification(
  subscription: NonNullable<BriefSettings['push_subscription']>,
  brief:        MorningBriefData
): Promise<boolean> {
  const webpush = await getWebPush()
  if (!webpush) return false

  const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
  const VAPID_EMAIL   = process.env.VAPID_EMAIL ?? 'mailto:support@revolis.ai'

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn('[web-push] VAPID keys not configured — skipping push')
    return false
  }

  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

  const urgencyEmoji = brief.action.urgency === 'high' ? '🔥'
    : brief.action.urgency === 'medium' ? '📈' : '📋'

  const payload = JSON.stringify({
    title: `${urgencyEmoji} ${brief.topLead.name} · BRI ${brief.topLead.score}/100`,
    body:  brief.action.context.slice(0, 120),
    icon:  '/icons/revolis-192.png',
    badge: '/icons/revolis-badge-72.png',
    tag:   `morning-brief-${brief.briefId}`,
    data: {
      briefId: brief.briefId,
      leadId:  brief.topLead.id,
      url:     `https://app.revolis.ai/leads/${brief.topLead.id}`,
    },
    actions: [
      { action: 'open-lead', title: 'Otvoriť lead' },
      { action: 'dismiss',   title: 'Neskôr' },
    ],
  })

  try {
    await webpush.sendNotification(
      subscription as Parameters<typeof webpush.sendNotification>[0],
      payload,
      { TTL: 3600 }    // expire after 1 hour — brief is time-sensitive
    )
    return true
  } catch (err: any) {
    if (err.statusCode === 410) {
      // Subscription expired — caller should remove from DB
      throw new Error('SUBSCRIPTION_EXPIRED')
    }
    console.error('[web-push] send failed:', err.message)
    return false
  }
}
