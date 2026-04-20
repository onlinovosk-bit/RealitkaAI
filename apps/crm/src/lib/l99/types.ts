export const ACCOUNT_TIERS = {
  FREE: "free",
  STARTER: "starter",
  PRO: "pro",
  ENTERPRISE: "enterprise",
} as const;

export type AccountTier = (typeof ACCOUNT_TIERS)[keyof typeof ACCOUNT_TIERS];

// BRI váhy – musia sumarizovať na 1.0
export const BRI_WEIGHTS = {
  SOFIA_ENGAGEMENT_VELOCITY: 0.35,
  SENTIMENT_SCORE: 0.25,
  CROSS_PROPERTY_INTENT: 0.20,
  MARKET_SCARCITY_FACTOR: 0.20,
} as const satisfies Record<string, number>;

const weightsSum = Object.values(BRI_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(weightsSum - 1.0) > 0.001) {
  throw new Error(`BRI_WEIGHTS must sum to 1.0, got ${weightsSum}`);
}

export type BriComponents = {
  sofiaEngagementVelocity: number; // 0-100
  sentimentScore: number;          // 0-100
  crossPropertyIntent: number;     // 0-100
  marketScarcityFactor: number;    // 0-100
};

export type ReasoningFactor = {
  factor: string;
  value: number;
  weight: number;
  contribution: number;
  explanation: string;
};

export type BriAlertLevel =
  | "low"       // < 70
  | "medium"    // 70-87
  | "high"      // 88-89 → priority_alert
  | "critical"; // 90+ → Deal Summary PDF

export type BriResult = {
  score: number;
  components: BriComponents;
  reasoningString: string;         // EU AI Act compliance
  reasoningFactors: ReasoningFactor[];
  alertLevel: BriAlertLevel;
  calculatedAt: string;
};

export type ShadowInventorySignal = {
  id: string;
  leadId: string | null;
  propertyId: string | null;
  signalType: "dormant_revival" | "predictive_relisting" | "hidden_match" | "life_stage_trigger";
  confidenceScore: number;
  lifeStageTrigger: string | null;
  aiReasoning: string;
  status: "pending" | "alerted" | "acted" | "dismissed";
  createdAt: string;
};

export type EnterpriseFeatureCheck = {
  allowed: boolean;
  reason: "ok" | "wrong_tier" | "locked_downgrade" | "no_profile";
  currentTier: AccountTier;
  isLocked: boolean;
};
