import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateListingContent } from "@/lib/ai/listing-content";
import type { PropertyInput, ListingPersona } from "@/lib/ai/listing-content";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { property: PropertyInput; persona?: ListingPersona };

  if (!body.property?.type || !body.property?.location || !body.property?.price) {
    return NextResponse.json(
      { ok: false, error: "Chýbajú povinné polia: type, location, price" },
      { status: 400 }
    );
  }

  const content = await generateListingContent(body.property, body.persona ?? "GENERAL");
  return NextResponse.json({ ok: true, content });
}
