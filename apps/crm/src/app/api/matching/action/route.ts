import { NextResponse } from "next/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getLeadById, logMatchingActivity } from "@/lib/leads-store";
import { getProperty } from "@/lib/properties-store";
import { calculatePropertyMatch } from "@/lib/matching";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const leadId = body?.leadId as string | undefined;
    const propertyId = body?.propertyId as string | undefined;

    if (!leadId || !propertyId) {
      return NextResponse.json(
        { ok: false, error: "Chýba leadId alebo propertyId." },
        { status: 400 }
      );
    }

    const [property, lead] = await Promise.all([
      getProperty(propertyId),
      getLeadById(leadId),
    ]);

    if (!property) {
      return NextResponse.json(
        { ok: false, error: "Nehnuteľnosť sa nenašla." },
        { status: 404 }
      );
    }

    if (!lead) {
      return NextResponse.json(
        { ok: false, error: "Lead sa nenašiel." },
        { status: 404 }
      );
    }

    const { score, reasons } = calculatePropertyMatch(lead, property);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && anonKey) {
      const supabase = createAnonClient(url, anonKey);
      await supabase.from("lead_property_matches").upsert(
        {
          lead_id: leadId,
          property_id: propertyId,
          match_score: score,
          reasons,
          model_version: "v1",
        },
        { onConflict: "lead_id,property_id" }
      );
    }

    await logMatchingActivity(leadId, property.title, property.location);

    return NextResponse.json({ ok: true, score });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nepodarilo sa zapísať matching aktivitu.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
