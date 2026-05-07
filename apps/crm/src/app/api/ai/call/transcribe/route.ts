import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFileSizeAllowed, isMimeTypeAllowed } from "@/lib/call-transcribe-limits";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
  if (!isMimeTypeAllowed(file.type)) return NextResponse.json({ ok: false, error: "Unsupported format" }, { status: 400 });
  if (!isFileSizeAllowed(file.size)) return NextResponse.json({ ok: false, error: "File too large" }, { status: 400 });

  return NextResponse.json({ ok: false, error: "Transkripcia nie je dostupná — nakonfiguruj OPENAI_API_KEY." }, { status: 501 });
}
