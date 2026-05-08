export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";

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

    const block = await checkAiRateLimit(user.id, "import", 5);
    if (block) return NextResponse.json(block, { status: 429 });

    // Resolve agency_id once for all inserts
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", user.id)
      .maybeSingle();
    const agencyId: string | null = profile?.agency_id ?? null;

    const body = await request.json();
    const leads: LeadRow[] = Array.isArray(body.leads) ? body.leads : [];

    if (leads.length === 0) {
      return NextResponse.json({ ok: false, error: "Žiadne leady na import." }, { status: 400 });
    }

    // Separate rows with email (dedup check) from rows without
    const withEmail    = leads.filter((r) => String(r.email ?? "").trim());
    const withoutEmail = leads.filter((r) => !String(r.email ?? "").trim());

    let imported = 0;
    let updated  = 0;
    let errors   = 0;

    // ── Batch 1: look up all emails in a single query ────────────────────
    const emailList = withEmail
      .map((r) => String(r.email).trim().toLowerCase())
      .filter(Boolean);

    const existingMap = new Map<string, string>(); // email → lead.id
    if (emailList.length > 0) {
      const { data: existing } = await supabase
        .from("leads")
        .select("id, email")
        .in("email", emailList);
      for (const row of existing ?? []) {
        existingMap.set(row.email as string, row.id as string);
      }
    }

    // ── Batch 2: build insert / update lists ─────────────────────────────
    const toInsert: object[] = [];

    for (const row of [...withEmail, ...withoutEmail]) {
      const name  = String(row.name ?? "").trim();
      if (!name) { errors++; continue; }

      const email = String(row.email ?? "").trim().toLowerCase();
      const existingId = email ? existingMap.get(email) : undefined;

      if (existingId) {
        // update in-place — still one-by-one but only for dupes (rare path)
        const { error: upErr } = await supabase
          .from("leads")
          .update({
            name,
            phone:    row.phone    || undefined,
            location: row.location || undefined,
            budget:   row.budget   || undefined,
            source:   row.source   || undefined,
            note:     row.note     || undefined,
          })
          .eq("id", existingId);
        if (upErr) errors++; else updated++;
      } else {
        toInsert.push({
          id:             crypto.randomUUID(),
          agency_id:      agencyId,
          name,
          email:          email || "",
          phone:          row.phone        || "",
          location:       row.location     || "",
          budget:         row.budget       || "",
          source:         row.source       || "CSV Import",
          note:           row.note         || "",
          status:         "Nový",
          score:          50,
          assigned_agent: "Nepriradený",
          last_contact:   "Práve importovaný",
          property_type:  row.propertyType || "Byt",
          rooms:          row.rooms        || "",
          financing:      row.financing    || "",
          timeline:       row.timeline     || "",
        });
      }
    }

    // ── Batch 3: single bulk insert for all new leads ────────────────────
    if (toInsert.length > 0) {
      const CHUNK = 100;
      for (let i = 0; i < toInsert.length; i += CHUNK) {
        const { error: insErr } = await supabase
          .from("leads")
          .insert(toInsert.slice(i, i + CHUNK));
        if (insErr) {
          errors += Math.min(CHUNK, toInsert.length - i);
        } else {
          imported += Math.min(CHUNK, toInsert.length - i);
        }
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
