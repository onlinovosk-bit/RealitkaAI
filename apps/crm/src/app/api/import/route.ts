export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LeadRow = {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  budget?: string;
  source?: string;
  note?: string;
  propertyType?: string;
  rooms?: string;
  financing?: string;
  timeline?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const leads: LeadRow[] = Array.isArray(body.leads) ? body.leads : [];

    if (leads.length === 0) {
      return NextResponse.json({ ok: false, error: "Žiadne leady na import." }, { status: 400 });
    }
    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (const row of leads) {
      const name = String(row.name ?? "").trim();
      if (!name) { errors++; continue; }

      const email = String(row.email ?? "").trim().toLowerCase();

      try {
        if (email) {
          // Check if lead with this email already exists
          const { data: existing } = await supabase
            .from("leads")
            .select("id")
            .eq("email", email)
            .maybeSingle();

          if (existing?.id) {
            await supabase.from("leads").update({
              name,
              phone: row.phone || undefined,
              location: row.location || undefined,
              budget: row.budget || undefined,
              source: row.source || undefined,
              note: row.note || undefined,
            }).eq("id", existing.id);
            updated++;
            continue;
          }
        }

        await supabase.from("leads").insert({
          id: crypto.randomUUID(),
          name,
          email: email || "",
          phone: row.phone || "",
          location: row.location || "",
          budget: row.budget || "",
          source: row.source || "CSV Import",
          note: row.note || "",
          status: "Nový",
          score: 50,
          assigned_agent: "Nepriradený",
          last_contact: "Práve importovaný",
          property_type: row.propertyType || "Byt",
          rooms: row.rooms || "",
          financing: row.financing || "",
          timeline: row.timeline || "",
        });
        imported++;
      } catch {
        errors++;
      }
    }

    return NextResponse.json({ ok: true, imported, updated, errors });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Import zlyhal." },
      { status: 500 }
    );
  }
}
