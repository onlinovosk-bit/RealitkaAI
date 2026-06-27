import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type Body = {
  name: string;
  email?: string;
  phone?: string;
  hp?: string; // honeypot
  consent?: string | boolean;
  source?: string;
  listing?: string;
  token?: string;
};

export async function POST(request: Request) {
  try {
    const body: Body = await request.json();

    const token = (body.token as string) || request.headers.get("x-lead-form-token") || "";

    // simple token check: single env var for Smolko (extendable)
    const expected = process.env.LEAD_FORM_TOKEN_SMOLKO || "";
    const agencyId = process.env.LEAD_FORM_AGENCY_SMOLKO || "";

    if (!token || token !== expected || !agencyId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // honeypot: silently accept but drop
    if (body.hp && body.hp.length > 0) {
      return NextResponse.json({ ok: true });
    }

    // consent required
    if (!(body.consent === true || body.consent === "true")) {
      return NextResponse.json({ ok: false, error: "Missing consent" }, { status: 400 });
    }

    const admin = createAdminClient();

    const payload = {
      id: crypto.randomUUID(),
      agency_id: agencyId,
      name: body.name,
      email: body.email ?? null,
      phone: body.phone ?? null,
      source: body.source ?? "web_form",
      status: "Nový",
      score: 50,
      last_contact: "Práve vložené",
    } as any;

    const { data, error } = await admin.from("leads").insert(payload).select("*").single();

    if (error) {
      console.error("[leads.inbound] insert error=", JSON.stringify(error));
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, lead: data });
  } catch (err) {
    console.error("[leads.inbound] error=", err);
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}
