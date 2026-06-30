import { SMOLKO_AGENCY_ID } from "@/lib/profiles/resolve-profile-for-auth";

const INBOUND_AGENCY_BY_ADDRESS: Readonly<Record<string, string>> = {
  "smolko@inbound.revolis.ai": SMOLKO_AGENCY_ID,
};

/** Static inbound address → agency_id map (Wave 1). DB lookup is Wave 2+. */
export function agencyForInbound(toAddress: string): string | null {
  const normalized = toAddress.trim().toLowerCase();
  if (!normalized) return null;
  return INBOUND_AGENCY_BY_ADDRESS[normalized] ?? null;
}
