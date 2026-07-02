import { randomBytes } from "crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Čitateľný kód: REV-47-XXXXXX (bez 0/O/1/I kvôli preklepom). */
export function generateStarterPackRedemptionCode(): string {
  let suffix = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    suffix += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return `REV-47-${suffix}`;
}
