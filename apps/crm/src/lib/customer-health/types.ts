export type CustomerHealthSeverity = "orange" | "red";

export type CustomerHealthSignalCode =
  | "LEAD_SILENCE"
  | "OWNER_LOGIN_STALE"
  | "NEVER_LOGGED_IN_SHARE"
  | "TEAM_LOGIN_SILENCE";

export type CustomerHealthSignal = {
  code: CustomerHealthSignalCode;
  severity: CustomerHealthSeverity;
  detail: string;
  /** Numeric evidence for tests / report (days or share 0–1). */
  value: number | null;
};

export type AgencyHealthInput = {
  agencyId: string;
  agencyName: string;
  /** null = never received a lead */
  daysSinceLastLead: number | null;
  /** null = no owner profile or no login data */
  daysSinceOwnerLogin: number | null;
  /** 0–1; 1 = every account never logged in */
  neverLoggedInShare: number;
  profileCount: number;
  /** true when at least one team member signed in within 30d window */
  anyTeamLoginWithin30d: boolean;
  isPaying: boolean;
};

export type AgencyHealthResult = {
  agencyId: string;
  agencyName: string;
  isPaying: boolean;
  severity: CustomerHealthSeverity | null;
  signals: CustomerHealthSignal[];
};
