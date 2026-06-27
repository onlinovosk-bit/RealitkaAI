import { NextResponse } from "next/server";
import { z } from "zod";
import { okResponse, errorResponse } from "@/lib/api-response";
import { autoErrorCapture } from "@/lib/auto-error-capture";
import { createActivity } from "@/lib/activities-store";
import { createClient } from "@/lib/supabase/server";
import { linkProfileToAuthUser } from "@/lib/profiles/resolve-profile-for-auth";
import { createLead, listLeads } from "@/lib/leads-store";
import { autoRecalculateForLead } from "@/lib/matching-hooks";
import { validateBody } from "@/lib/api-validate";
import { globalEventBus } from "@/infra/messaging/EventBus";
import { createLeadCreatedEvent } from "@/domain/leads/events";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";

const CreateLeadSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional().default(""),
  location: z.string().max(200).optional().default(""),
  budget: z.string().max(100).optional().default(""),
  propertyType: z
    .enum(["Byt", "Dom", "Pozemok", "Komerčný priestor"])
    .default("Byt"),
  rooms: z.string().max(50).optional().default("2 izby"),
  financing: z
    .enum(["Hypotéka", "Hotovosť", "Kombinácia"])
    .optional()
    .default("Hypotéka"),
  timeline: z.string().max(100).optional().default("Do 3 mesiacov"),
  source: z.string().max(100).optional().default("Web formulár"),
  status: z.enum(["Nový", "Teplý", "Horúci", "Obhliadka", "Ponuka"]).optional().default("Nový"),
  score: z.coerce.number().int().min(0).max(100).optional().default(50),
  assignedAgent: z.string().max(200).optional().default("Nepriradený"),
  note: z.string().max(5000).optional().default(""),
});

/** Legacy AI endpoint – normalizované leady pre scoring (session). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const leads = await listLeads(undefined, supabase);
  const normalized = leads.slice(0, 20).map((lead) => ({
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    status:
      lead.status === "Nový"
        ? "Nový"
        : lead.status === "Obhliadka"
          ? "Obhliadka"
          : lead.status === "Ponuka"
            ? "Ponuka"
            : "Iné",
    last_contact_at: lead.lastContact,
    created_at: undefined,
  }));

  return NextResponse.json(normalized);
}

export async function POST(request: Request) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { data: callerProfile } = await supabaseAuth
      .from("profiles")
      .select("agency_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    // diagnostic log removed for production

    if (!callerProfile?.agency_id) {
      return NextResponse.json({ ok: false, error: "Chýba agentúra v profile" }, { status: 403 });
    }

    const agencyId = callerProfile.agency_id;

    const rateLimitBlock = await checkAiRateLimit(user.id, "leads:create", 30);
    if (rateLimitBlock) return NextResponse.json(rateLimitBlock, { status: 429 });

    const validation = await validateBody(request, CreateLeadSchema);
    if (!validation.ok) return validation.response;
    const body = validation.data;

    const lead = await createLead({
      agencyId,
      name: body.name,
      email: body.email ?? "",
      phone: body.phone,
      location: body.location,
      budget: body.budget,
      propertyType: body.propertyType,
      rooms: body.rooms,
      financing: body.financing,
      timeline: body.timeline,
      source: body.source,
      status: body.status,
      score: body.score,
      assignedAgent: body.assignedAgent,
      note: body.note,
    }, supabaseAuth);

    try {
      await createActivity({
        leadId: lead.id,
        type: "Lead",
        title: "Vytvorený lead",
        text: `Bol vytvorený nový lead: ${lead.name}.`,
        entityType: "lead",
        entityId: lead.id,
        actorName: lead.assignedAgent || "Systém",
        source: "crm",
        severity: "info",
      }, supabaseAuth);
    } catch {
      /* best-effort */
    }

    await autoRecalculateForLead(lead.id);

    globalEventBus.emit(createLeadCreatedEvent(lead.id, {
      name: lead.name,
      email: lead.email,
      phone: lead.phone ?? null,
      source: body.source,
      agencyId,
    })).catch(() => {/* best-effort */});

    return okResponse({ lead });
  } catch (error) {
    const result = autoErrorCapture(error, "POST /api/leads");
    return errorResponse(result.error, 400);
  }
}
