export type FallbackMatrixRow = {
  endpoint: string;
  consumer: string;
  retryStrategy: string;
  fallbackBehavior: string;
  userMessage: string;
};

export const FALLBACK_MATRIX: FallbackMatrixRow[] = [
  {
    endpoint: "/api/billing/checkout",
    consumer: "PricingCards",
    retryStrategy: "2 retries, exponential backoff (500ms, 1000ms) on transient/network errors",
    fallbackBehavior: "Stay on billing page; do not redirect; allow user to retry by clicking CTA again.",
    userMessage: "Nepodarilo sa spustiť checkout. Skúste to znova o pár sekúnd.",
  },
  {
    endpoint: "/api/billing/portal",
    consumer: "ManageSubscriptionButton",
    retryStrategy: "2 retries, exponential backoff (500ms, 1000ms) on transient/network errors",
    fallbackBehavior: "Fallback to /billing for NO_CUSTOMER or missing URL; keep action non-destructive.",
    userMessage: "Nastala chyba pri pripájaní na server. Skúste to znova.",
  },
  {
    endpoint: "/api/legal/dpa-request",
    consumer: "DpaRequestForm",
    retryStrategy: "2 retries, exponential backoff (500ms, 1000ms) on transient/network errors",
    fallbackBehavior: "Keep user-entered form values, display inline error, allow immediate re-submit.",
    userMessage: "Nepodarilo sa odoslať formulár.",
  },
  {
    endpoint: "/api/support/request",
    consumer: "SupportRequestForm",
    retryStrategy: "2 retries, exponential backoff (500ms, 1000ms) on transient/network errors",
    fallbackBehavior: "Keep user-entered form values, show error banner, preserve support SLA context.",
    userMessage: "Nepodarilo sa odoslať support ticket.",
  },
  {
    endpoint: "/api/healthz | /landing | /legal",
    consumer: "ServiceStatusCards",
    retryStrategy: "2 retries, exponential backoff (400ms, 800ms) per probe",
    fallbackBehavior: "Show degraded state per card and provide manual 'Obnoviť status' action.",
    userMessage: "Nedostupné (po retry).",
  },
  {
    endpoint: "/api/observability/probes",
    consumer: "Status/observability ops checks",
    retryStrategy: "Single API call, can be polled externally",
    fallbackBehavior: "Use degradedCount as release gate signal; trigger incident workflow if non-zero.",
    userMessage: "Synthetic probes indicate degraded dependency.",
  },
];
