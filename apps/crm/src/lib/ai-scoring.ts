type LeadLike = {
  id: string;
  name: string;
  location: string;
  budget: string;
  propertyType: string;
  rooms: string;
  financing: string;
  timeline: string;
  status: string;
  score?: number;
  note?: string;
  source?: string;
  assignedAgent?: string;
};

type MatchLike = {
  leadId: string;
  matchScore: number;
};

type RecommendationLike = {
  leadId: string | null;
  priority: string;
  recommendationType?: string;
};

type TaskLike = {
  leadId: string | null;
  status: string;
  priority: string;
};

type MessageLike = {
  leadId: string | null;
  direction: string;
  createdAt?: string;
  body?: string;
};

export type ScoringResult = {
  leadId: string;
  score: number;
  band: "critical" | "high" | "medium" | "low";
  reasons: string[];
  nextBestAction: string;
  riskLevel: "risk" | "normal" | "opportunity";
};

function normalize(text: string) {
  return String(text || "").toLowerCase().trim();
}

function extractBudget(value: string) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function getBand(score: number): ScoringResult["band"] {
  if (score >= 90) return "critical";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function getRiskLevel(score: number): ScoringResult["riskLevel"] {
  if (score >= 90) return "opportunity";
  if (score < 45) return "risk";
  return "normal";
}

function getNextBestAction(score: number, status: string, hasHighMatch: boolean) {
  const normalizedStatus = normalize(status);

  if (score >= 90 && hasHighMatch) {
    return "Okamžite zavolať klientovi a navrhnúť obhliadku.";
  }

  if (normalizedStatus.includes("obhliadka")) {
    return "Potvrdiť termín obhliadky a pripraviť follow-up.";
  }

  if (normalizedStatus.includes("ponuka")) {
    return "Urobiť follow-up k ponuke a uzavrieť ďalší krok.";
  }

  if (score >= 70) {
    return "Poslať konkrétne ponuky a vytvoriť follow-up task.";
  }

  if (score >= 50) {
    return "Overiť potreby klienta a doplniť chýbajúce údaje.";
  }

  return "Znovu kvalifikovať lead alebo znížiť prioritu.";
}

export function calculateLeadAiScore(input: {
  lead: LeadLike;
  matches: MatchLike[];
  recommendations: RecommendationLike[];
  tasks: TaskLike[];
  messages: MessageLike[];
}) {
  const { lead, matches, recommendations, tasks, messages } = input;

  let score = 0;
  const reasons: string[] = [];

  const budget = extractBudget(lead.budget);
  const leadMatches = matches.filter((item) => item.leadId === lead.id);
  const bestMatch = [...leadMatches].sort((a, b) => b.matchScore - a.matchScore)[0];
  const leadRecommendations = recommendations.filter((item) => item.leadId === lead.id);
  const leadTasks = tasks.filter((item) => item.leadId === lead.id);
  const leadMessages = messages.filter((item) => item.leadId === lead.id);

  if (budget >= 250000) {
    score += 10;
    reasons.push("vyšší rozpočet");
  } else if (budget >= 150000) {
    score += 6;
    reasons.push("solídny rozpočet");
  }

  if (normalize(lead.financing).includes("hotovosť")) {
    score += 10;
    reasons.push("hotovostný klient");
  } else if (normalize(lead.financing).includes("hypot")) {
    score += 4;
    reasons.push("financovanie je definované");
  }

  if (normalize(lead.timeline).includes("ihneď")) {
    score += 14;
    reasons.push("okamžitý záujem");
  } else if (normalize(lead.timeline).includes("1 mesi")) {
    score += 10;
    reasons.push("krátky časový horizont");
  } else if (normalize(lead.timeline).includes("3 mesi")) {
    score += 6;
    reasons.push("rozumný časový horizont");
  }

  const status = normalize(lead.status);

  if (status.includes("horú")) {
    score += 18;
    reasons.push("horúci lead");
  } else if (status.includes("tepl")) {
    score += 10;
    reasons.push("teplý lead");
  } else if (status.includes("obhli")) {
    score += 20;
    reasons.push("obhliadka v stave klientov");
  } else if (status.includes("ponuka")) {
    score += 22;
    reasons.push("lead vo fáze ponuky");
  } else if (status.includes("nov")) {
    score += 4;
    reasons.push("nový lead");
  }

  if (bestMatch) {
    if (bestMatch.matchScore >= 85) {
      score += 18;
      reasons.push("veľmi silný matching");
    } else if (bestMatch.matchScore >= 70) {
      score += 12;
      reasons.push("silný matching");
    } else if (bestMatch.matchScore >= 50) {
      score += 6;
      reasons.push("priemerný matching");
    }
  } else {
    score -= 8;
    reasons.push("bez silného matchingu");
  }

  const highPriorityRecommendations = leadRecommendations.filter(
    (item) => normalize(item.priority) === "high"
  ).length;

  if (highPriorityRecommendations >= 2) {
    score += 10;
  // === Sentiment analýza poslednej správy (stub) ===
  function simpleSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    // Veľmi jednoduchá heuristika, nahradiť AI/LLM API
    const t = text.toLowerCase();
    if (t.includes('ďakujem') || t.includes('super') || t.includes('výborné') || t.includes('spokojný')) return 'positive';
    if (t.includes('nespokojný') || t.includes('zlé') || t.includes('problém')) return 'negative';
    return 'neutral';
  }
  if (leadMessages.length > 0) {
    const sentiment = simpleSentiment(leadMessages[0].body || '');
    if (sentiment === 'positive') {
      score += 3;
      reasons.push('pozitívny sentiment v poslednej správe');
    } else if (sentiment === 'negative') {
      score -= 2;
      reasons.push('negatívny sentiment v poslednej správe');
    }
  }
    reasons.push("viac high-priority odporúčaní");
  } else if (highPriorityRecommendations === 1) {
    score += 5;
    reasons.push("high-priority odporúčanie");
  }

  const openTasks = leadTasks.filter((item) => normalize(item.status) !== "done");
  const doneTasks = leadTasks.filter((item) => normalize(item.status) === "done");

  if (doneTasks.length >= 2) {
    score += 8;
    reasons.push("vykonané follow-up úlohy");
  }

  if (openTasks.length >= 3) {
    score -= 6;
    reasons.push("priveľa otvorených taskov");
  }

  const inboundMessages = leadMessages.filter(
    (item) => normalize(item.direction) === "inbound"
  );
  const outboundMessages = leadMessages.filter(
    (item) => normalize(item.direction) === "outbound"
  );

  if (inboundMessages.length >= 1) {
    score += 14;
    reasons.push("klient odpovedal");
  }

  if (outboundMessages.length >= 2 && inboundMessages.length === 0) {
    score -= 6;
    reasons.push("bez odpovede na outreach");
  }

  if (normalize(lead.source || "").includes("web")) {
    score += 3;
    reasons.push("web lead");
  }

  if (normalize(lead.note || "").length > 20) {
    score += 3;
    reasons.push("vyplnená kvalifikácia");
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const band = getBand(finalScore);
  const riskLevel = getRiskLevel(finalScore);
  const nextBestAction = getNextBestAction(finalScore, lead.status, Boolean(bestMatch && bestMatch.matchScore >= 80));

  return {
    leadId: lead.id,
    score: finalScore,
    band,
    reasons,
    nextBestAction,
    riskLevel,
  } satisfies ScoringResult;
}
