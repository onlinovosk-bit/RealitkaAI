import type { Lead } from "@/lib/mock-data";
import type { Property } from "@/lib/properties-store";

export type PropertyMatchResult = {
  propertyId: string;
  matchScore: number;
  reasons: string[];
};

export type LeadMatchResult = {
  leadId: string;
  matchScore: number;
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
  const reasons: string[] = [];

  const leadBudget = extractBudget(lead.budget);
  const leadNote = normalize(lead.note);

  if (normalize(lead.propertyType) === normalize(property.type)) {
    score += 25;
    reasons.push("typ nehnuteľnosti sedí");
  }

  if (includesEitherWay(lead.location, property.location)) {
    score += 30;
    reasons.push("lokalita sedí");
  }

  if (normalize(lead.rooms) === normalize(property.rooms)) {
    score += 20;
    reasons.push("počet izieb sedí");
  }

  const budget = scoreBudget(leadBudget, property.price);
  score += budget.score;
  if (budget.reason) reasons.push(budget.reason);

  const featureMatches = (property.features || []).filter((feature) =>
    leadNote.includes(normalize(feature))
  );

  if (featureMatches.length > 0) {
    score += Math.min(15, featureMatches.length * 5);
    reasons.push("sedí výbava");
  }

  if (normalize(lead.timeline).includes("ihneď")) {
    score += 5;
    reasons.push("rýchly čas kúpy");
  }

  if (normalize(lead.financing).includes("hotovosť")) {
    score += 5;
    reasons.push("hotovostný klient");
  }

  return {
    score: Math.min(100, score),
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
