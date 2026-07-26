/** Won/lost reason codes v1 — review +30d (premortem #2). */
export const WON_REASON_CODES = [
  "cena",
  "rychlost",
  "vztah",
  "exkluzivita",
  "ine",
] as const;

export const LOST_REASON_CODES = [
  "cena",
  "konkurencia",
  "rozmyslel_si",
  "financovanie",
  "nedostupny",
  "ine",
] as const;

export type WonReasonCode = (typeof WON_REASON_CODES)[number];
export type LostReasonCode = (typeof LOST_REASON_CODES)[number];

/** Fallback when deal close reason was not supplied (non-UI paths). */
export const UNSPECIFIED_REASON_CODE = "unspecified" as const;

export type DealOutcomeKind = "won" | "lost";

export function isKnownWonReason(code: string): code is WonReasonCode {
  return (WON_REASON_CODES as readonly string[]).includes(code);
}

export function isKnownLostReason(code: string): code is LostReasonCode {
  return (LOST_REASON_CODES as readonly string[]).includes(code);
}
