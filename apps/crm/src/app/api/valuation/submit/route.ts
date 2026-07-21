import { NextResponse } from "next/server";
import { z } from "zod";
import { runInboundLeadTriageAndNotify } from "@/lib/acquire/inbound-lead-triage";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { enrichEstimateCommentary } from "@/lib/valuation/commentary";
import { buildDeterministicEstimate } from "@/lib/valuation/estimate-engine";
import { buildValuationLeadInsert } from "@/lib/valuation/lead-mapper";
import { resolveTenantAgencyId } from "@/lib/valuation/tenant";

const propertySchema = z.object({
  propertyType: z.enum(["byt", "dom"]),
  location: z.string().trim().min(3).max(200),
  postalCode: z.string().trim().max(12).optional(),
  sqm: z.coerce.number().min(1).max(10000),
  rooms: z.coerce.number().min(1).max(20).optional(),
  condition: z.enum(["povodny", "ciastocna", "kompletna", "novostavba"]).optional(),
  floor: z.coerce.number().min(-2).max(60).optional(),
  totalFloors: z.coerce.number().min(1).max(60).optional(),
  yearBuilt: z.coerce.number().min(1800).max(2035).optional(),
  hasElevator: z.boolean().optional(),
  hasBalcony: z.boolean().optional(),
  hasParking: z.boolean().optional(),
  landSqm: z.coerce.number().min(1).max(100000).optional(),
  heating: z.enum(["plyn", "elektrina", "distancne", "tuhle", "ine"]).optional(),
  ownerPriceExpectation: z.coerce.number().min(1).max(50_000_000).optional(),
});

const bodySchema = propertySchema.extend({
  agencySlug: z.string().trim().min(1),
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(6).max(50),
  sellTimeline: z.string().trim().max(100).optional(),
  sellWithin12Months: z.boolean(),
  privacyAck: z.literal(true),
  marketingOptIn: z.boolean().optional(),
  hp: z.string().optional(),
  abVariant: z.enum(["A", "B"]).optional(),
  sessionId: z.string().trim().max(64).optional(),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { allowed } = await rateLimit(`valuation-submit:${ip}`, 8, 60_000);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "Príliš veľa pokusov. Skúste neskôr." }, { status: 429 });
    }

    const raw = await request.json();
    if (raw?.hp) {
      return NextResponse.json({ ok: true });
    }

    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Skontrolujte povinné polia formulára." },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const supabase = createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "Služba nie je dostupná." }, { status: 503 });
    }

    const agencyId = await resolveTenantAgencyId(supabase, payload.agencySlug);
    if (!agencyId) {
      return NextResponse.json({ ok: false, error: "Neplatná agentúra." }, { status: 404 });
    }

    const propertyInput = {
      propertyType: payload.propertyType,
      location: payload.location,
      postalCode: payload.postalCode,
      sqm: payload.sqm,
      rooms: payload.rooms,
      condition: payload.condition,
      floor: payload.floor,
      totalFloors: payload.totalFloors,
      yearBuilt: payload.yearBuilt,
      hasElevator: payload.hasElevator,
      hasBalcony: payload.hasBalcony,
      hasParking: payload.hasParking,
      landSqm: payload.landSqm,
      heating: payload.heating,
      ownerPriceExpectation: payload.ownerPriceExpectation,
    };

    const baseEstimate = buildDeterministicEstimate(propertyInput);
    const estimate = {
      ...baseEstimate,
      commentary: await enrichEstimateCommentary(propertyInput, baseEstimate),
    };

    const leadRow = buildValuationLeadInsert(agencyId, {
      ...payload,
      ...propertyInput,
      estimate,
      abVariant: payload.abVariant,
      sessionId: payload.sessionId,
    });

    const { data: inserted, error } = await supabase
      .from("leads")
      .insert(leadRow)
      .select("id,name,status,score,last_contact,note,source,agency_id,ai_triage_at")
      .single();

    if (error) {
      console.error("[POST /api/valuation/submit]", error.message);
      return NextResponse.json({ ok: false, error: "Nepodarilo sa uložiť dopyt." }, { status: 500 });
    }

    void runInboundLeadTriageAndNotify(
      supabase,
      inserted,
      {
        agencyId,
        name: payload.name,
        status: "Nový",
        note: leadRow.note,
        source: "valuation_widget",
      },
    );

    return NextResponse.json({ ok: true, leadId: inserted.id, estimate });
  } catch (error) {
    console.error("[POST /api/valuation/submit]", error);
    return NextResponse.json({ ok: false, error: "Chyba servera." }, { status: 500 });
  }
}
