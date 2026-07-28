export type OperatorAgencyStatus = "live" | "onboarding" | "system";

export type MetricAvailability = "available" | "unavailable";

export type OperatorAttentionSignalType =
  | "guardian_hot_ignored"
  | "guardian_no_owner"
  | "onboarding_incomplete"
  | "widget_disabled";

export type OperatorAttentionItem = {
  agencyId: string;
  agencyName: string;
  signalType: OperatorAttentionSignalType;
  label: string;
  detail: string;
  detectedAt: string;
  priority: 1 | 2 | 3;
};

export type OperatorAgencyRow = {
  agencyId: string;
  agencyName: string;
  status: OperatorAgencyStatus;
  excludedFromScoring: boolean;
  contacts7d: number;
  contactsTotal: number;
  trend14d: number[];
  reaction24hPct: number | null;
  reaction24hStatus: MetricAvailability;
  noReactionCount: number;
  dealsWon: number;
  dealsLost: number;
  openGuardianFindings: number;
  healthScore: number | null;
};

export type OperatorPlatformHealth = {
  valuationWidgetsEnabled: number;
  valuationWidgetsTotal: number;
  guardianLastRunAt: string | null;
  heartbeatCheckedAt: string | null;
  guardianDigestEnabled: boolean;
  guardianRunnerEnabled: boolean;
};

export type OperatorDashboardPayload = {
  asOf: string;
  attention: OperatorAttentionItem[];
  agencies: OperatorAgencyRow[];
  platformHealth: OperatorPlatformHealth;
};
