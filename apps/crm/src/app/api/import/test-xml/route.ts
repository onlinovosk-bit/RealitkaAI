import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  mapRealsoftToPropertyInput,
  parseRealsoftXml,
} from "@/lib/importers/realsoft-parser";
import { emitPlatformEventServer } from "@/lib/platform-events-server";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

function authorize(request: Request): boolean {
  const expected = process.env.IMPORT_TEST_API_KEY?.trim();
  if (!expected) return true;
  return request.headers.get("x-revolis-import-key") === expected;
}

/**
 * POST /api/import/test-xml
 * Body JSON: { "xml": "<root>...</root>", "agencyId": "optional-uuid" }
 * Alebo raw `text/xml` / `application/xml` s telom XML.
 * Voliteľná ochrana: hlavička `x-revolis-import-key` = IMPORT_TEST_API_KEY
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Chýba SUPABASE_SERVICE_ROLE_KEY alebo NEXT_PUBLIC_SUPABASE_URL." },
      { status: 500 }
    );
  }

  let xml = "";
  let agencyIdFromBody: string | null | undefined;
  const ct = request.headers.get("content-type") ?? "";

  if (ct.includes("application/json")) {
    const body = (await request.json()) as { xml?: string; agencyId?: string | null };
    xml = typeof body.xml === "string" ? body.xml : "";
    agencyIdFromBody = body.agencyId ?? undefined;
  } else {
    xml = await request.text();
  }

  if (!xml.trim()) {
    return NextResponse.json({ ok: false, error: "Prázdny XML." }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parseRealsoftXml(xml);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Neplatný XML.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  const profile = await getCurrentProfile();
  const agencyId =
    (typeof agencyIdFromBody === "string" ? agencyIdFromBody : null) ??
    profile?.agency_id ??
    null;

  const input = mapRealsoftToPropertyInput(parsed, { agencyId });

  const id = randomUUID();

  const { data: propRow, error: propErr } = await supabase
    .from("properties")
    .insert({
      id,
      agency_id: input.agencyId,
      title: input.title,
      location: input.location,
      price: input.price,
      type: input.type,
      rooms: input.rooms,
      features: input.features,
      status: input.status,
      description: input.description,
      owner_name: input.ownerName,
      owner_phone: input.ownerPhone,
    })
    .select("id,title,price,location")
    .single();

  if (propErr) {
    return NextResponse.json(
      { ok: false, error: propErr.message, parsed },
      { status: 500 }
    );
  }

  const summary = `${input.title} — ${input.price.toLocaleString("sk-SK")} €${input.location ? `, ${input.location}` : ""}`;

  const { data: actRow, error: actErr } = await supabase
    .from("activities")
    .insert({
      lead_id: null,
      profile_id: profile?.id ?? null,
      type: "XML import",
      title: "Import nehnuteľnosti (Realsoft / Nehnuteľnosti)",
      text: `Uložená ponuka z XML: ${summary}. Fotiek: ${parsed.imageUrls.length}.`,
      entity_type: "property",
      entity_id: id,
      actor_name: profile?.full_name ?? "Systém",
      source: "inventory",
      severity: "success",
      meta: {
        propertyId: id,
        imageCount: parsed.imageUrls.length,
        areaM2: parsed.areaM2,
      },
    })
    .select("id")
    .single();

  if (actErr) {
    console.warn("[test-xml] activity insert:", actErr.message);
  }

  await emitPlatformEventServer({
    agencyId,
    eventType: "property.xml_imported",
    payload: {
      property_id: id,
      title: input.title,
      price: input.price,
      location: input.location,
      image_count: parsed.imageUrls.length,
      activity_id: actRow?.id ?? null,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  fetch(`${appUrl}/api/embeddings/index`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entityType: "property", entityId: id }),
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    property: propRow,
    parsed: {
      title: parsed.title,
      price: parsed.price,
      areaM2: parsed.areaM2,
      location: parsed.location,
      imageCount: parsed.imageUrls.length,
    },
    activityId: actRow?.id ?? null,
  });
}
