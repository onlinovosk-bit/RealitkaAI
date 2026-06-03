/** Default token for 301 redirects and public CTAs (unlisted backstage). */
export const ZAKULISIE_DEFAULT_TOKEN = 'l99'

export function zakulisiePath(token: string = ZAKULISIE_DEFAULT_TOKEN): string {
  return `/zakulisie/${token}`
}

/** Slug validation for dynamic segment (alphanumeric + hyphen, 2–64 chars). */
export function isValidZakulisieToken(token: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,63}$/i.test(token)
}
