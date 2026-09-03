/**
 * Realvia taxonomy → CRM property fields.
 *
 * Unknown Realvia codes must stay explicitly unknown — never fog into
 * legitimate labels like "Ostatné" or "Predaj". Official číselník required
 * before inventing new known mappings (do not infer from titles).
 */

/** Sentinel written to `properties.type` / `transaction_type` when code is unmapped. */
export const REALVIA_MAPPING_UNKNOWN = "Neznáme";

const categoryMap: Readonly<Record<number, string>> = {
  11: "Byt",
  12: "Byt",
  // 13 / 14 were Dom — titles contradict; pending číselník → unknown (do not invent Byt)
  15: "Pozemok",
  16: "Pozemok",
  17: "Komerčná",
  18: "Komerčná",
  19: "Ostatné",
  20: "Ostatné",
};

const transactionMap: Readonly<Record<number, string>> = {
  // 123 was Predaj — titles often say prenájom; pending číselník → unknown (do not invent Prenájom)
  124: "Prenájom",
  125: "Dražba",
};

export function isRealviaMappingUnknown(value: string | null | undefined): boolean {
  return String(value ?? "").trim() === REALVIA_MAPPING_UNKNOWN;
}

/**
 * Map Realvia category number to our property type.
 * TODO: Populate remaining codes from official Realvia číselníky documentation.
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
