import { LEGACY_CONSENT_NOTE_TAG, PRIVACY_POLICY_VERSION } from "@/lib/valuation/config";
import type {
  ValuationEstimateResult,
  ValuationLeadPayload,
} from "@/lib/valuation/types";

export const CONSENT_VERSION = PRIVACY_POLICY_VERSION;

export function buildValuationLeadInsert(
  agencyId: string,
  payload: ValuationLeadPayload,
) {
  const estimate = payload.estimate;
  const noteParts = [
    "valuation_widget",
    `typ=${payload.propertyType}`,
    `lokalita=${payload.location}`,
    payload.postalCode ? `psc=${payload.postalCode}` : "",
    `vymera=${payload.sqm}m2`,
    payload.landSqm != null ? `pozemok=${payload.landSqm}m2` : "",
    payload.rooms != null ? `izby=${payload.rooms}` : "",
    payload.condition ? `stav=${payload.condition}` : "",
    payload.yearBuilt != null ? `rok=${payload.yearBuilt}` : "",
    payload.floor != null ? `poschodie=${payload.floor}` : "",
    payload.totalFloors != null ? `poschodi=${payload.totalFloors}` : "",
    payload.heating ? `kurenie=${payload.heating}` : "",
    payload.hasElevator != null ? `vytah=${payload.hasElevator ? "ano" : "nie"}` : "",
    payload.hasBalcony != null ? `balkon=${payload.hasBalcony ? "ano" : "nie"}` : "",
    payload.hasParking != null ? `parkovanie=${payload.hasParking ? "ano" : "nie"}` : "",
    payload.sellTimeline ? `predaj=${payload.sellTimeline}` : "",
    payload.sellWithin12Months ? "predaj_do_12m=ano" : "predaj_do_12m=nie",
    payload.marketingOptIn ? "marketing=ano" : "marketing=nie",
    payload.abVariant ? `ab=${payload.abVariant}` : "",
    payload.sessionId ? `sid=${payload.sessionId.slice(0, 36)}` : "",
    payload.ownerPriceExpectation != null
      ? `majitel_cena=${payload.ownerPriceExpectation}EUR`
      : "",
    formatEstimateNote(estimate),
    LEGACY_CONSENT_NOTE_TAG,
  ].filter(Boolean);

  const consentAt = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    agency_id: agencyId,
    name: payload.name.slice(0, 200),
    email: payload.email.slice(0, 254),
    phone: payload.phone.slice(0, 50),
    location: [payload.location, payload.postalCode].filter(Boolean).join(", ").slice(0, 200),
    budget: estimate?.noEstimate === false && estimate.low != null && estimate.high != null
      ? `${estimate.low}-${estimate.high} EUR`
      : "",
    property_type: payload.propertyType === "byt" ? "Byt" : "Dom",
    rooms: payload.rooms != null ? String(payload.rooms) : "",
    financing: "",
    timeline: payload.sellTimeline?.slice(0, 100) ?? (payload.sellWithin12Months ? "do 12 mesiacov" : ""),
    source: "valuation_widget",
    status: "Nový",
    score: payload.sellWithin12Months ? 70 : 60,
    assigned_agent: "Nepriradený",
    assigned_profile_id: null,
    last_contact: "Práve vytvorený",
    note: noteParts.join(" · ").slice(0, 5000),
    gdpr_consent_at: consentAt,
    gdpr_consent_version: CONSENT_VERSION,
  };
}

function formatEstimateNote(estimate?: ValuationEstimateResult): string {
  if (!estimate) return "odhad=nevygenerovany";
  if (estimate.noEstimate) return "odhad=bez_verifikovanych_dat";
  return `odhad=${estimate.low}-${estimate.high}EUR;region=${estimate.regionCode ?? "?"};zdroj=${estimate.sourceNote ?? "?"}`;
}
