import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, name, source } = await req.json()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Revolis.AI <noreply@revolis.ai>',
        to: ['innovium1@gmail.com'],
        subject: `Nový lead: ${email}`,
        text: `Zdroj: ${source}\nMeno: ${name || '—'}\nEmail: ${email}`,
      }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
