import { createHash } from "node:crypto";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { scoreAgency } from "@/lib/scoring/agency-score";
import type { ScrapedAgencyInput } from "@/lib/scraper/types";

export function buildExternalKey(agency: ScrapedAgencyInput): string {
  const src = (agency.source || "unknown").toLowerCase();
  const raw = `${src}|${agency.name.trim().toLowerCase()}|${(agency.city ?? "").trim().toLowerCase()}`;
  return createHash("sha256").update(raw).digest("hex");
}

export type UpsertResult = { inserted: number; errors: string[] };

export async function upsertScrapedAgencies(agencies: ScrapedAgencyInput[]): Promise<UpsertResult> {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return {
      inserted: 0,
      errors: ["SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing — cannot persist scraped rows."],
    };
  }

  const errors: string[] = [];
  let inserted = 0;

  for (const a of agencies) {
    const score = scoreAgency(a);
    const externalKey = buildExternalKey(a);
    const row = {
      external_key: externalKey,
      name: a.name,
      city: a.city || "",
      listings_count: a.listings,
      score,
      source: a.source || "nehnutelnosti.sk",
      source_url: a.sourceUrl || null,
      raw_meta: { listings: a.listings },
      scraped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin.from("scraped_agencies").upsert(row, {
      onConflict: "external_key",
    });

    if (error) {
      errors.push(`${a.name}: ${error.message}`);
    } else {
      inserted += 1;
    }
  }

  return { inserted, errors };
}

export type ScrapedAgencyDto = {
  id: string;
  name: string;
  city: string | null;
  listingsCount: number;
  score: number;
  source: string;
  scrapedAt: string;
};

export async function listScrapedAgencies(limit = 50): Promise<ScrapedAgencyDto[]> {
  const admin = createSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("scraped_agencies")
    .select("id,name,city,listings_count,score,source,scraped_at")
    .order("score", { ascending: false })
    .order("scraped_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    city: (r.city as string) || null,
    listingsCount: Number(r.listings_count),
    score: Number(r.score),
    source: String(r.source),
    scrapedAt: String(r.scraped_at),
  }));
}
