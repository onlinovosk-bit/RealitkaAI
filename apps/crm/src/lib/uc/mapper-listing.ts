import { UC_LISTING_KNOWN_FIELDS } from "@/lib/uc/field-catalog";
import {
  coerceBool,
  coerceNumber,
  coerceString,
  isRecord,
  partitionKnownFields,
} from "@/lib/uc/shared";

export type UcListingImage = {
  url: string;
  changed: boolean;
};

export type UcLangEntry = {
  title: string;
  description: string;
};

export type UcListingMapped = {
  externalId: string;
  agencyListingId: string | null;
  deleted: boolean;
  title: string;
  description: string;
  location: string;
  price: number;
  currency: string;
  type: string;
  rooms: string;
  status: string;
  transactionType: string;
  usableArea: number | null;
  plotArea: number | null;
  buildingArea: number | null;
  roomsCount: number | null;
  bathroomsCount: number | null;
  floor: number | null;
  brokerSourceId: string | null;
  brokerName: string | null;
  brokerEmail: string | null;
  brokerPhone: string | null;
  latitude: number | null;
  longitude: number | null;
  images: UcListingImage[];
  langData: Record<string, UcLangEntry>;
  medias: Record<string, string[]>;
  flags: Record<string, boolean | number | string | null>;
  taxonomy: Record<string, number | string | null>;
  raw: Record<string, unknown>;
};

export class UcListingMapperValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "UcListingMapperValidationError";
    this.field = field;
  }
}

const CATEGORY_LABELS: Record<number, string> = {
  1: "Poľnohospodársky objekt",
  2: "Komerčný objekt",
  3: "Pozemok",
  4: "Byt",
  5: "Historický objekt",
  6: "Dom",
  7: "Hotel a reštaurácia",
  8: "Nájomný dom",
  9: "Komerčný priestor",
  10: "Chata",
  11: "Garáž",
};

const SUBCATEGORY_ROOM_LABELS: Record<number, string> = {
  401: "Garsónka",
  402: "1 izbový byt",
  403: "2 izbový byt",
  404: "3 izbový byt",
  405: "4 izbový byt",
  406: "5+ izbový byt",
};

const TRANSACTION_LABELS: Record<number, string> = {
  1: "Predaj",
  2: "Kúpa",
  3: "Prenájom",
  4: "Hľadám prenájom",
  5: "Výmena",
  6: "Dražba",
};

const CURRENCY_LABELS: Record<number, string> = {
  1: "EUR",
  2: "USD",
  3: "CZK",
};

function buildLocation(data: Record<string, unknown>): string {
  const parts = [
    coerceString(data.street),
    coerceString(data.street_number),
    coerceString(data.citypart_string),
  ].filter(Boolean);
  return parts.join(" ").trim();
}

function parseImages(value: unknown): UcListingImage[] {
  if (!Array.isArray(value)) return [];
  const images: UcListingImage[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const url = coerceString(item.url);
    if (!url) continue;
    images.push({ url, changed: coerceBool(item.changed) });
  }
  return images;
}

function parseLangData(value: unknown): Record<string, UcLangEntry> {
  if (!isRecord(value)) return {};
  const out: Record<string, UcLangEntry> = {};
  for (const [lang, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    const title = coerceString(entry.title) ?? "";
    const description = coerceString(entry.description) ?? "";
    if (!title && !description) continue;
    out[lang] = { title, description };
  }
  return out;
}

function parseMedias(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) return {};
  const out: Record<string, string[]> = {};
  for (const [platform, urls] of Object.entries(value)) {
    if (!Array.isArray(urls)) continue;
    const cleaned = urls
      .map((item) => coerceString(item))
      .filter((item): item is string => Boolean(item));
    if (cleaned.length > 0) out[platform] = cleaned;
  }
  return out;
}

function collectBoolFlags(data: Record<string, unknown>): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(data)) {
    if (
      key.startsWith("heating_") ||
      key.startsWith("floor_") ||
      key.startsWith("window_") ||
      key.startsWith("bath_") ||
      key.startsWith("kitchen_") ||
      key.startsWith("adv_") ||
      key.startsWith("access_") ||
      key.startsWith("security_") ||
      key.startsWith("availability_")
    ) {
      flags[key] = coerceBool(value);
    }
  }
  return flags;
}

function inferType(category: number | null, subcategory: number | null): string {
  if (category != null && CATEGORY_LABELS[category]) return CATEGORY_LABELS[category];
  if (subcategory != null && SUBCATEGORY_ROOM_LABELS[subcategory]) return "Byt";
  return "Neznámy";
}

function inferRooms(
  category: number | null,
  subcategory: number | null,
  roomsCount: number | null,
): string {
  if (subcategory != null && SUBCATEGORY_ROOM_LABELS[subcategory]) {
    return SUBCATEGORY_ROOM_LABELS[subcategory];
  }
  if (roomsCount != null && roomsCount > 0) return `${roomsCount} izby`;
  return "Neuvedené";
}

export function mapUcListingPayload(data: Record<string, unknown>): UcListingMapped {
  const externalId = coerceString(data.object_id) ?? coerceString(data.id);
  if (!externalId) {
    throw new UcListingMapperValidationError("object_id", "Missing required object_id");
  }

  const title = coerceString(data.title);
  if (!title) {
    throw new UcListingMapperValidationError("title", "Missing required title");
  }

  const priceCurrency = coerceNumber(data.price_currency);
  const transactionCode = coerceNumber(data.action);
  const category = coerceNumber(data.category);
  const subcategory = coerceNumber(data.subcategory);
  const roomsCount = coerceNumber(data.rooms_count);
  const partitioned = partitionKnownFields(data, UC_LISTING_KNOWN_FIELDS);

  return {
    externalId,
    agencyListingId: coerceString(data.id),
    deleted: coerceBool(data.deleted),
    title,
    description: coerceString(data.description) ?? "",
    location: buildLocation(data),
    price: Math.round(coerceNumber(data.price) ?? 0),
    currency:
      (priceCurrency != null ? CURRENCY_LABELS[priceCurrency] : null) ?? "EUR",
    type: inferType(category, subcategory),
    rooms: inferRooms(category, subcategory, roomsCount),
    status: "Aktivna",
    transactionType:
      (transactionCode != null ? TRANSACTION_LABELS[transactionCode] : null) ?? "",
    usableArea: coerceNumber(data.usable_area),
    plotArea: coerceNumber(data.plot_area),
    buildingArea: coerceNumber(data.building_area),
    roomsCount,
    bathroomsCount: coerceNumber(data.bathrooms_count),
    floor: coerceNumber(data.floor),
    brokerSourceId: coerceString(data.agent_id),
    brokerName: coerceString(data.agent),
    brokerEmail: coerceString(data.agent_email),
    brokerPhone: coerceString(data.agent_phone),
    latitude: coerceNumber(data.gps_x),
    longitude: coerceNumber(data.gps_y),
    images: parseImages(data.images),
    langData: parseLangData(data.langData),
    medias: parseMedias(data.medias),
    flags: collectBoolFlags(data),
    taxonomy: {
      state_id: coerceNumber(data.state_id),
      county_id: coerceNumber(data.county_id),
      district_id: coerceNumber(data.district_id),
      region_id: coerceNumber(data.region_id),
      citypart_id: coerceNumber(data.citypart_id),
      street_id: coerceNumber(data.street_id),
      category,
      subcategory,
      ownership: coerceNumber(data.ownership),
      house_type: coerceNumber(data.house_type),
      energy_cert: coerceNumber(data.energy_cert),
      energy_rating: coerceNumber(data.energy_rating),
      orientation: coerceNumber(data.orientation),
      status_code: coerceNumber(data.status),
      price_unit: coerceNumber(data.price_unit),
      price_currency: priceCurrency,
    },
    raw: partitioned.raw,
  };
}
