/**
 * Enterprise Sales Intelligence — čisté výpočty (bez I/O).
 * Vstupy: udalosti leadu (email_open, click, call, reply, …).
 */

export type LeadEventInput = {
  type: string;
  created_at: string;
};

export type ProcessLeadResult = {
  score: number;
  /** Dodatočné riziko z nezáujmu o e-maily (0–100+ skladačka) */
  inactivityRiskBoost: number;
};

export function processLead(_lead: unknown, events: LeadEventInput[]): ProcessLeadResult {
  let score = 0;
  const opens = events.filter((e) => e.type === "email_open").length;
  const clicks = events.filter((e) => e.type === "click").length;

  score += opens * 5;
  score += clicks * 10;

  let inactivityRiskBoost = 0;
  if (events.length > 0 && opens === 0) {
    inactivityRiskBoost += 40;
  }

  return { score, inactivityRiskBoost };
}

/** Riziko 0–100 na základe času od poslednej aktivity */
export function calculateRisk(events: LeadEventInput[]): number {
  const lastEvent = events[events.length - 1];
  if (!lastEvent) return 80;

  const days =
    (Date.now() - new Date(lastEvent.created_at).getTime()) / 86400000;

  if (days > 5) return 70;

  return 20;
}

/** „Hot“ moment: v posledných 3 udalostiach bol klik */
export function detectMoment(events: LeadEventInput[]): boolean {
  const recent = events.slice(-3);
  return recent.some((e) => e.type === "click");
}

export type ClientDnaResult = {
  type: "analytický" | "rýchly";
  price_sensitivity: number;
  decision_speed: number;
};

export function buildDNA(events: LeadEventInput[]): ClientDnaResult {
  const clicks = events.filter((e) => e.type === "click").length;

  if (clicks > 5) {
    return {
      type: "analytický",
      price_sensitivity: 60,
      decision_speed: 40,
    };
  }

  return {
    type: "rýchly",
    price_sensitivity: 40,
    decision_speed: 80,
  };
}

export type AiActionResult = {
  action: string;
  reason: string;
};

export function generateAction(
  _lead: unknown,
  score: number,
  risk: number,
  isHot: boolean
): AiActionResult {
  if (isHot && score > 50) {
    return {
      action: "Zavolaj klientovi",
      reason: "vysoká aktivita",
    };
  }

  if (risk > 60) {
    return {
      action: "Reaktivuj klienta",
      reason: "riziko straty",
    };
  }

  return {
    action: "Follow-up email",
    reason: "stredná aktivita",
  };
}

/** Kombinované riziko pre uloženie (clamp 0–100) */
export function combineRiskScore(
  baseRisk: number,
  inactivityBoost: number
): number {
  const raw = Math.max(baseRisk, inactivityBoost);
  return Math.min(100, Math.max(0, Math.round(raw)));
}
