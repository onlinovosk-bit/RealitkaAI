export type ProofAnswers = {
  agentsCount: number;
  leadsPerMonth: number;
  responseMinutes: number;
  dealRatePercent: number;
  followUpRatePercent: number;
  name: string;
  email: string;
  company: string;
  phone?: string;
  city?: string;
  gdprConsent: boolean;
};

export type LeakModelResult = {
  monthlyLeakEur: number;
  recoveredEur: number;
  projectedDeals: number;
  lostShare: number;
  currentDeals: number;
};

export type ProofRisk = {
  id: string;
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
};

export type ProofMetric = {
  id: string;
  label: string;
  value: string;
  hint: string;
};

export type ProofReport = {
  revenueHealthScore: number;
  leak: LeakModelResult;
  leadsWithoutFollowUpEstimate: number;
  metrics: ProofMetric[];
  risks: ProofRisk[];
  disclaimer: string;
};
