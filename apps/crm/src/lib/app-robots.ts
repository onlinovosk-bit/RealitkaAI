/**
 * robots.txt policy for app.revolis.ai.
 * Legal/public pages stay crawlable; login, auth, dashboard and other
 * authenticated app routes are disallowed.
 */
export const APP_SITE_ORIGIN = "https://app.revolis.ai";

export const APP_ROBOTS_ALLOW = [
  "/privacy",
  "/privacy-policy",
  "/terms",
  "/cookie-policy",
  "/cookies",
  "/legal",
  "/legal/",
  "/security",
  "/trust-center",
  "/sla",
  "/support",
  "/aup",
  "/dpa-request",
] as const;

export const APP_ROBOTS_DISALLOW = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/",
  "/onboarding",
  "/dashboard",
  "/admin",
  "/api/",
  "/settings",
  "/leads",
  "/contacts",
  "/properties",
  "/billing",
  "/import",
  "/integrations",
  "/team",
  "/invite",
  "/inzerat-generator",
  "/pipeline",
  "/matching",
  "/outreach",
  "/activities",
  "/tasks",
  "/sales",
  "/forecast",
  "/communication",
  "/upgrade",
  "/management",
  "/acquisition",
  "/akvizieia",
] as const;
