// ================================================================
// Revolis.AI — Stealth Recruiter Prešov ingest (external cron)
// Schedule: every 6 hours via cron-job.org / Upstash (not vercel.json Hobby)
//
// Trigger: GET https://app.revolis.ai/api/cron/stealth-recruiter-ingest
// Auth: Authorization: Bearer $CRON_SECRET
// Query: region=Prešov&agency_id=...&agency_slug=reality-smolko
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ingestPresovProspects } from "@/lib/stealth-recruiter/ingest-presov";
import { resolveStealthAgencyId } from "@/lib/stealth-recruiter/resolve-agency";
import { normalizeRegion } from "@/lib/stealth-recruiter/scan-filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const region =
    normalizeRegion(request.nextUrl.searchParams.get("region")) ?? "Prešov";
  const agencyIdParam = request.nextUrl.searchParams.get("agency_id");
  const agencySlugParam = request.nextUrl.searchParams.get("agency_slug");

  try {
    const supabase = createAdminClient();
    const resolved = await resolveStealthAgencyId(supabase, {
      agencyId: agencyIdParam,
      agencySlug: agencySlugParam,
    });

    if (!resolved) {
      return NextResponse.json(
        { ok: false, error: "agency_not_found", agency_id: agencyIdParam },
        { status: 400 },
      );
    }

    const ingest = await ingestPresovProspects(resolved.agencyId, region);
    const errors: string[] = [...ingest.errors];

    if (ingest.prospects.length === 0) {
      return NextResponse.json({
        ok: true,
        region: ingest.region,
        source: ingest.source,
        agency_id: resolved.agencyId,
        resolved_via: resolved.resolvedVia,
        warning: resolved.warning,
        inserted: 0,
        updated: 0,
        upserted: 0,
        scanned_at: ingest.scanned_at,
        errors,
        message: "No listings matched ingest filters.",
      });
    }

    const addresses = ingest.prospects.map((p) => p.address);
    const { data: existingRows, error: existingError } = await supabase
      .from("stealth_recruiter_prospects")
      .select("address")
      .eq("agency_id", resolved.agencyId)
      .in("address", addresses);

    if (existingError) {
      errors.push(existingError.message);
    }

    const existingSet = new Set((existingRows ?? []).map((r) => r.address));
    let inserted = 0;
    let updated = 0;
    for (const row of ingest.prospects) {
      if (existingSet.has(row.address)) updated += 1;
      else inserted += 1;
    }

    const { error: upsertError } = await supabase
      .from("stealth_recruiter_prospects")
      .upsert(ingest.prospects, { onConflict: "agency_id,address" });

    if (upsertError) {
      errors.push(upsertError.message);
      return NextResponse.json(
        {
          ok: false,
          error: upsertError.message,
          agency_id: resolved.agencyId,
          inserted: 0,
          updated: 0,
          errors,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      region: ingest.region,
      source: ingest.source,
      agency_id: resolved.agencyId,
      resolved_via: resolved.resolvedVia,
      warning: resolved.warning,
      inserted,
      updated,
      upserted: ingest.prospects.length,
      scanned_at: ingest.scanned_at,
      errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
