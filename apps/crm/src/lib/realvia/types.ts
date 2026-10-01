// ================================================================
// Revolis.AI — Realvia Export Types (L99 Production)
// Complete TypeScript types for Realvia push export API v2
// Source: https://www.realitysmolko.sk/doc/export/index.php
// ================================================================

/** Geo coordinates from Realvia */
export interface RealviaGeoPoint {
  readonly lat: number;
  readonly lon: number;
}

/** Location hierarchy from Realvia */
export interface RealviaLocation {
  readonly state_id: number;
  readonly county_id: number;
  readonly district_id: number;
  readonly region_id: number;
  readonly citypart_id: number;
  readonly street_id: number;
}

/** Image reference from Realvia (URL-based, never binary) */
export interface RealviaImage {
  readonly url: string;
  readonly tags?: readonly string[];
}

/** Extra fields for specific property categories */
export interface RealviaAdvertExtra {
  readonly balcony_area?: number;
  readonly loggia_area?: number;
  readonly terrace_area?: number;
  readonly cellar_area?: number;
  readonly garage_area?: number;
  readonly garden_area?: number;
  readonly parking_count?: number;
  readonly bathroom_count?: number;
  readonly wc_count?: number;
  readonly [key: string]: unknown;
}

/** Broker/agent information */
export interface RealviaBroker {
  readonly source_id: number;
  readonly first_name: string;
  readonly last_name: string;
  readonly degree_before?: string | null;
  readonly degree_after?: string | null;
  readonly deleted?: boolean;
  readonly phone?: string;
  readonly email?: string;
}

/** Office/branch information (optional, some RKs don't use it) */
export interface RealviaOffice {
  readonly source_id?: number;
  readonly name?: string;
  readonly city?: string;
  readonly street?: string;
  readonly zip?: string;
  readonly phone?: string;
  readonly email?: string;
}

/** Full advert (property listing) payload from Realvia */
export interface RealviaAdvert {
  readonly source_id: number;
  readonly category: number;
  readonly geo_point?: RealviaGeoPoint;
  readonly transaction: number;
  readonly title: string;
  readonly description?: string;
  readonly real_estate_state?: number;
  readonly units?: number;
  readonly price_by_agreement?: number;
  readonly price: number;
  readonly currency?: number;
  readonly power_costs?: number;
  readonly usable_area?: number;
  readonly building_area?: number;
  readonly land_area?: number;
  readonly availability?: number;
  readonly building_energy_rating_certificate?: number;
  readonly number_of_overhead_floors?: number;
  readonly floor?: number;
  readonly rooms_count?: number;
  readonly ownership?: number;
  readonly building_type?: readonly number[];
  readonly estate_equipment?: readonly number[];
  readonly heating_system?: readonly number[];
  readonly utility_lines?: readonly number[];
  readonly communication_and_data_line?: readonly number[];
  readonly location?: RealviaLocation;
  readonly street?: string;
  readonly show_street?: number;
  readonly images?: readonly RealviaImage[];
  readonly extra?: RealviaAdvertExtra;
}

/** Complete webhook payload for create/update */
export interface RealviaWebhookPayload {
  readonly office?: RealviaOffice | readonly RealviaOffice[];
  readonly broker: RealviaBroker;
  readonly advert: RealviaAdvert;
}

/** Delete/cancellation payload (Realvia export v2) */
export interface RealviaDeletePayload {
  /** Realvia PROD sends numeric strings (e.g. "13303557"), not JSON numbers. */
  readonly source_id: number | string;
  readonly action: 'delete';
  readonly archiveType?: 'sold' | 'rent' | 'cancel';
}

function isRealviaSourceId(value: unknown): value is number | string {
  if (typeof value === 'number' && Number.isFinite(value)) return true;
  if (typeof value === 'string' && value.trim().length > 0) return true;
  return false;
}

/** Normalize Realvia source_id to a non-empty string for DB lookups. */
export function normalizeRealviaSourceId(sourceId: number | string): string {
  return String(sourceId).trim();
}

/** Type guard: is this a delete payload? */
export function isDeletePayload(
  payload: unknown,
): payload is RealviaDeletePayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return isRealviaSourceId(p.source_id) && p.action === 'delete';
}

/** Type guard: is this a standard advert payload? */
export function isAdvertPayload(
  payload: unknown,
): payload is RealviaWebhookPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.advert === 'object' &&
    p.advert !== null &&
    typeof p.broker === 'object' &&
    p.broker !== null
  );
}

/** Webhook processing result */
export interface RealviaProcessingResult {
  readonly success: boolean;
  readonly action: 'created' | 'updated' | 'deleted' | 'skipped';
  readonly propertyId?: string;
  readonly sourceId?: string | number;
  readonly error?: string;
  readonly priceChanged?: boolean;
}

/** Property status values */
export const PROPERTY_STATUS = {
  ACTIVE: 'Aktívna',
  SOLD: 'Predaná',
  RENTED: 'Prenajatá',
  REMOVED: 'Stiahnutá',
  RESERVED: 'Rezervovaná',
} as const;

export type PropertyStatus = typeof PROPERTY_STATUS[keyof typeof PROPERTY_STATUS];

/** Webhook log entry (maps to realvia_webhook_logs table) */
export interface RealviaWebhookLogEntry {
  readonly request_id: string;
  readonly source_ip: string;
  readonly headers_json: Record<string, string>;
  readonly payload_json: unknown;
  readonly payload_type: 'advert' | 'delete' | 'unknown';
  readonly agency_id?: string;
}

/** Processing queue entry (maps to realvia_processing_queue table) */
export interface RealviaQueueEntry {
  readonly id: string;
  readonly webhook_log_id: string;
  readonly status: 'pending' | 'processing' | 'completed' | 'failed';
  readonly retry_count: number;
  readonly max_retries: number;
  readonly next_retry_at?: string;
  readonly created_at: string;
  readonly processed_at?: string;
  readonly error_message?: string;
}
