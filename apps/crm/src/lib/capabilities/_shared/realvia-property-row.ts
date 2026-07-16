import type { UcListingMapped, UcListingImage } from "@/lib/uc/mapper-listing";
import { stripHtmlToPlainText } from "@/lib/capabilities/_shared/strip-html";

/** Row shape from `properties` (Realvia). Only fields that exist on real rows. */
export type RealviaPropertyRow = {
  id: string;
  source_id: string;
  source_system: string;
  title: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  location?: string | null;
  type?: string | null;
  rooms?: string | null;
  transaction_type?: string | null;
  usable_area?: number | null;
  land_area?: number | null;
  building_area?: number | null;
  rooms_count?: number | null;
  floor?: number | null;
  broker_name?: string | null;
  broker_email?: string | null;
  broker_phone?: string | null;
  images?: unknown;
  payload_raw?: unknown;
  latitude?: number | null;
  longitude?: number | null;
};

function parseImages(raw: unknown): UcListingImage[] {
  if (!Array.isArray(raw)) return [];
  const out: UcListingImage[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.startsWith("http")) {
      out.push({ url: item, changed: false });
      continue;
    }
    if (item && typeof item === "object" && "url" in item) {
      const url = String((item as { url: unknown }).url ?? "").trim();
      if (url) out.push({ url, changed: false });
    }
  }
  return out;
}

/** Map DB property row → listing generator input (no invented fields). */
export function realviaRowToUcListing(row: RealviaPropertyRow): UcListingMapped {
  const images = parseImages(row.images);
  const title = String(row.title ?? "").trim();
  const description = stripHtmlToPlainText(String(row.description ?? ""));

  return {
    externalId: row.source_id,
    agencyListingId: row.id,
    deleted: false,
    title,
    description,
    location: String(row.location ?? "").trim(),
    price: row.price ?? 0,
    currency: String(row.currency ?? "EUR"),
    type: String(row.type ?? ""),
    rooms: String(row.rooms ?? ""),
    status: "active",
    transactionType: String(row.transaction_type ?? ""),
    usableArea: row.usable_area ?? null,
    plotArea: row.land_area ?? null,
    buildingArea: row.building_area ?? null,
    roomsCount: row.rooms_count ?? null,
    bathroomsCount: null,
    floor: row.floor ?? null,
    brokerSourceId: null,
    brokerName: row.broker_name ?? null,
    brokerEmail: row.broker_email ?? null,
    brokerPhone: row.broker_phone ?? null,
    latitude: null,
    longitude: null,
    images,
    langData: {
      sk: { title, description },
    },
    medias: {},
    flags: {},
    taxonomy: {},
    raw: typeof row.payload_raw === "object" && row.payload_raw ? (row.payload_raw as Record<string, unknown>) : {},
  };
}
