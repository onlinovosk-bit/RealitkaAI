import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { UcAgentMapped } from "@/lib/uc/mapper-agent";
import type { UcListingMapped } from "@/lib/uc/mapper-listing";
import type { UcAction } from "@/lib/uc/payload";

const UC_SOURCE = "uc";
const IMPORT_SOURCE_SYSTEM = "uc";

function syntheticAgentEmail(agencyId: string, externalId: string): string {
  const safeId = externalId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return `uc+${safeId}@${agencyId.slice(0, 8)}.import.revolis.internal`;
}

function propertyIdForUc(objectId: string): string {
  return `uc:${objectId}`;
}

export type UcPersistResult =
  | { ok: true; created: boolean; entityId: string; resultCode: 1 | 2 | 3 | 4 }
  | { ok: false; error: string };

export async function persistUcAgent(
  agencyId: string,
  mapped: UcAgentMapped,
): Promise<UcPersistResult> {
  const sb = createServiceRoleClient();
  if (!sb) return { ok: false, error: "DB client unavailable" };

  const { data: existing } = await sb
    .from("profiles")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("import_source_system", IMPORT_SOURCE_SYSTEM)
    .eq("import_source_id", mapped.externalId)
    .maybeSingle();

  const email =
    mapped.email.trim().toLowerCase() ||
    syntheticAgentEmail(agencyId, mapped.externalId);

  const patch = {
    agency_id: agencyId,
    full_name: mapped.fullName,
    phone: mapped.phone,
    email,
    role: "agent",
    is_active: !mapped.deleted,
    import_source_system: IMPORT_SOURCE_SYSTEM,
    import_source_id: mapped.externalId,
    import_image_url: mapped.image.url,
    import_image_changed: mapped.image.changed,
    import_meta: {
      sora: mapped.sora,
      nark: mapped.nark,
      phone_status: mapped.phoneStatus,
      raw: mapped.raw,
    },
  };

  if (existing?.id) {
    const { error } = await sb.from("profiles").update(patch).eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, created: false, entityId: existing.id, resultCode: 2 };
  }

  const { data: inserted, error } = await sb
    .from("profiles")
    .insert(patch)
    .select("id")
    .single();

  if (error?.code === "23505" && mapped.email.trim()) {
    const { data: retryInsert, error: retryErr } = await sb
      .from("profiles")
      .insert({ ...patch, email: syntheticAgentEmail(agencyId, mapped.externalId) })
      .select("id")
      .single();
    if (retryErr) return { ok: false, error: retryErr.message };
    return { ok: true, created: true, entityId: retryInsert.id, resultCode: 1 };
  }

  if (error) return { ok: false, error: error.message };
  return { ok: true, created: true, entityId: inserted.id, resultCode: 1 };
}

export async function softDeleteUcAgent(
  agencyId: string,
  externalId: string,
): Promise<UcPersistResult> {
  const sb = createServiceRoleClient();
  if (!sb) return { ok: false, error: "DB client unavailable" };

  const { data: existing } = await sb
    .from("profiles")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("import_source_system", IMPORT_SOURCE_SYSTEM)
    .eq("import_source_id", externalId)
    .maybeSingle();

  if (!existing?.id) {
    return { ok: true, created: false, entityId: "", resultCode: 4 };
  }

  const { error } = await sb
    .from("profiles")
    .update({ is_active: false })
    .eq("id", existing.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, created: false, entityId: existing.id, resultCode: 3 };
}

export async function persistUcListing(
  agencyId: string,
  mapped: UcListingMapped,
): Promise<UcPersistResult> {
  const sb = createServiceRoleClient();
  if (!sb) return { ok: false, error: "DB client unavailable" };

  const propertyId = propertyIdForUc(mapped.externalId);

  const { data: existing } = await sb
    .from("properties")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("source_system", UC_SOURCE)
    .eq("source_id", mapped.externalId)
    .maybeSingle();

  const payloadRaw = {
    taxonomy: mapped.taxonomy,
    flags: mapped.flags,
    langData: mapped.langData,
    medias: mapped.medias,
    raw: mapped.raw,
    agency_listing_id: mapped.agencyListingId,
  };

  const patch = {
    id: propertyId,
    agency_id: agencyId,
    title: mapped.title,
    description: mapped.description,
    location: mapped.location,
    price: mapped.price,
    type: mapped.type,
    rooms: mapped.rooms,
    status: mapped.deleted ? "Vymazaná" : "Aktivna",
    features: Object.entries(mapped.flags)
      .filter(([, value]) => value)
      .map(([key]) => key),
    source_id: mapped.externalId,
    source_system: UC_SOURCE,
    broker_source_id: mapped.brokerSourceId,
    broker_name: mapped.brokerName ?? "",
    broker_email: mapped.brokerEmail ?? "",
    broker_phone: mapped.brokerPhone ?? "",
    currency: mapped.currency,
    usable_area: mapped.usableArea,
    land_area: mapped.plotArea,
    building_area: mapped.buildingArea,
    latitude: mapped.latitude,
    longitude: mapped.longitude,
    rooms_count: mapped.roomsCount,
    floor: mapped.floor,
    transaction_type: mapped.transactionType,
    images: mapped.images,
    payload_raw: payloadRaw,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await sb.from("properties").update(patch).eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, created: false, entityId: existing.id, resultCode: 2 };
  }

  const { data: inserted, error } = await sb
    .from("properties")
    .insert({
      ...patch,
      owner_name: "",
      owner_phone: "",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, created: true, entityId: inserted.id, resultCode: 1 };
}

export async function softDeleteUcListing(
  agencyId: string,
  externalId: string,
): Promise<UcPersistResult> {
  const sb = createServiceRoleClient();
  if (!sb) return { ok: false, error: "DB client unavailable" };

  const { data: existing } = await sb
    .from("properties")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("source_system", UC_SOURCE)
    .eq("source_id", externalId)
    .maybeSingle();

  if (!existing?.id) {
    return { ok: true, created: false, entityId: "", resultCode: 4 };
  }

  const { error } = await sb
    .from("properties")
    .update({ status: "Vymazaná", updated_at: new Date().toISOString() })
    .eq("id", existing.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, created: false, entityId: existing.id, resultCode: 3 };
}

export async function storeUcImportLog(input: {
  agencyId: string;
  action: UcAction;
  externalId: string | null;
  rawPayload: unknown;
  unmapped: Record<string, unknown> | null;
  resultCode: number;
  entityId?: string | null;
}) {
  const sb = createServiceRoleClient();
  if (!sb) return { ok: false as const, error: "DB client unavailable" };

  const payload = {
    agency_id: input.agencyId,
    action: input.action,
    external_id: input.externalId,
    raw_payload: input.rawPayload,
    unmapped: {
      ...(input.unmapped ?? {}),
      result_code: input.resultCode,
      entity_id: input.entityId ?? null,
    },
    result_code: input.resultCode,
  };

  const { data, error } = await sb
    .from("realsoft_import_logs")
    .upsert(payload, {
      onConflict: "agency_id,action,external_id",
      ignoreDuplicates: false,
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, id: data?.id ?? "" };
}
