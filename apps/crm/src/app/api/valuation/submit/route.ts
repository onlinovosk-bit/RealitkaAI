import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { getValuationAgency } from "@/lib/valuation/agency-config";

type SubmitBody = {
  agencySlug?: string;
  propertyType?: string;
  location?: string;
  sqm?: string | number;
  sellTimeline?: string;
  name?: string;
  phone?: string;
  email?: string;
  privacyAck?: boolean;
  marketingOptIn?: boolean;
  hp?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { allowed } = await rateLimit(`valuation-submit:${ip}`, 8, 60_000);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "Príliš veľa pokusov. Skúste neskôr." }, { status: 429 });
    }

    const body = (await request.json()) as SubmitBody;

    if (body.hp) {
      return NextResponse.json({ ok: true });
    }

    const agencySlug = String(body.agencySlug ?? "").trim().toLowerCase();
    const agency = getValuationAgency(agencySlug);
    if (!agency) {
      return NextResponse.json({ ok: false, error: "Neplatná agentúra." }, { status: 404 });
    }

    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const location = String(body.location ?? "").trim();
    const propertyType = String(body.propertyType ?? "Byt").trim();
    const sqm = Number(body.sqm);
    const sellTimeline = String(body.sellTimeline ?? "").trim();

    if (!body.privacyAck) {
      return NextResponse.json(
        { ok: false, error: "Potvrdenie informácií o ochrane údajov je povinné." },
        { status: 400 },
      );
    }

    if (!name || name.length < 2) {
      return NextResponse.json({ ok: false, error: "Zadajte meno." }, { status: 400 });
    }

    if (!phone || phone.length < 6) {
      return NextResponse.json({ ok: false, error: "Zadajte telefón." }, { status: 400 });
    }

    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: "Zadajte platný e-mail." }, { status: 400 });
    }

    if (!location || location.length < 3) {
      return NextResponse.json({ ok: false, error: "Zadajte lokalitu." }, { status: 400 });
    }

    if (!Number.isFinite(sqm) || sqm < 1) {
      return NextResponse.json({ ok: false, error: "Zadajte výmeru." }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "Služba nie je dostupná." }, { status: 503 });
    }

    const note = [
      `valuation_widget`,
      `typ=${propertyType}`,
      `lokalita=${location}`,
      `vymera=${sqm}m2`,
      sellTimeline ? `predaj=${sellTimeline}` : "",
      body.marketingOptIn ? "marketing=ano" : "marketing=nie",
    ]
      .filter(Boolean)
      .join(" · ");

    const { error } = await supabase.from("leads").insert({
      id: crypto.randomUUID(),
      agency_id: agency.agencyId,
      name: name.slice(0, 200),
      email: email.slice(0, 254),
      phone: phone.slice(0, 50),
      location: location.slice(0, 200),
      budget: "",
      property_type: propertyType.slice(0, 50),
      rooms: "",
      financing: "",
      timeline: sellTimeline.slice(0, 100),
      source: "valuation_widget",
      status: "Nový",
      score: 60,
      assigned_agent: "Nepriradený",
      assigned_profile_id: null,
      last_contact: "Práve vytvorený",
      note: note.slice(0, 5000),
    });

    if (error) {
      console.error("[POST /api/valuation/submit]", error.message);
      return NextResponse.json({ ok: false, error: "Nepodarilo sa uložiť dopyt." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/valuation/submit]", error);
    return NextResponse.json({ ok: false, error: "Chyba servera." }, { status: 500 });
  }
}
