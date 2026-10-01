import { PRIVACY_POLICY_VERSION } from "@/lib/valuation/config";

export function buildLeadConsentInsert(input: {
  leadId: string;
  tenantSlug: string;
  marketingOptIn: boolean;
  acknowledgedAt?: string;
}) {
  return {
    lead_id: input.leadId,
    tenant_slug: input.tenantSlug.trim().toLowerCase(),
    privacy_policy_version: PRIVACY_POLICY_VERSION,
    acknowledged_at: input.acknowledgedAt ?? new Date().toISOString(),
    marketing_opt_in: input.marketingOptIn,
  };
}
