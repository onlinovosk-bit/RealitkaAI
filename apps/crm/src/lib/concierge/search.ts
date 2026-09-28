import { isPubliclyVisible } from "@/lib/properties/public-visibility";

export type ConciergePropertyRow = {
  id: string;
  title: string;
  location: string;
  price: number | null;
  type: string | null;
  rooms: string | null;
  status: string;
  transaction_type: string | null;
  realvia_updated_at: string | null;
  broker_name: string | null;
  broker_email: string | null;
  broker_phone: string | null;
};

export type ConciergePropertyCard = {
  id: string;
  title: string;
  location: string;
  price: number | null;
  type: string | null;
  rooms: string | null;
  transactionType: string | null;
  brokerName: string | null;
};

export type ConciergeSearchQuery = {
  locality?: string;
  propertyType?: string;
  deal?: "buy" | "rent" | "sell";
  limit?: number;
};

const DEAL_TO_TXN: Record<string, string[]> = {
  buy: ["predaj", "kúpa", "kupa", "sale", "sell"],
  sell: ["predaj", "sale", "sell"],
  rent: ["prenájom", "prenajom", "rent", "nájom", "najom"],
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function filterConciergeProperties(
  rows: ConciergePropertyRow[],
  query: ConciergeSearchQuery,
  now: Date = new Date(),
  env: NodeJS.ProcessEnv = process.env,
): ConciergePropertyCard[] {
  const locality = query.locality?.trim();
  const propertyType = query.propertyType?.trim();
  const deal = query.deal;
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);

  const out: ConciergePropertyCard[] = [];
  for (const row of rows) {
    if (
      !isPubliclyVisible(
        { status: row.status, realviaUpdatedAt: row.realvia_updated_at },
        now,
        env,
      )
    ) {
      continue;
    }
    if (locality && !norm(row.location ?? "").includes(norm(locality))) {
      continue;
    }
    if (propertyType && norm(row.type ?? "") !== norm(propertyType)) {
      // soft match contains
      if (!norm(row.type ?? "").includes(norm(propertyType))) continue;
    }
    if (deal) {
      const allowed = DEAL_TO_TXN[deal] ?? [];
      const txn = norm(row.transaction_type ?? "");
      if (txn && !allowed.some((a) => txn.includes(a))) continue;
    }
    out.push({
      id: row.id,
      title: row.title,
      location: row.location,
      price: row.price,
      type: row.type,
      rooms: row.rooms,
      transactionType: row.transaction_type,
      brokerName: row.broker_name,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** Pure helper — used by mutation tests for agency filter. */
export function assertSameAgency(
  rowAgencyId: string,
  expectedAgencyId: string,
): boolean {
  return rowAgencyId === expectedAgencyId;
}
