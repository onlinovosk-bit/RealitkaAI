import { NextResponse } from "next/server";
import { z } from "zod";
import { runInboundLeadTriageAndNotify } from "@/lib/acquire/inbound-lead-triage";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { enrichEstimateCommentary } from "@/lib/valuation/commentary";
import { buildLeadConsentInsert } from "@/lib/valuation/consent-mapper";
import { buildDeterministicEstimate } from "@/lib/valuation/estimate-engine";
import { buildValuationLeadInsert } from "@/lib/valuation/lead-mapper";
import { buildSandboxSubmissionPayload, hashClientIp } from "@/lib/valuation/sandbox";
import { resolveTenantRecord } from "@/lib/valuation/tenant";

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

function buildPropertyInput(payload: z.infer<typeof bodySchema>) {
  return {
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
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

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

    const tenant = await resolveTenantRecord(supabase, payload.agencySlug);
    if (!tenant) {
      return NextResponse.json({ ok: false, error: "Neplatná agentúra." }, { status: 404 });
    }

    const rateKey = tenant.isSandbox
      ? `valuation-sandbox-submit:${ip}`
      : `valuation-submit:${ip}`;
    const rateLimitMax = tenant.isSandbox ? 5 : 8;
    const rateLimitWindow = tenant.isSandbox ? 3_600_000 : 60_000;
    const { allowed } = await rateLimit(rateKey, rateLimitMax, rateLimitWindow);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "Príliš veľa pokusov. Skúste neskôr." }, { status: 429 });
    }

    const propertyInput = buildPropertyInput(payload);
    const baseEstimate = buildDeterministicEstimate(propertyInput);
    const estimate = {
      ...baseEstimate,
      commentary: await enrichEstimateCommentary(propertyInput, baseEstimate),
    };

    if (tenant.isSandbox) {
      const sandboxPayload = buildSandboxSubmissionPayload({
        ...propertyInput,
        sellWithin12Months: payload.sellWithin12Months,
        abVariant: payload.abVariant,
        sessionId: payload.sessionId,
        estimate,
      });

      const { error: sandboxError } = await supabase.from("sandbox_submissions").insert({
        tenant_slug: payload.agencySlug.trim().toLowerCase(),
        payload: sandboxPayload,
        ip_hash: hashClientIp(ip),
      });

      if (sandboxError) {
        console.error("[POST /api/valuation/submit] sandbox", sandboxError.message);
        return NextResponse.json({ ok: false, error: "Nepodarilo sa uložiť dopyt." }, { status: 500 });
      }

      return NextResponse.json({ ok: true, leadId: crypto.randomUUID(), estimate, sandbox: true });
    }

    const leadRow = buildValuationLeadInsert(tenant.agencyId, {
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

    const consentRow = buildLeadConsentInsert({
      leadId: inserted.id,
      tenantSlug: payload.agencySlug,
      marketingOptIn: payload.marketingOptIn ?? false,
      acknowledgedAt: leadRow.gdpr_consent_at,
    });

    const { error: consentError } = await supabase.from("lead_consents").insert(consentRow);
    if (consentError) {
      console.error("[POST /api/valuation/submit] consent", consentError.message);
      await supabase.from("leads").delete().eq("id", inserted.id);
      return NextResponse.json({ ok: false, error: "Nepodarilo sa uložiť dopyt." }, { status: 500 });
    }

    void runInboundLeadTriageAndNotify(
      supabase,
      inserted,
      {
        agencyId: tenant.agencyId,
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
