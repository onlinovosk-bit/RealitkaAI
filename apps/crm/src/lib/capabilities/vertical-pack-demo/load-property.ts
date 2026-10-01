import type { SupabaseClient } from "@supabase/supabase-js";
import { REALVIA_SMOLKO_13303557 } from "@/lib/capabilities/_shared/fixtures/realvia-smolko-13303557";
import type { RealviaPropertyRow } from "@/lib/capabilities/_shared/realvia-property-row";

const PROPERTY_SELECT =
  "id, source_id, source_system, title, description, price, currency, location, type, rooms, transaction_type, usable_area, land_area, building_area, rooms_count, floor, broker_name, broker_email, broker_phone, images, payload_raw, latitude, longitude";

function mapDbRow(row: Record<string, unknown>): RealviaPropertyRow {
  return {
    id: String(row.id ?? ""),
    source_id: String(row.source_id ?? row.id ?? ""),
    source_system: String(row.source_system ?? "realvia"),
    title: String(row.title ?? ""),
    description: row.description != null ? String(row.description) : null,
    price: typeof row.price === "number" ? row.price : row.price != null ? Number(row.price) : null,
    currency: row.currency != null ? String(row.currency) : "EUR",
    location: row.location != null ? String(row.location) : null,
    type: row.type != null ? String(row.type) : null,
    rooms: row.rooms != null ? String(row.rooms) : null,
    transaction_type: row.transaction_type != null ? String(row.transaction_type) : null,
    usable_area: row.usable_area != null ? Number(row.usable_area) : null,
    land_area: row.land_area != null ? Number(row.land_area) : null,
    building_area: row.building_area != null ? Number(row.building_area) : null,
    rooms_count: row.rooms_count != null ? Number(row.rooms_count) : null,
    floor: row.floor != null ? Number(row.floor) : null,
    broker_name: row.broker_name != null ? String(row.broker_name) : null,
    broker_email: row.broker_email != null ? String(row.broker_email) : null,
    broker_phone: row.broker_phone != null ? String(row.broker_phone) : null,
    images: row.images,
    payload_raw: row.payload_raw,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
  };
}

export type LoadedProperty = {
  property: RealviaPropertyRow;
  fromFixture: boolean;
};

/** Load Realvia property by source_id; falls back to Smolko fixture for demo route. */
export async function loadRealviaPropertyForDemo(
  supabase: SupabaseClient,
  sourceId: string,
): Promise<LoadedProperty> {
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("source_id", sourceId)
    .eq("source_system", "realvia")
    .maybeSingle();

  if (!error && data) {
    return { property: mapDbRow(data as Record<string, unknown>), fromFixture: false };
  }

  if (sourceId === REALVIA_SMOLKO_13303557.source_id) {
    return { property: REALVIA_SMOLKO_13303557, fromFixture: true };
  }

  return { property: { ...REALVIA_SMOLKO_13303557, source_id: sourceId, id: sourceId }, fromFixture: true };
}
