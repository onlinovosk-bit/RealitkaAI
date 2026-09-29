// ================================================================
// Revolis.AI — Inbound Lead Webhook
// POST /api/webhooks/inbound-lead
// Called by marketing site, portals, or any form integration.
// Auth: Bearer ${INBOUND_WEBHOOK_SECRET} — REQUIRED. Without the env var the
// endpoint is closed (503), never open (TASK-SEC-002).
// ================================================================
import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse }   from 'next/server'
import { InboundLeadError, processInboundLead } from '@/lib/inbound/process-lead'

function bearerMatches(header: string | null, secret: string): boolean {
  if (!header) return false
  // Hash both sides so timingSafeEqual always compares equal-length buffers.
  const a = createHash('sha256').update(header).digest()
  const b = createHash('sha256').update(`Bearer ${secret}`).digest()
  return timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  const secret = process.env.INBOUND_WEBHOOK_SECRET?.trim()
  if (!secret) {
    console.error('[inbound-lead] INBOUND_WEBHOOK_SECRET is not set — endpoint closed')
    return NextResponse.json({ error: 'Webhook nie je nakonfigurovaný.' }, { status: 503 })
  }
  if (!bearerMatches(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  } catch (err) {
    if (err instanceof InboundLeadError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[inbound-lead]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Chyba spracovania leadu.' }, { status: 500 })
  }
}
