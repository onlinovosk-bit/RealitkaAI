import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createProperty } from "@/lib/properties-store";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
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

  const { data, error } = await supabase.from("properties").select("*")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const { supabase, user } = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rateLimitBlock = await checkAiRateLimit(user.id, "properties:create", 30);
  if (rateLimitBlock) return NextResponse.json(rateLimitBlock, { status: 429 });

  const { data: callerProfile } = await supabase.from("profiles").select("agency_id").eq("id", user.id).maybeSingle()
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
    })
    return NextResponse.json(property)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const { supabase, user } = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, title, price } = await req.json()
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const { error } = await supabase.from("properties").update({ title, price }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const { supabase, user } = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const { error } = await supabase.from("properties").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
