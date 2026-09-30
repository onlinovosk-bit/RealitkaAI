import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sameAgency } from "@/lib/tenant-scope";
import { hasMinimalDemand } from "@/lib/demand/match";
import type { Demand } from "@/lib/demand/contract";

/**
 * DEMAND-D4 read path for the lead page: the current verified demand and the
 * matches computed from exactly that record. Reads with the user's client, so
 * RLS on lead_demands / demand_property_matches is the tenant boundary; the
 * sameAgency check only gives a clean 403 instead of an empty body.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { data: callerProfile } = await supabase
      .from("profiles").select("agency_id").eq("auth_user_id", user.id).maybeSingle();
    const { data: lead } = await supabase
      .from("leads").select("agency_id").eq("id", id).maybeSingle();
    if (!sameAgency(callerProfile?.agency_id, lead?.agency_id)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { data: record } = await supabase
      .from("lead_demands")
      .select("id, status, demand, known_fields, core_complete, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!record) {
      return NextResponse.json({ ok: true, demand: null, matches: [], reason: "no_demand" });
    }
    if (record.status !== "ok" || !hasMinimalDemand(record.demand as Demand)) {
      return NextResponse.json({
        ok: true, demand: record, matches: [],
        reason: record.status !== "ok" ? `extraction_${record.status}` : "insufficient_demand",
      });
    }

    const { data: matches, error } = await supabase
      .from("demand_property_matches")
      .select("property_id, score, fields, properties(title, location, price)")
      .eq("demand_record_id", record.id)
      .order("score", { ascending: false });
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, demand: record, matches: matches ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepodarilo sa načítať zhody.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
