// ================================================================
// Revolis.AI — Agent Integrity Monitor
// Detects and alerts on suspicious data export patterns
// ================================================================
import { createClient }  from '@/lib/supabase/server'
import { Resend }        from 'resend'
import type { EventType } from '@/types/events'

const EXPORT_EVENT_TYPES: EventType[] = [
  'export_contacts', 'bulk_view', 'csv_download', 'data_export'
]

interface IntegrityThresholds {
  bulkExportPerDay:   number  // default: 50
  massViewPerHour:    number  // default: 100
  offHoursAlert:      boolean // alert if exports happen 23:00–06:00
}

const DEFAULT_THRESHOLDS: IntegrityThresholds = {
  bulkExportPerDay: 50,
  massViewPerHour:  100,
  offHoursAlert:    true,
}

/**
 * Run integrity check for a specific user action.
 * Called after every export/bulk-view event.
 */
export async function checkIntegrity(
  profileId:  string,
  userId:     string,
  eventType:  EventType,
  entityCount: number
): Promise<boolean> {
  if (!EXPORT_EVENT_TYPES.includes(eventType)) return false

  const supabase = await createClient()
  const now = new Date()
  const hour = now.getHours()

  // Check off-hours
  const isOffHours = hour >= 23 || hour < 6

  // Count exports in last 24h for this user
  const yesterday = new Date(Date.now() - 86400000).toISOString()
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .in('event_type', EXPORT_EVENT_TYPES)
    .gte('created_at', yesterday)

  const dailyCount = count ?? 0
  const shouldAlert =
    (entityCount >= DEFAULT_THRESHOLDS.bulkExportPerDay) ||
    (dailyCount >= DEFAULT_THRESHOLDS.bulkExportPerDay)  ||
    (isOffHours && DEFAULT_THRESHOLDS.offHoursAlert && entityCount >= 10)

  if (shouldAlert) {
    await triggerIntegrityAlert(profileId, userId, eventType, entityCount, {
      daily_export_count: dailyCount,
      is_off_hours: isOffHours,
      hour,
    })
    return true
  }
  return false
}

async function triggerIntegrityAlert(
  profileId:    string,
  triggeredBy:  string,
  alertType:    EventType,
  thresholdHit: number,
  payload:      Record<string, unknown>
): Promise<void> {
  const supabase = await createClient()

  // Insert alert record
  await supabase.from('integrity_alerts').insert({
    profile_id:    profileId,
    triggered_by:  triggeredBy,
    alert_type:    alertType === 'export_contacts' ? 'bulk_export' : 'unusual_access',
    threshold_hit: thresholdHit,
    payload,
  })

  // Get owner email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', profileId)
    .single()

  if (!profile?.email) return

  // Send alert email
  const resend = new Resend(process.env.RESEND_API_KEY!)
  await resend.emails.send({
    from:    'Revolis.AI Security <security@revolis.ai>',
    to:      profile.email,
    subject: `Revolis.AI — Bezpečnostný alert: nezvyčajná aktivita`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#991B1B;">Bezpečnostný alert</h2>
        <p>Dobrý deň ${profile.full_name ?? ''},</p>
        <p>Zaznamenali sme nezvyčajnú aktivitu vo vašom Revolis.AI workspace:</p>
        <ul>
          <li><strong>Typ aktivity:</strong> ${alertType}</li>
          <li><strong>Počet záznamov:</strong> ${thresholdHit}</li>
          <li><strong>Čas:</strong> ${new Date().toLocaleString('sk-SK')}</li>
          ${payload.is_off_hours ? '<li><strong>Upozornenie:</strong> Aktivita mimo pracovných hodín</li>' : ''}
        </ul>
        <p>Ak ste túto akciu nevykonali vy, odporúčame okamžite:</p>
        <ol>
          <li>Zmeniť heslo dotknutého účtu</li>
          <li>Skontrolovať históriu aktivít v Audit Log</li>
          <li>Kontaktovať support@revolis.ai</li>
        </ol>
        <a href="https://app.revolis.ai/security/alerts" 
           style="display:inline-block;background:#0A6E8A;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:12px;">
          Zobraziť detaily alertu
        </a>
        <p style="color:#64748B;font-size:12px;margin-top:24px;">
          Revolis.AI Security · Tento e-mail bol vygenerovaný automaticky.
        </p>
      </div>
    `,
  })
}
