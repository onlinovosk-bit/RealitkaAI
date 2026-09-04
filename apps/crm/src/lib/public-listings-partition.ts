import { isRealviaMappingUnknown } from "@/lib/realvia/map-taxonomy";

export type ListingTaxonomyFields = {
  id: string;
  type: string;
  transactionType?: string | null;
  price: number;
};

/**
 * Split public listings into exact filter matches vs honest-unknown taxonomy.
 * Unknowns never pretend to be Byt/Dom/Predaj — they go to a separate section.
 */
export function partitionPublicListings<T extends ListingTaxonomyFields>(
  rows: T[],
  opts: {
    typeFilter?: string;
    budgetMin?: number;
    budgetMax?: number;
  },
): { matched: T[]; unknown: T[] } {
  const typeFilter = opts.typeFilter?.trim() ?? "";
  const budgetMin = opts.budgetMin ?? 0;
  const budgetMax = opts.budgetMax ?? 0;

  const inBudget = (p: T) => {
    if (budgetMin > 0 && p.price < budgetMin) return false;
    if (budgetMax > 0 && p.price > budgetMax) return false;
    return true;
  };

  const isUnknown = (p: T) =>
    isRealviaMappingUnknown(p.type) || isRealviaMappingUnknown(p.transactionType);

  const matched = rows.filter((p) => {
    if (!inBudget(p)) return false;
    if (isUnknown(p)) return false;
    if (typeFilter && p.type !== typeFilter) return false;
    return true;
  });

  const matchedIds = new Set(matched.map((p) => p.id));
  const unknown = rows.filter((p) => {
    if (!inBudget(p)) return false;
    if (!isUnknown(p)) return false;
    return !matchedIds.has(p.id);
  });

  return { matched, unknown };
}

/** Honest UI label — never fog Neznáme into a typed SK label. */
export function publicListingTypeLabel(type: string | null | undefined): string {
  if (isRealviaMappingUnknown(type)) return "Typ zatiaľ neurčený";
  const trimmed = String(type ?? "").trim();
  return trimmed || "Typ zatiaľ neurčený";
}
