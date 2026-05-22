/** Marketing psychology programs — progressive AI operating system */
export type LicenseProgramId = "smart" | "radar" | "guardian" | "monopol";

export type LicensePsychology = "kontrola" | "príležitosti" | "ochrana" | "dominancia";

/** Normalized tier keys from profiles.account_tier (+ Stripe aliases) */
export type LicenseTierKey =
  | "free"
  | "starter"
  | "pro"
  | "enterprise"
  | "market_vision"
  | "command"
  | "protocol_authority";

export type LicenseCapability =
  | "canViewBasicDashboard"
  | "canManageLeads"
  | "canUseAiTasks"
  | "canViewForecast"
  | "canUseMarketIntel"
  | "canViewDemandHeatmap"
  | "canAccessTeamPressure"
  | "canUseRescueAutomation"
  | "canViewClosingWindow"
  | "canUseCompetitionRadar"
  | "canAccessGuardianAlerts"
  | "canUseMonopolDominance";

export type UpgradeIntentEvent =
  | "locked_feature_view"
  | "upgrade_cta_click"
  | "forecast_attempt"
  | "market_intel_attempt"
  | "guardian_teaser_open"
  | "upgrade_modal_open"
  | "upgrade_modal_dismiss";

export type LicenseProgram = {
  id: LicenseProgramId;
  psychology: LicensePsychology;
  feeling: string;
  displayName: string;
  billingLabel: string;
  minTier: LicenseTierKey;
};

export type CapabilityDefinition = {
  capability: LicenseCapability;
  label: string;
  teaser: string;
  requiredProgram: LicenseProgramId;
  upgradeProgram: LicenseProgramId;
  upgradeCta: string;
  revenueTrigger: UpgradeIntentEvent;
};
