/** Thresholds for customer-health silence watchdog — single source of truth. */
export const CUSTOMER_HEALTH_THRESHOLDS = {
  /** Days since last lead → orange */
  DAYS_SINCE_LEAD_ORANGE: 3,
  /** Days since last lead → red */
  DAYS_SINCE_LEAD_RED: 7,
  /** Days since owner last login → orange */
  DAYS_SINCE_OWNER_LOGIN_ORANGE: 14,
  /** Share of accounts that never logged in → orange (0–1) */
  NEVER_LOGGED_IN_SHARE_ORANGE: 0.5,
  /** No login by anyone on the team within this many days → red */
  DAYS_NO_TEAM_LOGIN_RED: 30,
} as const;
