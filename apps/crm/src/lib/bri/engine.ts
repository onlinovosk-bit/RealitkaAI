// ================================================================
// Revolis.AI — BRI Engine v2
// Server-side compute, history, and notification dispatch
// ================================================================
import { createClient }        from '@/lib/supabase/server'
import { logEvent }            from '@/lib/events/log-event'
import type {
  BRIScoreV2, BRIComputeResult, BRIHistoryPoint, BRIConfig
} from '@/types/bri'

/**
 * Compute (or recompute) BRI for a single lead.
 * Writes to lead_scores + bri_score_history.
 * Dispatches hot/drop notifications if thresholds crossed.
 */
export async function computeBRI(
  leadId:       string,
  profileId:    string,
  triggerEvent: string = 'manual'
): Promise<BRIComputeResult | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .rpc('compute_bri_score_v2', {
        p_lead_id:       leadId,
        p_profile_id:    profileId,
        p_trigger_event: triggerEvent,
      })

    if (error) {
      console.error('[BRI engine] compute error:', error.message)
      return null
    }

    const result = data as BRIComputeResult

    // Side-effect: dispatch notifications for threshold crossings
    await dispatchBRINotifications(result, profileId)

    // Log BRI compute event (for audit + future ML training)
    await logEvent({
      profileId,
      entityType: 'lead',
      entityId:   leadId,
      eventType:  'bri_score_computed',
      payload: {
        new_score:  result.new_score,
        old_score:  result.old_score,
        delta:      result.delta,
        trajectory: result.trajectory,
        trigger:    triggerEvent,
        is_hot:     result.is_hot,
      },
    })

    return result
  } catch (err) {
    console.error('[BRI engine] unexpected:', err)
    return null
  }
}

/**
 * Get current BRI score from cache (fast path).
 */
export async function getBRI(
  leadId:    string,
  profileId: string
): Promise<BRIScoreV2 | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lead_scores')
    .select('*')
    .eq('lead_id', leadId)
    .eq('profile_id', profileId)
    .single()
  if (error && error.code !== 'PGRST116') console.error('[bri] score fetch error', error.message)
  return (data as BRIScoreV2) ?? null
}

/**
 * Fetch BRI history for sparkline/chart.
 */
export async function getBRIHistory(
  leadId:    string,
  profileId: string,
  limit:     number = 30
): Promise<BRIHistoryPoint[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bri_score_history')
    .select('*')
    .eq('lead_id', leadId)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return ((data ?? []) as BRIHistoryPoint[]).reverse()
}

/**
 * Get top N leads by BRI for a workspace.
 * Used by morning brief, dashboard hot list.
 */
export async function getHotLeads(
  profileId: string,
  limit:     number = 10
): Promise<Array<BRIScoreV2 & { full_name: string; phone: string | null }>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('lead_scores')
    .select('*, leads(full_name, phone)')
    .eq('profile_id', profileId)
    .gte('bri_score', 60)
    .order('bri_score', { ascending: false })
    .limit(limit)

  return (data ?? []).map(row => ({
    ...row,
    full_name: (row.leads as any)?.full_name ?? 'Neznámy',
    phone:     (row.leads as any)?.phone     ?? null,
  }))
}

/**
 * Batch recompute for all active leads in a workspace.
 * Called by 6h cron.
 */
export async function batchComputeBRI(profileId: string): Promise<number> {
  const supabase = await createClient()
  const { data: leads } = await supabase
    .from('leads')
    .select('id')
    .eq('profile_id', profileId)
    .neq('status', 'archived')

  if (!leads?.length) return 0

  let computed = 0
  // Serialize to avoid DB overload — 50ms gap between each
  for (const lead of leads) {
    const result = await computeBRI(lead.id, profileId, 'cron_6h')
    if (result) computed++
    await new Promise(r => setTimeout(r, 50))
  }
  return computed
}

/**
 * Get workspace BRI config (or create defaults).
 */
export async function getBRIConfig(profileId: string): Promise<BRIConfig> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bri_config')
    .select('*')
    .eq('profile_id', profileId)
    .single()

  if (data) return data as BRIConfig

  // Create defaults
  const { data: created } = await supabase
    .from('bri_config')
    .insert({ profile_id: profileId })
    .select()
    .single()

  return created as BRIConfig
}

// ── Notification dispatch ─────────────────────────────────────
async function dispatchBRINotifications(
  result:    BRIComputeResult,
  profileId: string
): Promise<void> {
  const supabase = await createClient()
  const config = await getBRIConfig(profileId)

  const crossedHot  = result.old_score < config.hot_threshold && result.new_score >= config.hot_threshold
  const bigDrop     = result.delta <= -config.drop_threshold

  if ((!crossedHot && !bigDrop) || (!config.notify_on_hot && !config.notify_on_drop)) return

  // Get lead details
  const { data: lead } = await supabase
    .from('leads')
    .select('full_name, email, phone')
    .eq('id', result.lead_id)
    .single()

  if (!lead) return

  // Get owner email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', profileId)
    .single()

  if (!profile?.email) return

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY!)

  if (crossedHot && config.notify_on_hot) {
    await resend.emails.send({
      from:    'Revolis.AI <alerts@revolis.ai>',
      to:      profile.email,
      subject: `🔥 ${lead.full_name} dosiahol BRI ${result.new_score}/100 — čas konať`,
      html: buildHotLeadEmail(lead, result, profile.full_name ?? ''),
    })
    await supabase
      .from('lead_scores')
      .update({ notification_sent: true })
      .eq('lead_id', result.lead_id)
      .eq('profile_id', profileId)
  }

  if (bigDrop && config.notify_on_drop) {
    await resend.emails.send({
      from:    'Revolis.AI <alerts@revolis.ai>',
      to:      profile.email,
      subject: `⚠ ${lead.full_name} — BRI poklesol o ${Math.abs(result.delta)} bodov`,
      html: buildDropEmail(lead, result, profile.full_name ?? ''),
    })
  }
}

function buildHotLeadEmail(
  lead:    { full_name: string; phone: string | null },
  result:  BRIComputeResult,
  ownerName: string
): string {
  return `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
  <div style="background:#E1F5EE;border-left:4px solid #1D9E75;padding:20px;border-radius:8px;">
    <p style="color:#085041;font-size:12px;font-weight:bold;margin:0 0 8px;text-transform:uppercase;">
      BRI Alert — Horúci lead
    </p>
    <h2 style="color:#0F172A;margin:0 0 6px;font-size:22px;">${lead.full_name}</h2>
    <p style="color:#1D9E75;font-size:32px;font-weight:bold;margin:0 0 12px;">
      ${result.new_score}<span style="font-size:16px;color:#085041;">/100</span>
    </p>
    <p style="color:#0F6E56;margin:0;">
      Nárast o <strong>+${result.delta}</strong> bodov · Trajectory: ${result.trajectory}
    </p>
  </div>
  ${lead.phone ? `
  <div style="margin:16px 0;">
    <a href="tel:${lead.phone}"
       style="display:inline-block;background:#0A6E8A;color:white;padding:12px 24px;
              border-radius:8px;text-decoration:none;font-weight:bold;">
      Zavolať teraz: ${lead.phone}
    </a>
  </div>` : ''}
  <a href="https://app.revolis.ai/leads/${result.lead_id}"
     style="color:#0A6E8A;font-size:13px;">
    Otvoriť lead v Revolis.AI →
  </a>
  <p style="color:#94A3B8;font-size:11px;margin-top:20px;">Revolis.AI · ${ownerName}</p>
</div>`
}

function buildDropEmail(
  lead:    { full_name: string },
  result:  BRIComputeResult,
  ownerName: string
): string {
  return `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
  <div style="background:#FAEEDA;border-left:4px solid #EF9F27;padding:20px;border-radius:8px;">
    <p style="color:#633806;font-size:12px;font-weight:bold;margin:0 0 8px;text-transform:uppercase;">
      BRI Alert — Pokles skóre
    </p>
    <h2 style="color:#0F172A;margin:0 0 6px;">${lead.full_name}</h2>
    <p style="color:#854F0B;font-size:18px;margin:0;">
      BRI kleslo na <strong>${result.new_score}/100</strong>
      (pokles o ${Math.abs(result.delta)} bodov)
    </p>
    <p style="color:#B45309;margin:8px 0 0;font-size:13px;">
      Lead ochladzuje — odporúčame follow-up správu dnes.
    </p>
  </div>
  <a href="https://app.revolis.ai/leads/${result.lead_id}"
     style="display:inline-block;margin-top:16px;background:#0A6E8A;color:white;
            padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
    Otvoriť lead →
  </a>
  <p style="color:#94A3B8;font-size:11px;margin-top:20px;">Revolis.AI · ${ownerName}</p>
</div>`
}
