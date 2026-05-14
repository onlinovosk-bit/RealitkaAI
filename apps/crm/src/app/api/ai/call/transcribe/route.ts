import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFileSizeAllowed, isMimeTypeAllowed } from "@/lib/call-transcribe-limits";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "Transkript: nastav OPENAI_API_KEY (Whisper) na serveri." },
      { status: 503 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
  if (!isMimeTypeAllowed(file.type)) return NextResponse.json({ ok: false, error: "Unsupported format" }, { status: 400 });
  if (!isFileSizeAllowed(file.size)) return NextResponse.json({ ok: false, error: "File too large" }, { status: 400 });

  try {
    const openai = new OpenAI({ apiKey: key });
    const buf = Buffer.from(await file.arrayBuffer());
    const uploadable = await toFile(buf, file.name || "audio.m4a", { type: file.type || "audio/mpeg" });
    const tr = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: uploadable,
      language: "sk",
    });
    const text = (tr as { text?: string }).text ?? "";
    return NextResponse.json({ ok: true, transcript: text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Transcription failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
