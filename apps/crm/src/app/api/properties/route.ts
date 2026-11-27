import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { okResponse, errorResponse } from "@/lib/api-response";
import {
  createProperty,
  deleteProperty,
  getProperty,
  listProperties,
  updateProperty,
} from "@/lib/properties-store";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
import { sameAgency } from "@/lib/tenant-scope";
import { z } from "zod";

const CreatePropertyBody = z.object({
  title: z.string().min(1).max(300),
  location: z.string().max(200).optional(),
  price: z.number().min(0).max(999_999_999).optional(),
  type: z.string().max(100).optional(),
  rooms: z.string().max(50).optional(),
  features: z.array(z.string().max(100)).max(50).optional(),
  status: z.string().max(50).optional(),
  description: z.string().max(5000).optional(),
  ownerName: z.string().max(200).optional(),
  ownerPhone: z.string().max(30).optional(),
});

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET() {
  const { supabase, user } = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const properties = await listProperties(undefined, supabase)
  return NextResponse.json(properties)
}

export async function POST(req: Request) {
  const { supabase, user } = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rateLimitBlock = await checkAiRateLimit(user.id, "properties:create", 30);
  if (rateLimitBlock) return NextResponse.json(rateLimitBlock, { status: 429 });

  const { data: callerProfile } = await supabase.from("profiles").select("agency_id").eq("auth_user_id", user.id).maybeSingle()
  const agencyId = callerProfile?.agency_id ?? ""

  const rawBody = await req.json()
  const parsed = CreatePropertyBody.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const body = parsed.data;

  try {
    const property = await createProperty({
      agencyId,
      title: body.title,
      location: body.location ?? "",
      price: body.price ?? 0,
      type: body.type ?? "Byt",
      rooms: body.rooms ?? "2 izby",
      features: body.features ?? [],
      status: body.status ?? "Aktívna",
      description: body.description ?? "",
      ownerName: body.ownerName ?? "",
      ownerPhone: body.ownerPhone ?? "",
    }, supabase)
    // property-create-form kontroluje data.ok (rovnaký kontrakt ako PATCH [id]).
    return okResponse({ property })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return errorResponse(message, 500)
  }
}

/**
 * Legacy collection mutators. Same multi-agency RLS class as /api/import (#961):
 * `profile_agencies_for_auth()` can make a sibling-tenant row visible, so writes
 * MUST be pinned to the session agency — never bare `.eq("id", id)`.
 * Prefer PATCH/DELETE `/api/properties/[id]` (already gated).
 */
export async function PUT(req: Request) {
  const { supabase, user } = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  const body = await req.json().catch(() => ({})) as {
    id?: unknown
    title?: unknown
    price?: unknown
  }
  const id = typeof body.id === "string" ? body.id.trim() : ""
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const existing = await getProperty(id, supabase)
  // Fail closed: missing caller agency or foreign/unknown property → 403
  // (do not reveal whether the id exists in another tenant).
  if (!sameAgency(callerProfile?.agency_id, existing?.agencyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await updateProperty(
      id,
      {
        title: typeof body.title === "string" ? body.title : undefined,
        price: typeof body.price === "number" ? body.price : undefined,
      },
      supabase,
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request) {
  const { supabase, user } = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  const body = await req.json().catch(() => ({})) as { id?: unknown }
  const id = typeof body.id === "string" ? body.id.trim() : ""
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const existing = await getProperty(id, supabase)
  if (!sameAgency(callerProfile?.agency_id, existing?.agencyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await deleteProperty(id, supabase)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 },
    )
  }
}
