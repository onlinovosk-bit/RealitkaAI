import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase config chýba.");
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      email?: string;
      address?: string;
      source?: string;
      estimatedPrice?: number;
      gdprConsent?: boolean;
    };

    // Email validácia
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!body.email || !emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Zadajte platný email." },
        { status: 400 }
      );
    }

    // GDPR validácia – POVINNÉ
    if (!body.gdprConsent) {
      return NextResponse.json(
        { error: "Súhlas so spracovaním osobných údajov je povinný." },
        { status: 400 }
      );
    }

    const validSources = ["ai_odhadca", "neighborhood_watch", "digital_twin"] as const;
    const source = validSources.includes(body.source as typeof validSources[number])
      ? body.source
      : "ai_odhadca";

    const supabase = getServiceClient();

    const now = new Date().toISOString();
    const baseMeta = {
      userAgent: request.headers.get("user-agent") ?? "",
      capturedAt: now,
    };

    // Pokus s gdpr stĺpcami
    const { error } = await supabase.from("leads_demo").insert({
      email: body.email.toLowerCase().trim(),
      address: body.address ?? null,
      source,
      estimated_price: body.estimatedPrice ?? null,
      gdpr_consent: true,
      gdpr_consent_at: now,
      meta: baseMeta,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      // Ak gdpr stĺpce ešte neexistujú (migrácia nebola spustená), skús bez nich
      if (error.code === "42703" || error.message?.includes("gdpr_consent")) {
        const { error: e2 } = await supabase.from("leads_demo").insert({
          email: body.email.toLowerCase().trim(),
          address: body.address ?? null,
          source,
          estimated_price: body.estimatedPrice ?? null,
          meta: { ...baseMeta, gdprConsent: true, gdprConsentAt: now },
        });
        if (e2 && e2.code !== "23505") throw e2;
        return NextResponse.json({ ok: true, duplicate: e2?.code === "23505" });
      }
      throw error;
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
