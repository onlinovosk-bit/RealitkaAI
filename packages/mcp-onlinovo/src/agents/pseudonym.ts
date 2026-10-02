import { createHmac } from "node:crypto";
import { AgentError } from "./types.js";

/**
 * Identity minimisation. Raw e-mail and phone numbers never go into an agent output, a log line or
 * a (future) LLM payload. The guard below is a heuristic, not proof: it catches the obvious shapes,
 * and the real protection is that agents only ever receive pseudonymous references.
 */
const EMAIL = /[^\s@"',;<>()]+@[^\s@"',;<>()]+\.[^\s@"',;<>()]+/;
const PHONE_INTERNATIONAL = /(?:\+|\b00)\d[\d ()./-]{7,}\d/;
const PHONE_LOCAL = /\b0\d{2,3}[ /-]?\d{3}[ -]?\d{3}\b/;
const PSEUDONYM_REF = /^(?:cus_[0-9a-f]{16}|FIX-CUS-\d{3,})$/;

const MIN_SALT_LENGTH = 16;

export function looksLikePii(text: string): boolean {
  return EMAIL.test(text) || PHONE_INTERNATIONAL.test(text) || PHONE_LOCAL.test(text);
}

/** Deterministic pseudonym: the same person always maps to the same reference under the same salt. */
export function pseudonymizeCustomer(rawIdentifier: string, salt: string | undefined): string {
  if (!salt || salt.length < MIN_SALT_LENGTH) {
    throw new AgentError(
      "PSEUDONYM_SALT_MISSING",
      `ONLINOVO_PSEUDONYM_SALT must be set and at least ${MIN_SALT_LENGTH} characters (fail-closed).`,
    );
  }
  const normalised = rawIdentifier.trim().toLowerCase();
  if (normalised === "") throw new AgentError("INVALID_INPUT", "empty identifier");
  const digest = createHmac("sha256", salt).update(normalised).digest("hex");
  return `cus_${digest.slice(0, 16)}`;
}

export function isPseudonymRef(ref: unknown): ref is string {
  return typeof ref === "string" && PSEUDONYM_REF.test(ref);
}

/** A customer reference must be a pseudonym. An e-mail or phone in this slot is refused, not cleaned. */
export function assertCustomerRef(ref: unknown): asserts ref is string {
  if (typeof ref !== "string" || ref === "") {
    throw new AgentError("INVALID_INPUT", "customer_ref must be a non-empty string");
  }
  if (!isPseudonymRef(ref)) {
    throw new AgentError(
      "PII_IN_REF",
      looksLikePii(ref)
        ? "customer_ref looks like an e-mail or phone number"
        : "customer_ref is not a pseudonymous reference (cus_<16 hex>)",
    );
  }
}

/** Deep scan of any payload. Throws on the first string that looks like an e-mail or phone number. */
export function assertNoPii(value: unknown, path = "$"): void {
  if (typeof value === "string") {
    if (looksLikePii(value)) throw new AgentError("PII_IN_PAYLOAD", `PII-like string at ${path}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoPii(item, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      assertNoPii(key, `${path}.<key>`);
      assertNoPii(item, `${path}.${key}`);
    }
  }
}

/** The only way a payload may be prepared for an LLM: whitelist the fields, then scan for PII. */
export function toLlmSafe<T extends Record<string, unknown>>(
  source: T,
  allowedKeys: readonly (keyof T & string)[],
): Partial<T> {
  const picked: Partial<T> = {};
  for (const key of allowedKeys) {
    if (key in source) picked[key] = source[key];
  }
  assertNoPii(picked);
  return picked;
}
