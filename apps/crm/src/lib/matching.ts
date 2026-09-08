import type { Lead } from "@/lib/mock-data";
import type { Property } from "@/lib/properties-store";

export type PropertyMatchResult = {
  propertyId: string;
  matchScore: number;
  comparedCriteria: number;
  reasons: string[];
};

export type LeadMatchResult = {
  leadId: string;
  matchScore: number;
  comparedCriteria: number;
  reasons: string[];
};

function extractBudget(value: string) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function normalize(text: string) {
  return String(text || "").toLowerCase().trim();
}

function includesEitherWay(a: string, b: string) {
  const left = normalize(a);
  const right = normalize(b);

  if (!left || !right) return false;

  return left.includes(right) || right.includes(left);
}

function scoreBudget(leadBudget: number, propertyPrice: number) {
  if (!leadBudget || !propertyPrice) {
    return { score: 0, reason: "" };
  }

  const diff = Math.abs(leadBudget - propertyPrice);

  if (propertyPrice <= leadBudget) {
    return { score: 20, reason: "rozpočet sedí" };
  }

  if (diff <= 15000) {
    return { score: 10, reason: "rozpočet je veľmi blízko" };
  }

  if (diff <= 30000) {
    return { score: 5, reason: "rozpočet je čiastočne blízko" };
  }

  return { score: 0, reason: "" };
}

export function calculateLeadPropertyMatch(lead: Lead, property: Property) {
  let score = 0;
  let comparedCriteria = 0;
  const reasons: string[] = [];

  const leadBudget = extractBudget(lead.budget);
  const leadNote = normalize(lead.note);
  const leadPropertyType = normalize(lead.propertyType);
  const propertyType = normalize(property.type);

  if (leadPropertyType && propertyType) {
    comparedCriteria += 1;
  }
  if (leadPropertyType && propertyType && leadPropertyType === propertyType) {
    score += 25;
    reasons.push("typ nehnuteľnosti sedí");
  }

  if (includesEitherWay(lead.location, property.location)) {
    score += 30;
    reasons.push("lokalita sedí");
  }
  if (normalize(lead.location) && normalize(property.location)) {
    comparedCriteria += 1;
  }

  const leadRooms = normalize(lead.rooms);
  const propertyRooms = normalize(property.rooms);
  if (leadRooms && propertyRooms) {
    comparedCriteria += 1;
  }
  if (leadRooms && propertyRooms && leadRooms === propertyRooms) {
    score += 20;
    reasons.push("počet izieb sedí");
  }

  if (leadBudget && property.price) {
    comparedCriteria += 1;
  }
  const budget = scoreBudget(leadBudget, property.price);
  score += budget.score;
  if (budget.reason) reasons.push(budget.reason);

  if (leadNote && property.features?.length) {
    comparedCriteria += 1;
  }
  const featureMatches = (property.features || []).filter((feature) =>
    leadNote.includes(normalize(feature))
  );

  if (featureMatches.length > 0) {
    score += Math.min(15, featureMatches.length * 5);
    reasons.push("sedí výbava");
  }

  if (normalize(lead.timeline).includes("ihneď")) {
    comparedCriteria += 1;
    score += 5;
    reasons.push("rýchly čas kúpy");
  }

  if (normalize(lead.financing).includes("hotovosť")) {
    comparedCriteria += 1;
    score += 5;
    reasons.push("hotovostný klient");
  }

  return {
    score: Math.min(100, score),
    comparedCriteria,
    reasons,
  };
}

export function getMatchingPropertiesForLead(
  lead: Lead,
  properties: Property[],
  minScore = 35
): PropertyMatchResult[] {
  return properties
    .map((property) => {
      const result = calculateLeadPropertyMatch(lead, property);

      return {
        propertyId: property.id,
        matchScore: result.score,
        comparedCriteria: result.comparedCriteria,
        reasons: result.reasons,
      };
    })
    .filter((item) => item.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function getMatchingLeadsForProperty(
  property: Property,
  leads: Lead[],
  minScore = 35
): LeadMatchResult[] {
  return leads
    .map((lead) => {
      const result = calculateLeadPropertyMatch(lead, property);

      return {
        leadId: lead.id,
        matchScore: result.score,
        comparedCriteria: result.comparedCriteria,
        reasons: result.reasons,
      };
    })
    .filter((item) => item.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore);
}

// Backward-compatible alias used in older routes/pages.
export function calculatePropertyMatch(lead: Lead, property: Property) {
  return calculateLeadPropertyMatch(lead, property);
}
