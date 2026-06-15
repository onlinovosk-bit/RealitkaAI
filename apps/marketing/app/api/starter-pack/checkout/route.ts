import { NextRequest, NextResponse } from 'next/server'

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY ?? ''
const STARTER_PACK_PRICE = process.env.STRIPE_PRICE_STARTER_PACK ?? ''

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    email?: string
    name?: string
    marketingConsent?: boolean
  }

  const email = String(body.email ?? '').trim()
  const name = String(body.name ?? '').trim()

  if (!email) {
    return NextResponse.json({ error: 'email_required' }, { status: 400 })
  }

  if (!body.marketingConsent) {
    return NextResponse.json({ error: 'consent_required' }, { status: 400 })
  }

  if (!STRIPE_SECRET || !STARTER_PACK_PRICE) {
    return NextResponse.json({ error: 'checkout_not_configured' }, { status: 503 })
  }

  const origin = req.headers.get('origin') ?? 'https://revolis.ai'

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'payment_method_types[0]': 'card',
      'line_items[0][price]': STARTER_PACK_PRICE,
      'line_items[0][quantity]': '1',
      mode: 'payment',
      customer_email: email,
      success_url: `${origin}/balik?success=1`,
      cancel_url: `${origin}/balik?cancelled=1`,
      'metadata[checkoutType]': 'starter_pack',
      'metadata[customer_name]': name,
      'metadata[customer_email]': email,
      'metadata[product]': 'starter_pack',
    }).toString(),
  })

  const session = await stripeRes.json() as { url?: string; error?: { message: string } }

  if (!stripeRes.ok || !session.url) {
    return NextResponse.json(
      { error: session.error?.message ?? 'stripe_error' },
      { status: 502 },
    )
  }

  return NextResponse.json({ url: session.url })
}
