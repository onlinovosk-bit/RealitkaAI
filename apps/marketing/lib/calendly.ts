export const CALENDLY_DEMO_URL = 'https://calendly.com/revoliscrm/30min'

export function calendlyHref(utmContent?: string): string {
  if (typeof window === 'undefined') return CALENDLY_DEMO_URL
  try {
    const u = new URL(CALENDLY_DEMO_URL)
    const params = new URLSearchParams(window.location.search)
    params.forEach((v, k) => {
      if (k.startsWith('utm_')) u.searchParams.set(k, v)
    })
    if (utmContent) u.searchParams.set('utm_content', utmContent)
    return u.toString()
  } catch {
    return CALENDLY_DEMO_URL
  }
}
