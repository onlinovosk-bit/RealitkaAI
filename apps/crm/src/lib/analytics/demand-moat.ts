import { listLeads } from "@/lib/leads-store";
import { listProperties } from "@/lib/properties-store";

type PointFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { search_weight: number };
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: PointFeature[];
};

export type DemandMoatPayload = {
  demandData: FeatureCollection;
  supplyData: FeatureCollection;
  detectedGap: string | null;
};

function hashLocation(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(31, h) + seed.charCodeAt(i);
  return Math.abs(h);
}

function pseudoCoordsFromLocation(location: string): [number, number] {
  // Base around Presov; deterministic jitter by location string.
  const hash = hashLocation(location || "presov");
  const lat = 48.99 + ((hash % 100) - 50) * 0.0018;
  const lng = 21.24 + (((hash >> 3) % 100) - 50) * 0.0021;
  return [lng, lat];
}

export async function buildDemandMoatPayload(): Promise<DemandMoatPayload> {
  const [leads, properties] = await Promise.all([listLeads(), listProperties()]);

  const demandFeatures: PointFeature[] = leads.map((lead) => {
    const coords = pseudoCoordsFromLocation(lead.location ?? "");
    const weight = Math.max(1, Math.min(6, (lead.score ?? 0) / 20 + 1));
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: coords },
      properties: { search_weight: weight },
    };
  });

  const supplyFeatures: PointFeature[] = properties.map((property) => {
    const coords = pseudoCoordsFromLocation(property.location ?? "");
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: coords },
      properties: { search_weight: 1 },
    };
  });

  const demandByLocation = new Map<string, number>();
  const supplyByLocation = new Map<string, number>();

  for (const lead of leads) {
    const key = (lead.location ?? "Neznáma lokalita").trim() || "Neznáma lokalita";
    demandByLocation.set(key, (demandByLocation.get(key) ?? 0) + 1);
  }
  for (const property of properties) {
    const key = (property.location ?? "Neznáma lokalita").trim() || "Neznáma lokalita";
    supplyByLocation.set(key, (supplyByLocation.get(key) ?? 0) + 1);
  }

  let detectedGap: string | null = null;
  let topDelta = 0;
  for (const [loc, demand] of demandByLocation) {
    const supply = supplyByLocation.get(loc) ?? 0;
    const delta = demand - supply;
    if (delta > topDelta && demand >= 3) {
      topDelta = delta;
      detectedGap = `${loc} (dopyt ${demand} vs ponuka ${supply})`;
    }
  }

  return {
    demandData: { type: "FeatureCollection", features: demandFeatures },
    supplyData: { type: "FeatureCollection", features: supplyFeatures },
    detectedGap,
  };
}
