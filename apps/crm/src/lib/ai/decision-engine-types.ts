export type PriorityBucket = "critical" | "high" | "normal" | "low";
export type RiskTrend = "up" | "flat" | "down";
export type RescueStatus = "pending" | "scheduled" | "running" | "completed" | "failed";

export type DecisionScorecard = {
  who: string;
  what: string;
  when: string;
  successProb: number;
  expectedRevenue: number;
  reason: string;
};

export type ClosingWindowResult = {
  minDays: number;
  maxDays: number;
  confidence: number;
  reason: string;
};

export type RescuePlan = {
  triggerType: string;
  strategy: string;
  channel: "call" | "sms" | "email" | "whatsapp";
  messagePreview: string;
  scheduledFor: string | null;
  status: RescueStatus;
};

export type DecisionPayload = {
  leadId: string;
  decision: DecisionScorecard;
  closingWindow: ClosingWindowResult;
  risk: {
    level: "low" | "medium" | "high";
    trend: RiskTrend;
    rescueSuggested: boolean;
  };
};
