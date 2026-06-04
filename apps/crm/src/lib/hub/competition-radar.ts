import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CompetitionSector } from "@/types/intelligence-hub";

export type CompetitionRadarPayload = {
  source: "portal_listings";
  totalListings: number;
  sectors: CompetitionSector[];
  diagnosis: string;
};

function zoneKey(city: string | null, district: string | null): string {
  const d = (district ?? "").trim();
  const c = (city ?? "").trim();
  if (d.length > 0) return d;
  if (c.length > 0) return c;
  return "Neznáma zóna";
}

/**
 * Read-only radar z cache portálových inzerátov (portal_listings).
 * Bez dát vráti prázdny stav — žiadne demo sektory.
 */
export async function buildCompetitionRadar(): Promise<CompetitionRadarPayload> {
  const profile = await getCurrentProfile();
  if (!profile?.id) {
    return {
      source: "portal_listings",
      totalListings: 0,
      sectors: [],
      diagnosis: "Prihláste sa pre načítanie radarových dát.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portal_listings")
    .select("city, district, source, last_seen_at")
    .eq("is_active", true)
    .order("last_seen_at", { ascending: false })
    .limit(2000);

  if (error) {
    return {
      source: "portal_listings",
      totalListings: 0,
      sectors: [],
      diagnosis: `Zdroj portal_listings: chyba čítania (${error.message}).`,
    };
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return {
      source: "portal_listings",
      totalListings: 0,
      sectors: [],
      diagnosis:
        "Zdroj portal_listings je prázdny. Po arbitrážnom / portálovom skene sa tu zobrazí hustota inzerátov podľa lokality.",
    };
  }

  const buckets = new Map<string, number>();
  for (const row of rows) {
    const key = zoneKey(row.city as string | null, row.district as string | null);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const maxCount = Math.max(...buckets.values(), 1);
  const sectors: CompetitionSector[] = [...buckets.entries()]
    .map(([name, competitorCount]) => ({
      name,
      district: name,
      competitorCount,
      heatScore: Math.round((competitorCount / maxCount) * 100),
      isDemo: false,
      trend: "stable" as const,
    }))
    .sort((a, b) => b.competitorCount - a.competitorCount)
    .slice(0, 12);

  return {
    source: "portal_listings",
    totalListings: rows.length,
    sectors,
    diagnosis: `Načítaných ${rows.length} aktívnych záznamov z portal_listings (${sectors.length} zón).`,
  };
}
