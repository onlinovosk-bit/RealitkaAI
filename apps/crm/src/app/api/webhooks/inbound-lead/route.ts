// ================================================================
// Revolis.AI — Inbound Lead Webhook
// POST /api/webhooks/inbound-lead
// Called by marketing site, portals, or any form integration.
// Auth: Bearer ${INBOUND_WEBHOOK_SECRET} (optional but recommended)
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { processInboundLead }        from '@/lib/inbound/process-lead'

export async function POST(request: NextRequest) {
  const secret = process.env.INBOUND_WEBHOOK_SECRET
  if (secret) {
    if (request.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name      = String(body.name      ?? '').trim()
  const profileId = String(body.profileId ?? '').trim()

  if (!name || !profileId) {
    return NextResponse.json(
      { error: 'Polia name a profileId sú povinné.' },
      { status: 400 }
    )
  }

  try {
    const result = await processInboundLead({
      name,
      profileId,
      email:        body.email        ? String(body.email)        : undefined,
      phone:        body.phone        ? String(body.phone)        : undefined,
      source:       body.source       ? String(body.source)       : 'Inbound',
      message:      body.message      ? String(body.message)      : undefined,
      propertyType: body.propertyType ? String(body.propertyType) : undefined,
      location:     body.location     ? String(body.location)     : undefined,
      budget:       body.budget       ? String(body.budget)       : undefined,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    console.error('[inbound-lead]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
