import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("properties").select("*");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  const { data, error } = await supabase.from("properties").insert([body]).select();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function PUT(req: Request) {
  const supabase = await createClient();
  const { id, title, price } = await req.json();
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabase.from("properties").update({ title, price }).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { id } = await req.json();
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
