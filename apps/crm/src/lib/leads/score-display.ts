export type ScoreDisplayResult = {
  label: string;
  sublabel: string;
  showScore: boolean;
  colorClass: string;
};

type ScoreLead = {
  score?: number | null;
  bri_score?: number | null;
  ai_priority?: string | null;
  aiPriority?: string | null;
  buyer_readiness_score?: number | null;
  aiTriageAt?: string | null;
  lastContact?: string | null;
};

function resolvePriority(lead: ScoreLead): string | null {
  return lead.ai_priority ?? lead.aiPriority ?? null;
}

function isUnscoredDefault(lead: ScoreLead): boolean {
  const priority = resolvePriority(lead);
  const raw = lead.score;
  const hasBri = lead.bri_score != null && lead.bri_score > 0;
  const hasBuyer = lead.buyer_readiness_score != null && lead.buyer_readiness_score > 0;

  if (hasBri || hasBuyer) return false;
  if (raw == null) return true;

  if (raw === 22 && (priority === "Nízka" || priority == null)) return true;

  if (raw === 0) {
    const last = String(lead.lastContact ?? "").trim();
    const noContact = !last || last === "Bez kontaktu" || last === "Práve vytvorený";
    if (noContact && (priority === "Nízka" || priority == null) && !lead.aiTriageAt) return true;
  }

  return false;
}

/**
 * Rozhodne ako zobraziť skóre leadu v UI (bez zmeny DB dát).
 */
export function getScoreDisplay(lead: ScoreLead): ScoreDisplayResult {
  if (isUnscoredDefault(lead)) {
    return {
      label: "—",
      sublabel: "Nekvalifikované",
      showScore: false,
      colorClass: "text-muted-foreground",
    };
  }

  const effectiveScore = Math.min(
    100,
    Math.round(
      lead.bri_score ?? lead.buyer_readiness_score ?? lead.score ?? 0,
    ),
  );

  if (effectiveScore >= 80) {
    return {
      label: `${effectiveScore}/100`,
      sublabel: "HOT",
      showScore: true,
      colorClass: "text-red-600 font-bold",
    };
  }
  if (effectiveScore >= 60) {
    return {
      label: `${effectiveScore}/100`,
      sublabel: "WARM",
      showScore: true,
      colorClass: "text-orange-500 font-semibold",
    };
  }
  if (effectiveScore >= 40) {
    return {
      label: `${effectiveScore}/100`,
      sublabel: "Stredná",
      showScore: true,
      colorClass: "text-yellow-600",
    };
  }
  return {
    label: `${effectiveScore}/100`,
    sublabel: "Nízka",
    showScore: true,
    colorClass: "text-muted-foreground",
  };
}

/** Filter: lead má reálne skóre (nie default placeholder). */
export function isLeadScored(lead: ScoreLead): boolean {
  return getScoreDisplay(lead).showScore;
}

/** Filter: HOT alebo WARM podľa effective score. */
export function isLeadHotOrWarm(lead: ScoreLead): boolean {
  const d = getScoreDisplay(lead);
  return d.showScore && (d.sublabel === "HOT" || d.sublabel === "WARM");
}
