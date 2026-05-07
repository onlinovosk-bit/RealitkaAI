import { createClient } from "@/lib/supabase/server";
import { NextResponse }  from "next/server";

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

  const body = await req.json()
  const { data, error } = await supabase.from("properties").insert([body]).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
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
