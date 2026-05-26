import { readDemoModeFromCookie } from "@/lib/demo-mode-cookie";
import { supabaseClient, getSupabaseClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateSyntheticProperties } from "@/lib/demo/synthetic-properties";
import { GOLD_STANDARD_POPRAD_STUROVA_3I } from "@/lib/mock-data";

export type Property = {
  id: string;
  agencyId: string | null;
  title: string;
  location: string;
  price: number;
  type: string;
  rooms: string;
  features: string[];
  status: string;
  description: string;
  ownerName: string;
  ownerPhone: string;
  /** Realvia broker — uložený v `broker_*` stĺpcoch, nie v popise. */
  brokerName?: string;
  brokerEmail?: string;
  brokerPhone?: string;
  createdAt?: string;
  updatedAt?: string;
};

/** Kontakt v tabuľke: vlastník ak je, inak maklér z Realvie. */
export function propertyListContactLabel(property: Pick<Property, "ownerName" | "brokerName">): string {
  const owner = property.ownerName?.trim();
  if (owner) return owner;
  const broker = property.brokerName?.trim();
  if (broker) return broker;
  return "-";
}

export type PropertyInput = {
  title: string;
  location: string;
  price: number;
  type: string;
  rooms: string;
  features: string[];
  status: string;
  description: string;
  ownerName: string;
  ownerPhone: string;
  agencyId?: string | null;
};

export type PropertyFilters = {
  q?: string;
  status?: string;
  location?: string;
  type?: string;
};

export type PropertiesSummary = {
  total: number;
  active: number;
  reserved: number;
  sold: number;
};

export type PropertiesInventory = {
  items: Property[];
  summary: PropertiesSummary;
};

/** Stĺpce vždy prítomné v produkcii (Realvia import). */
const PROPERTIES_SELECT_CORE =
  "id, agency_id, title, location, price, type, rooms, features, status, created_at, broker_name, broker_email, broker_phone";

const PROPERTIES_SELECT_FULL = `${PROPERTIES_SELECT_CORE}, description, owner_name, owner_phone, updated_at`;

const ACTIVE_STATUS_VALUES = new Set([
  "aktívna",
  "aktivna",
  "active",
  "aktivní",
  "aktivni",
]);

const RESERVED_STATUS_VALUES = new Set([
  "rezervovaná",
  "rezervovana",
  "reserved",
]);

const SOLD_STATUS_VALUES = new Set([
  "predaná",
  "predana",
  "sold",
]);

function normalizeStatusKey(status: string): string {
  return status.trim().toLowerCase();
}

export function buildPropertiesSummary(items: Property[]): PropertiesSummary {
  let active = 0;
  let reserved = 0;
  let sold = 0;

  for (const item of items) {
    const key = normalizeStatusKey(item.status);
    if (ACTIVE_STATUS_VALUES.has(key)) active += 1;
    else if (RESERVED_STATUS_VALUES.has(key)) reserved += 1;
    else if (SOLD_STATUS_VALUES.has(key)) sold += 1;
  }

  return {
    total: items.length,
    active,
    reserved,
    sold,
  };
}

/**
 * Jediný zdroj inventára pre kokpit aj /properties (SSR).
 * Vždy predaj `await createClient()` z `@/lib/supabase/server`.
 */
export async function loadPropertiesInventory(
  scopedSupabase: SupabaseClient,
): Promise<PropertiesInventory> {
  const items = await listProperties(undefined, scopedSupabase);
  return { items, summary: buildPropertiesSummary(items) };
}

function mapPropertyRow(item: Record<string, unknown>): Property {
  return {
    id: String(item.id),
    agencyId: (item.agency_id as string | null) ?? null,
    title: String(item.title ?? ""),
    location: String(item.location ?? ""),
    price: Number(item.price ?? 0),
    type: String(item.type ?? ""),
    rooms: String(item.rooms ?? ""),
    features: Array.isArray(item.features) ? (item.features as string[]) : [],
    status: String(item.status ?? ""),
    description: String(item.description ?? ""),
    ownerName: String(item.owner_name ?? ""),
    ownerPhone: String(item.owner_phone ?? ""),
    brokerName: String(item.broker_name ?? ""),
    brokerEmail: String(item.broker_email ?? ""),
    brokerPhone: String(item.broker_phone ?? ""),
    createdAt: item.created_at as string | undefined,
    updatedAt: item.updated_at as string | undefined,
  };
}

export const propertyStatusOptions = [
  "Aktívna",
  "Rezervovaná",
  "Predaná",
  "Stiahnutá",
];

export const propertyTypeOptions = [
  "Byt",
  "Dom",
  "Pozemok",
  "Komerčný priestor",
];

/** Základný katalóg: ručné ukážky + zlatý listing + ~340 syntetických záznamov (zmiešané stavy). */
const demoProperties: Property[] = [
  {
    id: "prop-demo-1",
    agencyId: null,
    title: "3-izbový byt Ružinov",
    location: "Bratislava - Ružinov",
    price: 278000,
    type: "Byt",
    rooms: "3 izby",
    features: ["balkón", "garáž", "novostavba"],
    status: "Aktívna",
    description: "Moderný byt v novostavbe s garážovým státím.",
    ownerName: "Ján Majiteľ",
    ownerPhone: "+421901111111",
  },
  {
    id: "prop-demo-2",
    agencyId: null,
    title: "Rodinný dom Nitra",
    location: "Nitra",
    price: 319000,
    type: "Dom",
    rooms: "4 izby",
    features: ["záhrada", "parkovanie"],
    status: "Predaná",
    description: "Rodinný dom v tichej lokalite so záhradou.",
    ownerName: "Marek Majiteľ",
    ownerPhone: "+421902222222",
  },
  {
    id: "prop-demo-3",
    agencyId: null,
    title: "2-izbový byt Trnava",
    location: "Trnava",
    price: 189000,
    type: "Byt",
    rooms: "2 izby",
    features: ["centrum", "balkón"],
    status: "Rezervovaná",
    description: "Praktický byt v centre mesta.",
    ownerName: "Petra Majiteľka",
    ownerPhone: "+421903333333",
  },
  GOLD_STANDARD_POPRAD_STUROVA_3I,
  ...generateSyntheticProperties(340),
];

function getDemoShowcaseProperties(): Property[] {
  return demoProperties.map((p) => {
    const isGoldPoprad = p.id === "poprad-sturova-3i-gold";
    const isLegacyHand = p.id?.startsWith("prop-demo-");
    return {
      ...p,
      price:
        isGoldPoprad ? p.price : isLegacyHand ? Math.round(p.price * 1.06) : p.price,
      features: p.features.includes("demo: Revolis spotlight")
        ? p.features
        : [...p.features, "demo: Revolis spotlight"],
    };
  });
}

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function isMissingOptionalPropertiesColumnError(message: string | undefined) {
  const normalized = String(message ?? "").toLowerCase();

  return ["description", "owner_name", "owner_phone", "updated_at"].some((column) =>
    normalized.includes(column)
  );
}

/** Lokálne filtrovanie (po jednom nefiltrovanom fetchi z DB). Export pre RSC, aby KPI sedeli s kokpitom. */
export function applyPropertyFilters(items: Property[], filters?: PropertyFilters) {
  let result = [...items];

  const qRaw = filters?.q?.trim();
  if (qRaw) {
    const q = normalize(qRaw);

    result = result.filter((item) =>
      [
        item.title,
        item.location,
        item.type,
        item.rooms,
        item.description,
        item.ownerName,
        item.ownerPhone,
        item.features.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  const status = filters?.status?.trim();
  if (status) {
    result = result.filter((item) => item.status === status);
  }

  const location = filters?.location?.trim();
  if (location) {
    const loc = normalize(location);
    result = result.filter((item) => item.location.toLowerCase().includes(loc));
  }

  const type = filters?.type?.trim();
  if (type) {
    result = result.filter((item) => item.type === type);
  }

  return result.sort((a, b) => b.price - a.price);
}

export function getAvailablePropertyLocations(items: Property[]) {
  return [...new Set(items.map((item) => item.location))].sort((a, b) =>
    a.localeCompare(b, "sk")
  );
}

export async function getPropertiesSummary(scopedSupabase?: SupabaseClient | null): Promise<PropertiesSummary> {
  if (scopedSupabase) {
    const { summary } = await loadPropertiesInventory(scopedSupabase);
    return summary;
  }
  const properties = await listProperties(undefined, scopedSupabase);
  return buildPropertiesSummary(properties);
}

/**
 * @param scopedSupabase ak voláš z React Server Component alebo Route Handler, predaj výsledok `await createClient()` z `@/lib/supabase/server` — inak RLS vie vrátiť 0 riadkov (bez prihlásenia).
 */
export async function listProperties(
  filters?: PropertyFilters,
  scopedSupabase?: SupabaseClient | null,
): Promise<Property[]> {
  if (await readDemoModeFromCookie()) {
    return applyPropertyFilters(getDemoShowcaseProperties(), filters);
  }

  const supabase = scopedSupabase ?? getSupabaseClient();

  if (!supabase) {
    return applyPropertyFilters(getDemoShowcaseProperties(), filters);
  }

  const statusFilter = filters?.status?.trim();
  const typeFilter = filters?.type?.trim();
  const locationFilter = filters?.location?.trim();
  const qTrimmed = filters?.q?.trim();

  const runSelect = async (selectColumns: string, includeDescriptionInOr: boolean) => {
    let query = supabase
      .from("properties")
      .select(selectColumns)
      .order("created_at", { ascending: false })
      .limit(500);

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }
    if (typeFilter) {
      query = query.eq("type", typeFilter);
    }
    if (locationFilter) {
      query = query.ilike("location", `%${locationFilter}%`);
    }
    if (qTrimmed) {
      const q = qTrimmed.replace(/,/g, " ");
      const orClause = includeDescriptionInOr
        ? `title.ilike.%${q}%,location.ilike.%${q}%,type.ilike.%${q}%,rooms.ilike.%${q}%,status.ilike.%${q}%,description.ilike.%${q}%,owner_name.ilike.%${q}%`
        : `title.ilike.%${q}%,location.ilike.%${q}%,type.ilike.%${q}%,rooms.ilike.%${q}%,status.ilike.%${q}%`;
      query = query.or(orClause);
    }
    return query;
  };

  let { data, error } = await runSelect(PROPERTIES_SELECT_FULL, true);

  if (
    (error || !data) &&
    isMissingOptionalPropertiesColumnError(error?.message)
  ) {
    const retried = await runSelect(PROPERTIES_SELECT_CORE, false);
    data = retried.data;
    error = retried.error;
  }

  if (error || !data) {
    console.error("listProperties error:", error?.message);
    return applyPropertyFilters(getDemoShowcaseProperties(), filters);
  }

  return data.map((item) => mapPropertyRow(item as Record<string, unknown>));
}

export async function getProperty(
  id: string,
  scopedSupabase?: SupabaseClient | null,
): Promise<Property | undefined> {
  if (await readDemoModeFromCookie()) {
    return getDemoShowcaseProperties().find((item) => item.id === id);
  }

  const supabase = scopedSupabase ?? getSupabaseClient();

  if (!supabase) {
    return getDemoShowcaseProperties().find((item) => item.id === id);
  }

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return getDemoShowcaseProperties().find((item) => item.id === id);
  }

  return {
    id: data.id,
    agencyId: data.agency_id ?? null,
    title: data.title,
    location: data.location,
    price: Number(data.price ?? 0),
    type: data.type,
    rooms: data.rooms,
    features: Array.isArray(data.features) ? data.features : [],
    status: data.status,
    description: data.description ?? "",
    ownerName: data.owner_name ?? "",
    ownerPhone: data.owner_phone ?? "",
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function createProperty(input: PropertyInput) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      id: crypto.randomUUID(),
      agencyId: input.agencyId ?? null,
      ...input,
    };
  }

  const { data, error } = await supabase
    .from("properties")
    .insert({
      id: crypto.randomUUID(),
      agency_id: input.agencyId ?? null,
      title: input.title,
      location: input.location,
      price: Number(input.price),
      type: input.type,
      rooms: input.rooms,
      features: input.features,
      status: input.status,
      description: input.description ?? "",
      owner_name: input.ownerName ?? "",
      owner_phone: input.ownerPhone ?? "",
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingOptionalPropertiesColumnError(error.message)) {
      const fallbackInsert = await supabase
        .from("properties")
        .insert({
          id: crypto.randomUUID(),
          agency_id: input.agencyId ?? null,
          title: input.title,
          location: input.location,
          price: Number(input.price),
          type: input.type,
          rooms: input.rooms,
          features: input.features,
          status: input.status,
        })
        .select("*")
        .single();

      if (fallbackInsert.error) {
        throw new Error(fallbackInsert.error.message);
      }

      return {
        id: fallbackInsert.data.id,
        agencyId: fallbackInsert.data.agency_id ?? null,
        title: fallbackInsert.data.title,
        location: fallbackInsert.data.location,
        price: Number(fallbackInsert.data.price ?? 0),
        type: fallbackInsert.data.type,
        rooms: fallbackInsert.data.rooms,
        features: Array.isArray(fallbackInsert.data.features)
          ? fallbackInsert.data.features
          : [],
        status: fallbackInsert.data.status,
        description: fallbackInsert.data.description ?? "",
        ownerName: fallbackInsert.data.owner_name ?? "",
        ownerPhone: fallbackInsert.data.owner_phone ?? "",
        createdAt: fallbackInsert.data.created_at,
        updatedAt: fallbackInsert.data.updated_at,
      };
    }

    throw new Error(error.message);
  }

  const result = {
    id: data.id,
    agencyId: data.agency_id ?? null,
    title: data.title,
    location: data.location,
    price: Number(data.price ?? 0),
    type: data.type,
    rooms: data.rooms,
    features: Array.isArray(data.features) ? data.features : [],
    status: data.status,
    description: data.description ?? "",
    ownerName: data.owner_name ?? "",
    ownerPhone: data.owner_phone ?? "",
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  // Fire-and-forget embedding indexing (neblokuje odpoveď)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  fetch(`${appUrl}/api/embeddings/index`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entityType: "property", entityId: result.id }),
  }).catch((err) => console.warn("[embeddings] Property indexing zlyhalo:", err));

  return result;
}

export async function updateProperty(id: string, input: Partial<PropertyInput>) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      id,
      agencyId: input.agencyId ?? null,
      title: input.title ?? "",
      location: input.location ?? "",
      price: Number(input.price ?? 0),
      type: input.type ?? "Byt",
      rooms: input.rooms ?? "2 izby",
      features: input.features ?? [],
      status: input.status ?? "Aktívna",
      description: input.description ?? "",
      ownerName: input.ownerName ?? "",
      ownerPhone: input.ownerPhone ?? "",
    };
  }

  const payload: any = {};

  if (typeof input.title !== "undefined") payload.title = input.title;
  if (typeof input.location !== "undefined") payload.location = input.location;
  if (typeof input.price !== "undefined") payload.price = Number(input.price);
  if (typeof input.type !== "undefined") payload.type = input.type;
  if (typeof input.rooms !== "undefined") payload.rooms = input.rooms;
  if (typeof input.features !== "undefined") payload.features = input.features;
  if (typeof input.status !== "undefined") payload.status = input.status;
  if (typeof input.description !== "undefined") payload.description = input.description;
  if (typeof input.ownerName !== "undefined") payload.owner_name = input.ownerName;
  if (typeof input.ownerPhone !== "undefined") payload.owner_phone = input.ownerPhone;

  const { data, error } = await supabase
    .from("properties")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (isMissingOptionalPropertiesColumnError(error.message)) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.description;
      delete fallbackPayload.owner_name;
      delete fallbackPayload.owner_phone;

      const fallbackUpdate = await supabase
        .from("properties")
        .update(fallbackPayload)
        .eq("id", id)
        .select("*")
        .single();

      if (fallbackUpdate.error) {
        throw new Error(fallbackUpdate.error.message);
      }

      return {
        id: fallbackUpdate.data.id,
        agencyId: fallbackUpdate.data.agency_id ?? null,
        title: fallbackUpdate.data.title,
        location: fallbackUpdate.data.location,
        price: Number(fallbackUpdate.data.price ?? 0),
        type: fallbackUpdate.data.type,
        rooms: fallbackUpdate.data.rooms,
        features: Array.isArray(fallbackUpdate.data.features)
          ? fallbackUpdate.data.features
          : [],
        status: fallbackUpdate.data.status,
        description: fallbackUpdate.data.description ?? "",
        ownerName: fallbackUpdate.data.owner_name ?? "",
        ownerPhone: fallbackUpdate.data.owner_phone ?? "",
        createdAt: fallbackUpdate.data.created_at,
        updatedAt: fallbackUpdate.data.updated_at,
      };
    }

    throw new Error(error.message);
  }

  return {
    id: data.id,
    agencyId: data.agency_id ?? null,
    title: data.title,
    location: data.location,
    price: Number(data.price ?? 0),
    type: data.type,
    rooms: data.rooms,
    features: Array.isArray(data.features) ? data.features : [],
    status: data.status,
    description: data.description ?? "",
    ownerName: data.owner_name ?? "",
    ownerPhone: data.owner_phone ?? "",
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function deleteProperty(id: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { ok: true };
  }

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}
