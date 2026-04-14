import { listLeads } from "@/lib/leads-store";
import { listProperties } from "@/lib/properties-store";

export type MarketHotspotKind = "lead" | "property";

export type MarketHotspot = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  kind: MarketHotspotKind;
  /** Voliteľný popis (napr. významová zóna na mape). */
  label?: string;
};

function hashToPosition(seed: string): { x: number; y: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i);
  }
  const x = 8 + (Math.abs(h) % 84);
  const y = 8 + (Math.abs(h >> 9) % 84);
  return { x, y };
}

/**
 * Agreguje leady a nehnuteľnosti podľa lokality a vráti „horúce zóny“ v % súradniciach (0–100).
 */
export async function buildMarketHotspots(): Promise<MarketHotspot[]> {
  const [leads, properties] = await Promise.all([listLeads(), listProperties()]);

  const leadBuckets = new Map<string, number>();
  for (const lead of leads) {
    const key = lead.location.trim() || "Neznáma";
    leadBuckets.set(key, (leadBuckets.get(key) ?? 0) + 1);
  }

  const propertyBuckets = new Map<string, number>();
  for (const property of properties) {
    const key = property.location.trim() || "Neznáma";
    propertyBuckets.set(key, (propertyBuckets.get(key) ?? 0) + 1);
  }

  const spots: MarketHotspot[] = [];

  for (const [loc, count] of leadBuckets) {
    const { x, y } = hashToPosition(`lead:${loc}`);
    spots.push({
      x,
      y,
      radius: Math.min(32, 10 + count * 5),
      opacity: Math.min(0.55, 0.14 + count * 0.07),
      kind: "lead",
    });
  }

  for (const [loc, count] of propertyBuckets) {
    const { x, y } = hashToPosition(`prop:${loc}`);
    spots.push({
      x: ((x + 11) % 82) + 9,
      y: ((y + 13) % 82) + 9,
      radius: Math.min(26, 8 + count * 4),
      opacity: Math.min(0.42, 0.12 + count * 0.05),
      kind: "property",
    });
  }

  spots.push({
    x: 26,
    y: 58,
    radius: 46,
    opacity: 0.48,
    kind: "property",
    label: "Poprad – Západ",
  });

  return spots;
}
