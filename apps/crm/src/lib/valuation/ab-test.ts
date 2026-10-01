export type ValuationAbVariant = "A" | "B";

export const VALUATION_SESSION_COOKIE = "revolis_valuation_sid";
export const VALUATION_VARIANT_COOKIE = "revolis_valuation_ab";
export const VALUATION_AB_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

/** Deterministic 50/50 split from session id (same id → same variant). */
export function hashSessionToVariant(sessionId: string): ValuationAbVariant {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i += 1) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return hash % 2 === 0 ? "A" : "B";
}

export function generateValuationSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `vs-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSec: number): void {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`;
}

export type ValuationAbAssignment = {
  sessionId: string;
  variant: ValuationAbVariant;
};

/** Client-only: read or create session + variant cookies (30 dní). */
export function getOrAssignValuationAbTest(): ValuationAbAssignment {
  let sessionId = readCookie(VALUATION_SESSION_COOKIE);
  let variant = readCookie(VALUATION_VARIANT_COOKIE) as ValuationAbVariant | null;

  if (!sessionId) {
    sessionId = generateValuationSessionId();
    writeCookie(VALUATION_SESSION_COOKIE, sessionId, VALUATION_AB_COOKIE_MAX_AGE_SEC);
  }

  if (variant !== "A" && variant !== "B") {
    variant = hashSessionToVariant(sessionId);
    writeCookie(VALUATION_VARIANT_COOKIE, variant, VALUATION_AB_COOKIE_MAX_AGE_SEC);
  }

  return { sessionId, variant };
}

/**
 * Variant A: nehnuteľnosť → kontakt → odhad (súčasný flow, PR #309).
 * Variant B: nehnuteľnosť → odhad → kontakt (odhad pred odovzdaním kontaktu).
 */
export const VALUATION_AB_VARIANT_LABELS: Record<ValuationAbVariant, string> = {
  A: "property_contact_estimate",
  B: "property_estimate_contact",
};
