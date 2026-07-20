import type {
  ValuationEstimateResult,
  ValuationLeadPayload,
} from "@/lib/valuation/types";

const CONSENT_VERSION = "valuation-widget-v1-2026-07";

export function buildValuationLeadInsert(
  agencyId: string,
  payload: ValuationLeadPayload,
) {
  const estimate = payload.estimate;
  const noteParts = [
    "valuation_widget",
    `typ=${payload.propertyType}`,
    `lokalita=${payload.location}`,
    `vymera=${payload.sqm}m2`,
    payload.rooms != null ? `izby=${payload.rooms}` : "",
    payload.condition ? `stav=${payload.condition}` : "",
    payload.floor != null ? `poschodie=${payload.floor}` : "",
    payload.hasElevator != null ? `vytah=${payload.hasElevator ? "ano" : "nie"}` : "",
    payload.hasBalcony != null ? `balkon=${payload.hasBalcony ? "ano" : "nie"}` : "",
    payload.sellWithin12Months ? "predaj_do_12m=ano" : "predaj_do_12m=nie",
    payload.marketingOptIn ? "marketing=ano" : "marketing=nie",
    formatEstimateNote(estimate),
    `gdpr_ver=${CONSENT_VERSION}`,
  ].filter(Boolean);

  return {
    id: crypto.randomUUID(),
    agency_id: agencyId,
    name: payload.name.slice(0, 200),
    email: payload.email.slice(0, 254),
    phone: (payload.phone ?? "").slice(0, 50),
    location: payload.location.slice(0, 200),
    budget: estimate?.noEstimate === false && estimate.low != null && estimate.high != null
      ? `${estimate.low}-${estimate.high} EUR`
      : "",
    property_type: payload.propertyType === "byt" ? "Byt" : "Dom",
    rooms: payload.rooms != null ? String(payload.rooms) : "",
    financing: "",
    timeline: payload.sellWithin12Months ? "do 12 mesiacov" : "",
    source: "valuation_widget",
    status: "Nový",
    score: payload.sellWithin12Months ? 70 : 60,
    assigned_agent: "Nepriradený",
    assigned_profile_id: null,
    last_contact: "Práve vytvorený",
    note: noteParts.join(" · ").slice(0, 5000),
  };
}

function formatEstimateNote(estimate?: ValuationEstimateResult): string {
  if (!estimate) return "odhad=nevygenerovany";
  if (estimate.noEstimate) return "odhad=bez_verifikovanych_dat";
  return `odhad=${estimate.low}-${estimate.high}EUR;region=${estimate.regionCode ?? "?"}`;
}

export { CONSENT_VERSION };
