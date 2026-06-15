export type ActivationState = "S0" | "S1" | "S2" | "S3" | "S4";

export type ActivationEmailNode =
  | "d0"
  | "d2_s0"
  | "d2_s1"
  | "d2_s2"
  | "d5_progress"
  | "d5_founder_draft"
  | "d7_activated";

export interface AgencyActivationSnapshot {
  agencyId: string;
  agencyName: string;
  agencyCreatedAt: string;
  ownerEmail: string;
  ownerName: string;
  painMirror: string;
  hasImport: boolean;
  scoredLeadCount: number;
  highestScore: number | null;
  morningReportEnabled: boolean;
  lastLoginAt: string | null;
  daysSinceSignup: number;
  optOut: boolean;
}

export interface RenderedActivationEmail {
  node: ActivationEmailNode;
  subject: string;
  subjectAlt: string;
  preheader: string;
  html: string;
  plaintext: string;
  ctaUrl: string;
  ctaLabel: string;
}
