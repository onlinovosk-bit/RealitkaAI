import { SMOLKO_AGENCY_ID } from "@/lib/profiles/resolve-profile-for-auth";
import { timingSafeEqual } from "node:crypto";

export type InboundFormAgencyConfig = {
  slug: string;
  agencyId: string;
  expectedToken: string;
};

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** MVP: Smolko-only env mapping. Multi-agency = future env table. */
export function getSmolkoInboundConfig(): InboundFormAgencyConfig | null {
  const token = process.env.LEAD_FORM_TOKEN_SMOLKO?.trim();
  if (!token) return null;

  return {
    slug: (process.env.LEAD_FORM_SLUG_SMOLKO?.trim() || "smolko").toLowerCase(),
    agencyId: process.env.LEAD_FORM_AGENCY_ID_SMOLKO?.trim() || SMOLKO_AGENCY_ID,
    expectedToken: token,
  };
}

export function resolveInboundAgency(
  slug: string,
  token: string,
): { agencyId: string } | null {
  const config = getSmolkoInboundConfig();
  if (!config) return null;
  if (slug.trim().toLowerCase() !== config.slug) return null;
  if (!token || !safeEqual(token, config.expectedToken)) return null;
  return { agencyId: config.agencyId };
}
