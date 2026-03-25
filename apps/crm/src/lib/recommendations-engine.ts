import type { Lead } from "@/lib/mock-data";

export type SimpleMatch = {
  leadId: string;
  propertyId: string;
  matchScore: number;
  reasons: string[];
};

export type GeneratedRecommendation = {
  leadId: string;
  propertyId: string | null;
  recommendationType: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  status: "active";
  modelVersion: string;
};

function getPriorityByScore(score: number): "high" | "medium" | "low" {
  if (score >= 85) return "high";
  if (score >= 70) return "medium";
  return "low";
}

export function generateRecommendationsForLead(
  lead: Lead,
  matches: SimpleMatch[]
): GeneratedRecommendation[] {
  const sortedMatches = [...matches].sort((a, b) => b.matchScore - a.matchScore);
  const bestMatch = sortedMatches[0];
  const recommendations: GeneratedRecommendation[] = [];

  if (lead.status === "Nový") {
    recommendations.push({
      leadId: lead.id,
      propertyId: bestMatch?.propertyId ?? null,
      recommendationType: "next_best_action",
      title: "Kontaktovať lead čo najskôr",
      description: `Lead ${lead.name} je v stave Nový. Odporúča sa prvý kontakt čo najskôr po zachytení dopytu.`,
      priority: getPriorityByScore(lead.score),
      status: "active",
      modelVersion: "v1",
    });
  }

  if (lead.status === "Teplý") {
    recommendations.push({
      leadId: lead.id,
      propertyId: bestMatch?.propertyId ?? null,
      recommendationType: "follow_up",
      title: "Poslať follow-up s ponukami",
      description: `Lead ${lead.name} je v stave Teplý. Odporúča sa poslať follow-up a navrhnúť vhodné nehnuteľnosti.`,
      priority: getPriorityByScore(lead.score),
      status: "active",
      modelVersion: "v1",
    });
  }

  if (lead.status === "Horúci") {
    recommendations.push({
      leadId: lead.id,
      propertyId: bestMatch?.propertyId ?? null,
      recommendationType: "showing",
      title: "Naplánovať obhliadku",
      description: `Lead ${lead.name} je Horúci. Odporúča sa okamžite navrhnúť termín obhliadky.`,
      priority: "high",
      status: "active",
      modelVersion: "v1",
    });
  }

  if (lead.status === "Obhliadka") {
    recommendations.push({
      leadId: lead.id,
      propertyId: bestMatch?.propertyId ?? null,
      recommendationType: "reminder",
      title: "Potvrdiť obhliadku",
      description: `Lead ${lead.name} je v stave Obhliadka. Pošli potvrdenie termínu a krátku pripomienku.`,
      priority: "high",
      status: "active",
      modelVersion: "v1",
    });
  }

  if (lead.status === "Ponuka") {
    recommendations.push({
      leadId: lead.id,
      propertyId: bestMatch?.propertyId ?? null,
      recommendationType: "offer_follow_up",
      title: "Follow-up k cenovej ponuke",
      description: `Lead ${lead.name} čaká na reakciu k ponuke. Odporúča sa follow-up a uzavretie ďalšieho kroku.`,
      priority: "high",
      status: "active",
      modelVersion: "v1",
    });
  }

  if (bestMatch && bestMatch.matchScore >= 80) {
    recommendations.push({
      leadId: lead.id,
      propertyId: bestMatch.propertyId,
      recommendationType: "property_match",
      title: "Silná zhoda s nehnuteľnosťou",
      description: `Lead ${lead.name} má veľmi silnú zhodu s konkrétnou nehnuteľnosťou. Odporúča sa poslať detail a navrhnúť obhliadku.`,
      priority: "high",
      status: "active",
      modelVersion: "v1",
    });
  }

  if (!bestMatch) {
    recommendations.push({
      leadId: lead.id,
      propertyId: null,
      recommendationType: "missing_inventory_match",
      title: "Chýba vhodná ponuka",
      description: `Lead ${lead.name} zatiaľ nemá dostatočne silný matching. Over požiadavky alebo doplň inventory.`,
      priority: getPriorityByScore(lead.score),
      status: "active",
      modelVersion: "v1",
    });
  }

  if (lead.score >= 90) {
    recommendations.push({
      leadId: lead.id,
      propertyId: bestMatch?.propertyId ?? null,
      recommendationType: "priority_lead",
      title: "Prioritný lead dňa",
      description: `Lead ${lead.name} patrí medzi najkvalitnejšie leady. Odporúča sa okamžitý follow-up.`,
      priority: "high",
      status: "active",
      modelVersion: "v1",
    });
  }

  return recommendations.slice(0, 4);
}
