// ================================================================
// Revolis.AI — Inbound Lead Processor
// insert → BRI → logEvent → auto-reply (email + WhatsApp)
// ================================================================
import { createClient }      from '@/lib/supabase/server'
import { computeBRI }        from '@/lib/bri/engine'
import { logEvent }          from '@/lib/events/log-event'
import { generateAutoReply } from './auto-reply'
import { Resend }            from 'resend'

const FROM               = process.env.OUTREACH_FROM_EMAIL ?? 'noreply@revolis.ai'
const BRI_REPLY_THRESHOLD = 40   // minimum score to trigger auto-reply

export interface InboundLeadPayload {
  name:          string
  email?:        string
  phone?:        string
  source?:       string
  message?:      string
  propertyType?: string
  location?:     string
  budget?:       string
  profileId:     string
}

export interface ProcessLeadResult {
  leadId:        string
  briScore:      number
  replySent:     boolean
  replyChannels: string[]
}

export async function processInboundLead(
  payload: InboundLeadPayload
): Promise<ProcessLeadResult> {
  const supabase = await createClient()

  // 1. Insert lead
  const leadId = crypto.randomUUID()
  await supabase.from('leads').insert({
    id:              leadId,
    name:            payload.name,
    email:           payload.email ?? '',
    phone:           payload.phone ?? '',
    source:          payload.source ?? 'Inbound',
    note:            payload.message ?? '',
    location:        payload.location ?? '',
    budget:          payload.budget ?? '',
    property_type:   payload.propertyType ?? 'Byt',
    status:          'Nový',
    score:           50,
    assigned_agent:  'Nepriradený',
    last_contact:    'Práve importovaný',
  })

  // 2. Compute BRI
  const bri      = await computeBRI(leadId, payload.profileId, 'lead_created')
  const briScore = bri?.new_score ?? 50

  // 3. Audit event
  await logEvent({
    profileId:  payload.profileId,
    entityType: 'lead',
    entityId:   leadId,
    eventType:  'lead_created',
    payload: {
      source:    payload.source,
      bri_score: briScore,
      has_email: !!payload.email,
      has_phone: !!payload.phone,
    },
  })

  const replyChannels: string[] = []

  if (briScore < BRI_REPLY_THRESHOLD || !payload.email) {
    return { leadId, briScore, replySent: false, replyChannels }
  }

  // 4. Generate AI reply
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', payload.profileId)
    .single()

  if (profileErr || !profile) {
    console.error('[processInboundLead] profile not found:', payload.profileId)
    return { leadId, briScore, replySent: false, replyChannels }
  }

  const reply = await generateAutoReply({
    leadName:     payload.name,
    source:       payload.source ?? 'web',
    message:      payload.message,
    propertyType: payload.propertyType,
    location:     payload.location,
    budget:       payload.budget,
    agentName:    profile?.full_name ?? undefined,
  })

  // 5. Email via Resend
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    await resend.emails.send({
      from:    FROM,
      to:      payload.email,
      subject: reply.subject,
      text:    reply.body,
    })
    replyChannels.push('email')
    logEvent({
      profileId:  payload.profileId,
      entityType: 'lead',
      entityId:   leadId,
      eventType:  'message_sent',
      payload:    { channel: 'email', subject: reply.subject, auto_reply: true },
    }).catch(e => console.error('[processInboundLead] logEvent email:', e))
  } catch (err: any) {
    console.error('[processInboundLead] email failed:', err.message)
  }

  // 6. WhatsApp (no-op if env vars not set)
  if (payload.phone && process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
    try {
      await sendWhatsApp(payload.phone, reply.body)
      replyChannels.push('whatsapp')
      logEvent({
        profileId:  payload.profileId,
        entityType: 'lead',
        entityId:   leadId,
        eventType:  'message_sent',
        payload:    { channel: 'whatsapp', auto_reply: true },
      }).catch(e => console.error('[processInboundLead] logEvent whatsapp:', e))
    } catch (err: any) {
      console.error('[processInboundLead] WhatsApp failed:', err.message)
    }
  }

  return { leadId, briScore, replySent: replyChannels.length > 0, replyChannels }
}

async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const token   = process.env.WHATSAPP_TOKEN!
  const phoneId = process.env.WHATSAPP_PHONE_ID!
  // Ensure E.164 — default to SK prefix if no country code
  const to = phone.startsWith('+')
    ? phone.replace(/\s/g, '')
    : `+421${phone.replace(/\D/g, '')}`

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneId}/messages`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }),
    }
  )

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`WhatsApp API ${res.status}: ${detail}`)
  }
}
