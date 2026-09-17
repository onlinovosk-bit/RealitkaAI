import {
  isDemandTransaction,
  isRealviaMappingUnknown,
} from "@/lib/realvia/map-taxonomy";

export type ListingTaxonomyFields = {
  id: string;
  type: string;
  transactionType?: string | null;
  price: number;
};

export type PublicListingsPartition<T> = {
  matched: T[];
  unknown: T[];
  /** Seeker ads (transaction Dopyt) — not inventory; never render on /nehnutelnosti. */
  demand: T[];
};

function matchesTypeFilter(
  type: string,
  typeFilter: string | string[] | undefined,
): boolean {
  if (typeFilter == null) return true;
  if (Array.isArray(typeFilter)) {
    if (typeFilter.length === 0) return true;
    return typeFilter.includes(type);
  }
  const trimmed = typeFilter.trim();
  if (!trimmed) return true;
  return type === trimmed;
}

/**
 * Split public listings into exact filter matches, honest-unknown taxonomy,
 * and demand (Dopyt) seeker ads excluded from offer inventory.
 */
export function partitionPublicListings<T extends ListingTaxonomyFields>(
  rows: T[],
  opts: {
    typeFilter?: string | string[];
    budgetMin?: number;
    budgetMax?: number;
  },
): PublicListingsPartition<T> {
  const budgetMin = opts.budgetMin ?? 0;
  const budgetMax = opts.budgetMax ?? 0;

  const inBudget = (p: T) => {
    if (budgetMin > 0 && p.price < budgetMin) return false;
    if (budgetMax > 0 && p.price > budgetMax) return false;
    return true;
  };

  const isUnknown = (p: T) =>
    isRealviaMappingUnknown(p.type) || isRealviaMappingUnknown(p.transactionType);

  const demand = rows.filter(
    (p) => inBudget(p) && isDemandTransaction(p.transactionType),
  );
  const demandIds = new Set(demand.map((p) => p.id));

  const matched = rows.filter((p) => {
    if (demandIds.has(p.id)) return false;
    if (!inBudget(p)) return false;
    if (isUnknown(p)) return false;
    if (!matchesTypeFilter(p.type, opts.typeFilter)) return false;
    return true;
  });

  const matchedIds = new Set(matched.map((p) => p.id));
  const unknown = rows.filter((p) => {
    if (demandIds.has(p.id)) return false;
    if (!inBudget(p)) return false;
    if (!isUnknown(p)) return false;
    return !matchedIds.has(p.id);
  });

  return { matched, unknown, demand };
}

/** Honest UI label — never fog Neznáme into a typed SK label. */
export function publicListingTypeLabel(type: string | null | undefined): string {
  if (isRealviaMappingUnknown(type)) return "Typ zatiaľ neurčený";
  const trimmed = String(type ?? "").trim();
  return trimmed || "Typ zatiaľ neurčený";
}
