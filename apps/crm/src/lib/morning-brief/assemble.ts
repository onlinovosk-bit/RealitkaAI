// ================================================================
// Revolis.AI — Morning Brief Assembler
// Assembles MorningBriefData from gathered raw data + AI text
// ================================================================
import { gatherBriefData }      from './gather'
import { generateBriefText }    from './generators/ai-text'
import { renderBriefEmail }     from './generators/email-html'
import { sendPushNotification } from './generators/web-push'
import { createClient }         from '@/lib/supabase/server'
import { Resend }               from 'resend'
import type { MorningBriefData } from '@/types/morning-brief'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.revolis.ai'

export interface DeliveryResult {
  briefId:    string
  profileId:  string
  delivered:  boolean
  channels:   string[]
  error?:     string
}

/**
 * Full pipeline: gather → AI text → assemble → deliver.
 * This is the function called by the cron job.
 */
export async function generateAndDeliverBrief(
  profileId: string
): Promise<DeliveryResult | null> {
  const supabase = await createClient()

  // 1. Gather all data
  const gathered = await gatherBriefData(profileId)
  if (!gathered || gathered.hotLeads.length === 0) return null

  const top      = gathered.hotLeads[0]
  const variant  = gathered.settings.a_b_variant
  const channels = gathered.settings.channels

  // 2. Generate AI text
  const generated = await generateBriefText(gathered, variant)

  // 3. Assemble MorningBriefData
  const brief: MorningBriefData = {
    briefId:      crypto.randomUUID(),
    profileId,
    generatedAt:  new Date().toISOString(),

    topLead: {
      id:         top.lead_id ?? (top as any).id,
      name:       top.full_name,
      score:      top.bri_score,
      trajectory: (top as any).trajectory ?? 'stable',
      reason:     buildLeadReason(top),
      lastAction: gathered.overnight.replies.find(
        r => r.leadId === (top.lead_id ?? (top as any).id)
      )?.messagePreview ?? 'Aktívny v pipeline',
      phone:      top.phone ?? null,
      email:      null,
      property:   null,
    },

    overnight: {
      totalChanges:
        gathered.overnight.lvChanges.length +
        gathered.overnight.arbitrage.length +
        gathered.overnight.priceDrops.length +
        gathered.overnight.replies.length,
      newLeads:   gathered.overnight.newLeads,
      lvChanges:  gathered.overnight.lvChanges,
      arbitrage:  gathered.overnight.arbitrage,
      priceDrops: gathered.overnight.priceDrops,
      replies:    gathered.overnight.replies,
    },

    action: {
      verb:     generated.actionVerb,
      target:   top.full_name,
      context:  generated.actionText,
      deepLink: `${BASE_URL}/leads/${top.lead_id ?? (top as any).id}`,
      urgency:  generated.urgency,
    },

    stats: gathered.stats,
    aiText:      generated.aiText,
    subjectLine: generated.subjectLine,
    variant,
  }

  // 4. Persist brief record
  const { data: record, error: insertErr } = await supabase
    .from('morning_briefs')
    .insert({
      id:               brief.briefId,
      profile_id:       profileId,
      top_lead_id:      brief.topLead.id,
      top_lead_score:   brief.topLead.score,
      brief_text:       brief.aiText,
      action_text:      brief.action.context,
      overnight_count:  brief.overnight.totalChanges,
      channel:          channels[0] ?? 'email',
      a_b_variant:      variant,
      subject_line:     brief.subjectLine,
      new_leads_count:  brief.overnight.newLeads,
      lv_changes_count: brief.overnight.lvChanges.length,
      arbitrage_count:  brief.overnight.arbitrage.length,
      hot_leads_count:  brief.stats.hotLeads,
    })
    .select('id')
    .single()

  if (insertErr) {
    console.error('[assemble] insert failed:', insertErr.message)
  }

  // 5. Deliver via configured channels
  const deliveredChannels: string[] = []
  let deliveryError: string | undefined

  // ── Email ────────────────────────────────────────────────
  if (channels.includes('email')) {
    try {
      const resend   = new Resend(process.env.RESEND_API_KEY!)
      const emailHtml = renderBriefEmail(brief)

      await resend.emails.send({
        from:    'Revolis.AI Brief <briefing@revolis.ai>',
        to:      gathered.ownerEmail,
        subject: brief.subjectLine,
        html:    emailHtml,
        headers: {
          'X-Brief-ID': brief.briefId,
          'X-Entity-Ref-ID': brief.briefId,  // Resend dedup
        },
      })

      deliveredChannels.push('email')
    } catch (err: any) {
      console.error('[assemble] email failed:', err.message)
      deliveryError = err.message
    }
  }

  // ── Web Push ─────────────────────────────────────────────
  if (channels.includes('push') && gathered.settings.push_subscription) {
    try {
      const sent = await sendPushNotification(
        gathered.settings.push_subscription,
        brief
      )
      if (sent) deliveredChannels.push('push')
    } catch (err: any) {
      if (err.message === 'SUBSCRIPTION_EXPIRED') {
        // Remove expired subscription
        await supabase
          .from('morning_brief_settings')
          .update({ push_subscription: null })
          .eq('profile_id', profileId)
      }
      deliveryError = err.message
    }
  }

  // 6. Update delivery timestamp
  if (deliveredChannels.length > 0) {
    await supabase
      .from('morning_briefs')
      .update({ delivered_at: new Date().toISOString() })
      .eq('id', brief.briefId)
  }

  return {
    briefId:   brief.briefId,
    profileId,
    delivered: deliveredChannels.length > 0,
    channels:  deliveredChannels,
    error:     deliveryError,
  }
}

function buildLeadReason(top: Record<string, any>): string {
  const recency    = top.recency_score    ?? 0
  const engagement = top.engagement_score ?? 0
  if (recency > 80)    return `aktívny za posledných 6 hodín`
  if (engagement > 80) return `vysoká angažovanosť — ${top.score_factors?.events_24h ?? '?'} udalostí za 24h`
  if (top.bri_score >= 80) return `BRI na historickom maxime`
  return `najsilnejší profil vo vašom pipeline`
}
