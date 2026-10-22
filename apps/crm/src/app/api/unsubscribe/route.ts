// /api/unsubscribe?t=<podpísaný token> — odhlásenie z e-mailu bez prihlásenia.
//
// EMAIL-SUPPRESSION-01. Dve cesty, ktoré zámerne nerobia to isté:
//
//   GET  → iba potvrdzovacia stránka, NIČ nemení. Poštové brány a antivírusy
//          odkazy v správach otvárajú automaticky; keby GET odhlasoval, odhlásili
//          by sme aj tých, ktorí sa odhlásiť nechceli.
//   POST → vykoná odhlásenie. Posiela ho tlačidlo na stránke aj poštový klient
//          pri jednom kliku (RFC 8058, hlavička List-Unsubscribe-Post).
//
// Autorizáciu tvorí samotný token (HMAC): bez tajomstva ho nik nevyrobí.
// Vždy sa odpovedá rovnako, či token existuje alebo nie — nič sa nevyzrádza.
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token'
import { addSuppressionByHash } from '@/lib/email/suppression'

export const runtime = 'nodejs'

const HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex',
  'referrer-policy': 'no-referrer',
} as const

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

function page(title: string, message: string, form?: string, status = 200): NextResponse {
  const html = `<!doctype html>
<html lang="sk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>
body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#F8FAFC;color:#0F172A;margin:0;padding:48px 16px}
main{max-width:440px;margin:0 auto;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:32px}
h1{font-size:20px;margin:0 0 12px}p{font-size:15px;line-height:1.5;margin:0 0 20px;color:#334155}
button{background:#0F172A;color:#fff;border:0;border-radius:8px;padding:12px 20px;font-size:15px;cursor:pointer}
</style></head>
<body><main><h1>${title}</h1><p>${message}</p>${form ?? ''}</main></body></html>`
  return new NextResponse(html, { status, headers: HEADERS })
}

function invalid(): NextResponse {
  return page(
    'Odkaz nie je platný',
    'Tento odhlasovací odkaz sa nepodarilo overiť. Ak chcete prestať dostávať správy, odpovedzte na e-mail slovom „odhlásiť“ a adresu vyradíme ručne.',
    undefined,
    400,
  )
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t')
  const payload = verifyUnsubscribeToken(token)
  if (!payload || !token) return invalid()

  const what =
    payload.t === 'b'
      ? 'Ranný prehľad Vám prestaneme posielať.'
      : 'Prestaneme Vám posielať správy od tohto odosielateľa.'
  const form = `<form method="post" action="/api/unsubscribe?t=${escapeAttr(token)}"><button type="submit">Potvrdiť odhlásenie</button></form>`
  return page('Odhlásenie z e-mailov', what, form)
}

export async function POST(request: NextRequest) {
  const payload = verifyUnsubscribeToken(request.nextUrl.searchParams.get('t'))
  if (!payload) return invalid()

  const admin = createServiceRoleClient()
  if (!admin) {
    // Bez zápisového klienta sa odhlásenie nedá zaručiť; radšej priznať chybu
    // než tvrdiť, že sa stalo.
    console.error('[unsubscribe] service role klient nie je dostupný')
    return page('Odhlásenie sa nepodarilo', 'Skúste to prosím o chvíľu znova.', undefined, 503)
  }

  if (payload.t === 'b') {
    const { error } = await admin
      .from('morning_brief_settings')
      .update({ enabled: false })
      .eq('profile_id', payload.p)
    if (error) {
      console.error('[unsubscribe] vypnutie briefu zlyhalo:', error.message)
      return page('Odhlásenie sa nepodarilo', 'Skúste to prosím o chvíľu znova.', undefined, 500)
    }
  } else {
    const res = await addSuppressionByHash(admin, {
      emailHash: payload.h,
      scopeKey: payload.a,
      reason: 'unsubscribe',
      source: 'unsubscribe-link',
    })
    if (!res.ok) {
      return page('Odhlásenie sa nepodarilo', 'Skúste to prosím o chvíľu znova.', undefined, 500)
    }
  }

  return page('Odhlásenie je hotové', 'Ďalšie správy už nedostanete. Ak to bol omyl, stačí nám napísať.')
}
