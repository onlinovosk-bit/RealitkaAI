import { isChromelessRoute } from "@/lib/chromeless-routes";

/** App routes that use the Workdesk shell (rail + sidebar + in-main topbar). */
const NON_WORKDESK_PREFIXES = [
  "/admin",
  "/developer",
  "/onboarding",
  "/offline",
  "/test-db",
  "/forbidden",
  "/nehnutelnosti",
  "/makleri",
  "/support",
  "/status",
  "/legal",
  "/privacy",
  "/terms",
  "/security",
  "/trust-center",
  "/cookie",
  "/cookies",
  "/sla",
  "/aup",
  "/dpa-request",
  "/buyer-onboarding",
  "/bsm-reforma",
  "/register",
];

export function isWorkdeskRoute(pathname: string | null | undefined): boolean {
  if (!pathname || isChromelessRoute(pathname)) return false;
  if (pathname === "/") return false;
  return !NON_WORKDESK_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
