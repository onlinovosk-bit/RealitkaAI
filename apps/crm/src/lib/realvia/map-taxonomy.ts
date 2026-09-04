/**
 * Realvia taxonomy → CRM property fields.
 *
 * Source of truth (2026-09-04): https://dev.realvia.sk/doc/export/index.php#ciselniky
 * Unknown Realvia codes stay explicitly unknown — never fog into Ostatné/Predaj.
 * Do not infer type/transaction from listing titles (AP-005).
 */

/** Sentinel written to `properties.type` / `transaction_type` when code is unmapped. */
export const REALVIA_MAPPING_UNKNOWN = "Neznáme";

/** Transaction label for Realvia code 122 — seeker ads, not inventory offers. */
export const REALVIA_TRANSACTION_DEMAND = "Dopyt";

/**
 * Official category → CRM type (číselník 2026-09-04).
 * Codes 15–19 removed — not in číselník / not in prod data (were estimates).
 */
const categoryMap: Readonly<Record<number, string>> = {
  9: "Byt",
  11: "Byt",
  12: "Byt",
  13: "Byt",
  14: "Byt",
  20: "Dom",
  27: "Chata",
  28: "Záhradný domček",
  30: "Pozemok",
  34: "Pozemok",
  35: "Pozemok",
  37: "Pozemok",
  41: "Pozemok",
  46: "Komerčná",
  47: "Komerčná",
  48: "Komerčná",
  57: "Komerčná",
  60: "Komerčná",
  61: "Komerčná",
  65: "Komerčná",
};

/** Official transaction → CRM label. */
const transactionMap: Readonly<Record<number, string>> = {
  122: REALVIA_TRANSACTION_DEMAND,
  123: "Prenájom",
  124: "Podnájom",
  125: "Výmena",
  127: "Predaj",
};

const roomsFromCategoryMap: Readonly<Record<number, string>> = {
  9: "garsónka",
  11: "1 izba",
  12: "2 izby",
  13: "3 izby",
  14: "4 izby",
};

export function isRealviaMappingUnknown(value: string | null | undefined): boolean {
  return String(value ?? "").trim() === REALVIA_MAPPING_UNKNOWN;
}

export function isDemandTransaction(value: string | null | undefined): boolean {
  return String(value ?? "").trim() === REALVIA_TRANSACTION_DEMAND;
}

/**
 * Map Realvia category number to our property type.
 */
export function mapCategory(category: number): string {
  return categoryMap[category] ?? REALVIA_MAPPING_UNKNOWN;
}

/**
 * Map Realvia transaction number to our transaction type.
 * Unknown codes must not default to Predaj.
 */
export function mapTransaction(transaction: number): string {
  return transactionMap[transaction] ?? REALVIA_MAPPING_UNKNOWN;
}

/**
 * Derive rooms label from flat category when `rooms_count` is missing.
 * Only categories 9/11–14; everything else → null.
 */
export function roomsFromCategory(category: number): string | null {
  return roomsFromCategoryMap[category] ?? null;
}
