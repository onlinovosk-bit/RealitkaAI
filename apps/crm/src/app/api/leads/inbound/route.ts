import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { resolveInboundAgency } from "@/lib/leads/inbound-form-config";

type ParsedInbound = {
  slug: string;
  token: string;
  name: string;
  email: string;
  phone: string;
  note: string;
  listingRef: string;
  consent: boolean;
  honeypot: string;
};

async function parseInboundRequest(request: Request): Promise<ParsedInbound> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return {
      slug: String(body.slug ?? "").trim(),
      token: String(body.token ?? "").trim(),
      name: String(body.name ?? "").trim(),
      email: String(body.email ?? "").trim(),
      phone: String(body.phone ?? "").trim(),
      note: String(body.note ?? "").trim(),
      listingRef: String(body.listing ?? body.listingRef ?? "").trim(),
      consent: body.consent === true || body.consent === "true" || body.consent === "on",
      honeypot: String(body.hp ?? "").trim(),
    };
  }

  const form = await request.formData();
  const consentRaw = form.get("consent");
  return {
    slug: String(form.get("slug") ?? "").trim(),
    token: String(form.get("token") ?? "").trim(),
    name: String(form.get("name") ?? "").trim(),
    email: String(form.get("email") ?? "").trim(),
    phone: String(form.get("phone") ?? "").trim(),
    note: String(form.get("note") ?? "").trim(),
    listingRef: String(form.get("listing") ?? form.get("listingRef") ?? "").trim(),
    consent: consentRaw === "true" || consentRaw === "on" || consentRaw === "1",
    honeypot: String(form.get("hp") ?? "").trim(),
  };
}

function wantsHtml(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  return accept.includes("text/html") || contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded");
}

function htmlResponse(body: string, status: number) {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  const html = wantsHtml(request);

  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { allowed } = await rateLimit(`lead-inbound:${ip}`, 10, 60_000);
    if (!allowed) {
      if (html) return htmlResponse("<p>Príliš veľa pokusov. Skúste neskôr.</p>", 429);
      return NextResponse.json({ ok: false, error: "Príliš veľa pokusov." }, { status: 429 });
    }

    const input = await parseInboundRequest(request);

    if (input.honeypot) {
      if (html) return htmlResponse("<p>Ďakujeme.</p>", 200);
      return NextResponse.json({ ok: true });
    }

    if (!input.consent) {
      if (html) return htmlResponse("<p>Súhlas so spracovaním údajov je povinný.</p>", 400);
      return NextResponse.json({ ok: false, error: "Súhlas so spracovaním údajov je povinný." }, { status: 400 });
    }

    if (!input.name) {
      if (html) return htmlResponse("<p>Meno je povinné.</p>", 400);
      return NextResponse.json({ ok: false, error: "Meno je povinné." }, { status: 400 });
    }

    const resolved = resolveInboundAgency(input.slug, input.token);
    if (!resolved) {
      if (html) return htmlResponse("<p>Neplatný formulár.</p>", 403);
      return NextResponse.json({ ok: false, error: "Neplatný token." }, { status: 403 });
    }

    const supabase = createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "Služba nie je dostupná." }, { status: 503 });
    }

    const noteParts = [
      input.listingRef ? `listing=${input.listingRef}` : "",
      input.note,
    ].filter(Boolean);

    const { data, error } = await supabase
      .from("leads")
      .insert({
        id: crypto.randomUUID(),
        agency_id: resolved.agencyId,
        name: input.name.slice(0, 200),
        email: input.email.slice(0, 254),
        phone: input.phone.slice(0, 50),
        location: "",
        budget: "",
        property_type: "Byt",
        rooms: "",
        financing: "Hypotéka",
        timeline: "",
        source: "web_form",
        status: "Nový",
        score: 50,
        assigned_agent: "Nepriradený",
        assigned_profile_id: null,
        last_contact: "Práve vytvorený",
        note: noteParts.join(" · ").slice(0, 5000),
      })
      .select("id, agency_id, source")
      .single();

    if (error) {
      console.error("[POST /api/leads/inbound]", error.message);
      if (html) return htmlResponse("<p>Nepodarilo sa odoslať. Skúste neskôr.</p>", 500);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (html) {
      return NextResponse.redirect(new URL(`/f/${input.slug}?submitted=1`, request.url), 303);
    }

    return NextResponse.json({ ok: true, lead: data });
  } catch (error) {
    console.error("[POST /api/leads/inbound]", error);
    if (html) return htmlResponse("<p>Nepodarilo sa odoslať.</p>", 500);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Chyba servera." },
      { status: 500 },
    );
  }
}
