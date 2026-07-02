import type { RealviaPropertyRow } from "@/lib/capabilities/_shared/realvia-property-row";

/**
 * Real Smolko property from PROD (source_id=13303557, source_system=realvia).
 * Subset of fields — no mock IDs.
 */
export const REALVIA_SMOLKO_13303557: RealviaPropertyRow = {
  id: "13303557",
  source_id: "13303557",
  source_system: "realvia",
  title: "Predaj novostavby RD v obci Modrá nad Cirochou, okr. Humenné.",
  description:
    "Reality Smolko ponúka na predaj murovanú novostavbu rodinného domu v obci Modrá nad Cirochou.",
  price: 0,
  currency: "EUR",
  location: "Školská, Modrá nad Cirochou",
  type: "Dom",
  rooms: "",
  transaction_type: "Predaj",
  usable_area: 76,
  land_area: 4500,
  building_area: 167,
  rooms_count: null,
  floor: null,
  broker_name: "Reality Smolko",
  broker_email: "info@realitysmolko.sk",
  broker_phone: "+421900000000",
  images: [
    { url: "https://www.realitysmolko.sk/imgcache/-697e302da182f2c0370311c3.jpg", changed: false },
  ],
  payload_raw: { action: "create", advert: { source_id: "13303557" } },
};
