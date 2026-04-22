import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase config chýba.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      email?: string;
      address?: string;
      source?: string;
      estimatedPrice?: number;
    };

    if (!body.email || !EMAIL_REGEX.test(body.email)) {
      return NextResponse.json(
        { error: "Zadajte platný email." },
        { status: 400 }
      );
    }

    const validSources = ['ai_odhadca', 'neighborhood_watch', 'digital_twin'] as const;
    const source = validSources.includes(body.source as typeof validSources[number])
      ? body.source
      : 'ai_odhadca';

    const supabase = getServiceClient();

    const { error } = await supabase.from("leads_demo").insert({
      email: body.email.toLowerCase().trim(),
      address: body.address ?? null,
      source,
      estimated_price: body.estimatedPrice ?? null,
      meta: {
        userAgent: request.headers.get("user-agent") ?? "",
        capturedAt: new Date().toISOString(),
      },
    });

    if (error) {
      // Duplicate email je OK pre demo
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      console.error("[demo/capture-lead] Supabase error:", error);
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, duplicate: false });
  } catch (err) {
    console.error("[demo/capture-lead] Error:", err);
    return NextResponse.json(
      { error: "Nepodarilo sa uložiť kontakt." },
      { status: 500 }
    );
  }
}
