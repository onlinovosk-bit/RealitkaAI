interface SendParams {
  to: string
  subject: string
  html: string
  replyTo?: string
}

const FROM = 'Revolis.AI <noreply@revolis.ai>'

export async function sendEmail(params: SendParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[resend] RESEND_API_KEY not set — skipping email to', params.to)
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        reply_to: params.replyTo,
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[resend] send failed', res.status, body.slice(0, 200))
      return false
    }

    return true
  } catch (err) {
    console.error('[resend] network error', (err as Error).message)
    return false
  }
}
