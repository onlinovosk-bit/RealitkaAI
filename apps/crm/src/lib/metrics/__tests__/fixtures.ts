import type { AgencyBillingRow, CreditLedgerRow } from "@/lib/metrics/types";

/** Seed-style agencies for vitest — mirrors RLS fixture shape, no prod DB. */
export const METRICS_FIXTURE_AGENCIES: AgencyBillingRow[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Reality Smolko",
    seats: 5,
    account_tier: "enterprise",
    manual_plan: "market_vision",
    owner_cockpit_active: true,
    cockpit_tier: "owner",
    subscription_status: "active",
    billing_source: "manual_invoice",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "RK Bratislava",
    seats: 4,
    account_tier: "pro",
    manual_plan: null,
    owner_cockpit_active: true,
    cockpit_tier: "owner",
    subscription_status: "active",
    billing_source: "stripe",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "RK Košice",
    seats: 2,
    account_tier: "starter",
    manual_plan: null,
    owner_cockpit_active: false,
    cockpit_tier: null,
    subscription_status: "active",
    billing_source: "stripe",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    name: "Churned RK",
    seats: 3,
    account_tier: "pro",
    manual_plan: null,
    owner_cockpit_active: false,
    cockpit_tier: null,
    subscription_status: "canceled",
    billing_source: "stripe",
  },
];

export const METRICS_FIXTURE_LEDGER: CreditLedgerRow[] = [
  {
    delta: 100,
    reason: "monthly_grant",
    source: "grant",
    ref: "202606",
    created_at: "2026-06-02T06:00:00.000Z",
  },
  {
    delta: 150,
    reason: "credit_topup",
    source: "purchase",
    ref: "rast",
    created_at: "2026-06-05T10:00:00.000Z",
  },
  {
    delta: -12,
    reason: "lead_unlock",
    source: "grant",
    ref: null,
    created_at: "2026-06-06T14:00:00.000Z",
  },
  {
    delta: -5,
    reason: "grant_expiry",
    source: "grant",
    ref: "202605",
    created_at: "2026-06-01T05:00:00.000Z",
  },
];
