import { NextRequest, NextResponse } from 'next/server'

const PORTAL_ID = process.env.HUBSPOT_PORTAL_ID
const FORM_ID = process.env.HUBSPOT_FORM_ID

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { email, name, source } = body as Record<string, string>

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  if (PORTAL_ID && FORM_ID) {
    const fields: { name: string; value: string }[] = [{ name: 'email', value: email }]
    if (name) fields.push({ name: 'firstname', value: name })
    if (source) fields.push({ name: 'cta_source', value: source })

    const utmRaw = req.headers.get('x-utm-data')
    const context: Record<string, string> = {
      pageUri: 'https://revolis.ai',
      pageName: 'Revolis.AI Landing Page',
    }
    if (utmRaw) {
      try {
        const utm = JSON.parse(utmRaw) as Record<string, string>
        if (utm.source) context['hutk'] = ''
        Object.assign(context, utm)
      } catch { /* ignore */ }
    }

    await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}/${FORM_ID}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, context }),
      }
    ).catch(() => { /* log in production monitoring */ })
  }

  return NextResponse.json({ ok: true })
}
