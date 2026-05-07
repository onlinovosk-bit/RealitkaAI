import { NextRequest, NextResponse } from 'next/server'

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY ?? ''

const PRICE_IDS: Record<string, string> = {
  'pricing-smart-start':       process.env.STRIPE_PRICE_SMART_START       ?? '',
  'pricing-active-force':      process.env.STRIPE_PRICE_RADAR_MAKLERA     ?? '',
  'pricing-market-vision':     process.env.STRIPE_PRICE_STRAZCA           ?? '',
  'pricing-protocol-authority':process.env.STRIPE_PRICE_REALITY_MONOPOL  ?? '',
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { email?: string; name?: string; plan?: string }
  const { email, name, plan } = body

  if (!email || !plan) {
    return NextResponse.json({ error: 'email and plan required' }, { status: 400 })
  }

  if (!STRIPE_SECRET) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 })
  }

  const priceId = PRICE_IDS[plan]
  if (!priceId) {
    return NextResponse.json({ error: 'unknown_plan' }, { status: 400 })
  }

  const origin = req.headers.get('origin') ?? (process.env.NEXT_PUBLIC_APP_URL ?? 'https://revolis.ai')
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL ?? 'https://app.revolis.ai'

  const params = new URLSearchParams({
    'payment_method_types[0]':  'card',
    'line_items[0][price]':      priceId,
    'line_items[0][quantity]':   '1',
    'mode':                      'subscription',
    'customer_email':            email,
    'success_url':               `${crmUrl}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
    'cancel_url':                `${origin}/?checkout=cancelled`,
    'metadata[customer_name]':   name ?? '',
    'metadata[customer_email]':  email,
    'metadata[plan]':            plan,
  })

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
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
