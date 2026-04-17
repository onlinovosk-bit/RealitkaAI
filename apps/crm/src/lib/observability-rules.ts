export type SeverityLevel = "P1" | "P2" | "P3" | "P4";

export type ObservabilityRule = {
  id: string;
  name: string;
  area: "auth" | "billing" | "api" | "dashboard";
  metric: string;
  window: string;
  threshold: string;
  severity: SeverityLevel;
  action: string;
};

export const OBSERVABILITY_RULES: ObservabilityRule[] = [
  {
    id: "auth-error-rate",
    name: "Auth API error rate",
    area: "auth",
    metric: "5xx rate on /api/auth/login",
    window: "5m",
    threshold: "> 2%",
    severity: "P1",
    action: "Page on-call, post status update within 60 minutes.",
  },
  {
    id: "billing-checkout-failure",
    name: "Billing checkout failure spike",
    area: "billing",
    metric: "4xx+5xx rate on /api/billing/checkout",
    window: "10m",
    threshold: "> 8%",
    severity: "P1",
    action: "Freeze campaign sends, validate Stripe keys/price IDs.",
  },
  {
    id: "billing-portal-failure",
    name: "Billing portal failures",
    area: "billing",
    metric: "4xx+5xx rate on /api/billing/portal",
    window: "10m",
    threshold: "> 5%",
    severity: "P2",
    action: "Investigate customer state mismatch and app URL config.",
  },
  {
    id: "api-5xx-global",
    name: "Global API 5xx surge",
    area: "api",
    metric: "5xx across /api/*",
    window: "5m",
    threshold: "> 1.5%",
    severity: "P1",
    action: "Activate incident commander and rollback decision gate.",
  },
  {
    id: "dashboard-load-regression",
    name: "Dashboard load regression",
    area: "dashboard",
    metric: "p95 dashboard load time",
    window: "15m",
    threshold: "> 4.0s",
    severity: "P2",
    action: "Enable degraded mode widgets and inspect slow queries.",
  },
  {
    id: "system-smoke-pack",
    name: "System smoke pack (incl. blog promo config)",
    area: "api",
    metric: "GET /api/system/smoke returns ok: true",
    window: "5m",
    threshold: "any failure",
    severity: "P3",
    action: "Inspect /api/observability/probes and /api/system/smoke checks; verify BlogPromoTicker + BLOG_PROMO_ITEMS.",
  },
];

export const INCIDENT_SEVERITY_MAP: Array<{
  severity: SeverityLevel;
  definition: string;
  firstResponseSla: string;
  commsCadence: string;
  owner: string;
}> = [
  {
    severity: "P1",
    definition: "Core business flow unavailable or severe revenue impact.",
    firstResponseSla: "60 min",
    commsCadence: "every 4h until resolved",
    owner: "CTO / On-call engineer",
  },
  {
    severity: "P2",
    definition: "Major degradation with workaround or partial outage.",
    firstResponseSla: "4h",
    commsCadence: "2x daily",
    owner: "Tech lead + Support lead",
  },
  {
    severity: "P3",
    definition: "Functional defect with low operational impact.",
    firstResponseSla: "1 business day",
    commsCadence: "daily summary",
    owner: "Product owner",
  },
  {
    severity: "P4",
    definition: "Minor issue, UX or informational request.",
    firstResponseSla: "1 business day",
    commsCadence: "as needed",
    owner: "Support owner",
  },
];
