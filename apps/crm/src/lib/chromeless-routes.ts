/** Routes without dashboard chrome (SlackLayout header, mobile nav, FAB). */
const CHROMELESS_EXACT = new Set([
  '/login',
  '/register',
  '/landing',
  '/demo',
  '/blog',
  '/privacy',
  '/privacy-policy',
  '/terms',
  '/security',
  '/trust-center',
  '/cookie-policy',
  '/forbidden',
]);

const CHROMELESS_PREFIXES = ['/blog/', '/onboarding'];

export function isChromelessRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (CHROMELESS_EXACT.has(pathname)) return true;
  return CHROMELESS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
