import type { PropertyInput, ListingPersona, ListingContent } from "@/lib/ai/listing-content";
import type { RealviaPropertyRow } from "@/lib/capabilities/_shared/realvia-property-row";
import { realviaRowToUcListing } from "@/lib/capabilities/_shared/realvia-property-row";
import {
  isRealviaMappingUnknown,
  REALVIA_MAPPING_UNKNOWN,
} from "@/lib/realvia/map-taxonomy";

/** Canonical facts for Launch Pack — never invent type/txn. */
export type PropertyLaunchFacts = {
  source: "manual" | "realvia";
  sourceId: string | null;
  propertyId: string | null;
  title: string;
  description: string;
  location: string;
  district?: string;
  price: number;
  size_m2: number;
  rooms?: string;
  floor?: number;
  total_floors?: number;
  condition: string;
  features: string[];
  agent_notes?: string;
  /** Mapped DB / form value — may be Neznáme */
  type: string;
  transactionType: string;
};

export type TaxonomyConfirmation = {
  /** Required when facts.type is Neznáme */
  type?: string;
  /** Required when facts.transactionType is Neznáme */
  transactionType?: string;
};

export function isPropertyLaunchPackEnabled(): boolean {
  return process.env.PROPERTY_LAUNCH_PACK_V0 === "1";
}

export function factsFromPropertyInput(
  property: PropertyInput,
  opts?: { propertyId?: string | null },
): PropertyLaunchFacts {
  return {
    source: "manual",
    sourceId: null,
    propertyId: opts?.propertyId ?? null,
    title: "",
    description: property.agent_notes ?? "",
    location: property.location,
    district: property.district,
    price: property.price,
    size_m2: property.size_m2,
    rooms: property.rooms,
    floor: property.floor,
    total_floors: property.total_floors,
    condition: property.condition,
    features: property.features ?? [],
    agent_notes: property.agent_notes,
    type: property.type,
    transactionType: "Predaj",
  };
}

export function factsFromRealviaRow(row: RealviaPropertyRow): PropertyLaunchFacts {
  const listing = realviaRowToUcListing(row);
  const size =
    listing.usableArea && listing.usableArea > 0
      ? listing.usableArea
      : listing.buildingArea && listing.buildingArea > 0
        ? listing.buildingArea
        : 0;

  return {
    source: "realvia",
    sourceId: row.source_id,
    propertyId: row.id,
    title: listing.title,
    description: listing.description,
    location: listing.location,
    price: listing.price ?? 0,
    size_m2: size,
    rooms: listing.rooms || undefined,
    floor: listing.floor ?? undefined,
    condition: "neuvedené",
    features: [],
    agent_notes: listing.description.slice(0, 5_000) || undefined,
    type: listing.type || REALVIA_MAPPING_UNKNOWN,
    transactionType: listing.transactionType || REALVIA_MAPPING_UNKNOWN,
  };
}

/** Apply maklér confirmation over Neznáme — never invent from titles. */
export function resolveTaxonomy(
  facts: PropertyLaunchFacts,
  confirm?: TaxonomyConfirmation,
): { type: string; transactionType: string; needsTypeConfirm: boolean; needsTxnConfirm: boolean } {
  const needsTypeConfirm = isRealviaMappingUnknown(facts.type);
  const needsTxnConfirm = isRealviaMappingUnknown(facts.transactionType);
  const confirmedType = confirm?.type?.trim() ?? "";
  const confirmedTxn = confirm?.transactionType?.trim() ?? "";

  return {
    needsTypeConfirm,
    needsTxnConfirm,
    type: needsTypeConfirm
      ? confirmedType || REALVIA_MAPPING_UNKNOWN
      : facts.type,
    transactionType: needsTxnConfirm
      ? confirmedTxn || REALVIA_MAPPING_UNKNOWN
      : facts.transactionType,
  };
}

export function factsToPropertyInput(
  facts: PropertyLaunchFacts,
  taxonomy: { type: string; transactionType: string },
): PropertyInput {
  const dealHint =
    taxonomy.transactionType && !isRealviaMappingUnknown(taxonomy.transactionType)
      ? `Transakcia: ${taxonomy.transactionType}.`
      : "";
  return {
    type: taxonomy.type,
    location: facts.location,
    district: facts.district,
    size_m2: facts.size_m2 > 0 ? facts.size_m2 : 1,
    floor: facts.floor,
    total_floors: facts.total_floors,
    price: facts.price,
    rooms: facts.rooms,
    condition: facts.condition || "neuvedené",
    features: facts.features,
    agent_notes: [facts.agent_notes, dealHint].filter(Boolean).join("\n"),
  };
}

export type LaunchPackExport = {
  version: 1;
  generatedAt: string;
  source: PropertyLaunchFacts["source"];
  sourceId: string | null;
  propertyId: string | null;
  taxonomy: { type: string; transactionType: string };
  persona: ListingPersona;
  channels: ListingContent;
  guardian: { verdict: string; reasons: string[]; blockedPublish: boolean };
  packMeta?: {
    completenessPercent?: number;
    bannerCount?: number;
    publishBlocked: true;
  };
};

const EXPORT_FORBIDDEN_KEYS = new Set([
  "payload_raw",
  "broker_email",
  "broker_phone",
  "broker_name",
]);

/** Download-ready JSON — strips forbidden PII/raw keys recursively. */
export function buildLaunchPackExport(payload: LaunchPackExport): LaunchPackExport {
  return JSON.parse(
    JSON.stringify(payload, (key, value) => {
      if (EXPORT_FORBIDDEN_KEYS.has(key)) return undefined;
      return value;
    }),
  ) as LaunchPackExport;
}
