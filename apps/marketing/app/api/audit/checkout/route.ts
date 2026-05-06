import { NextRequest, NextResponse } from 'next/server'

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY ?? ''
const PRICE_IDS = {
  audit_149: process.env.STRIPE_PRICE_AUDIT_149 ?? '',
  audit_99:  process.env.STRIPE_PRICE_AUDIT_99  ?? '',
} as const

type PriceTier = keyof typeof PRICE_IDS

function resolvePriceTier(subscriptionStatus: string | null): PriceTier {
  // annual subscribers get free audit handled separately via success_url param
  // active monthly subscribers pay 99€
  if (subscriptionStatus === 'active_monthly') return 'audit_99'
  return 'audit_149'
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { name?: string; email?: string; phone?: string }
  const { name, email, phone } = body

  if (!name || !email) {
    return NextResponse.json({ error: 'name and email required' }, { status: 400 })
  }

  if (!STRIPE_SECRET) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 })
  }

  // Resolve price tier — anonymous visitors always get 149€
  // TODO: check active subscription via Supabase once auth is wired
  const tier = resolvePriceTier(null)
  const priceId = PRICE_IDS[tier]

  if (!priceId) {
    return NextResponse.json({ error: 'price_not_configured' }, { status: 503 })
  }

  const origin = req.headers.get('origin') ?? 'https://revolis.ai'

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'payment_method_types[0]':    'card',
      'line_items[0][price]':        priceId,
      'line_items[0][quantity]':     '1',
      'mode':                        'payment',
      'customer_email':              email,
      'success_url':                 `${origin}/audit/upload?session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url':                  `${origin}/?audit=cancelled`,
      'metadata[customer_name]':     name,
      'metadata[customer_email]':    email,
      'metadata[customer_phone]':    phone ?? '',
      'metadata[product]':           tier,
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
