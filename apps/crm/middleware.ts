import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// These prefixes bypass user-session validation — they handle auth themselves
const BYPASS_PREFIXES = [
  '/api/auth/',               // Supabase OAuth callbacks
  '/api/cron/',               // CRON_SECRET header auth
  '/api/webhooks/',           // HMAC-verified webhooks
  '/api/resend-webhook/',     // Resend event stream (signature-verified)
  '/api/health',              // uptime monitoring (public)
  '/api/healthz',             // uptime monitoring (public)
  '/api/demo/',               // public demo capture (custom token or public form)
  '/api/bsm-reforma/',        // public BSM lead intake form
  '/api/sales-funnel/',       // public demo request form
  '/api/morning-brief/track/', // email open/click tracking pixels (must be public)
  '/api/guarantee/',          // public guarantee claim form
  '/api/onboarding/mvp/',     // service-role based onboarding flows
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/admin/integrations/realvia') {
    return NextResponse.redirect(new URL('/integrations/realvia', request.url), 308)
  }

  // Only guard API routes
  if (!pathname.startsWith('/api/')) return NextResponse.next()

  // Explicit bypass paths
  if (BYPASS_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()

  // revolisGuard routes use HMAC headers (x-revolis-timestamp + x-revolis-signature).
  // Let the route handler verify the HMAC — if headers are forged, revolisGuard rejects them.
  if (
    request.headers.get('x-revolis-timestamp') &&
    request.headers.get('x-revolis-signature')
  ) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env is not configured (local dev without Supabase), let requests through
  if (!supabaseUrl || !supabaseKey) return NextResponse.next()

  const response = NextResponse.next()

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) =>
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        ),
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return response
}

export const config = {
  matcher: ['/api/:path*', '/admin/integrations/realvia'],
}
