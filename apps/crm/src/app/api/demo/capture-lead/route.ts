import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { syncLeadToHubSpot } from "@/lib/hubspot/sync";

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

    const validSources = ["ai_odhadca", "neighborhood_watch", "digital_twin", "hero_email_capture"] as const;
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
    const normalizedEmail = body.email.toLowerCase().trim();
    const { data: inserted, error } = await supabase.from("leads_demo").insert({
      email: normalizedEmail,
      address: body.address ?? null,
      source,
      estimated_price: body.estimatedPrice ?? null,
      gdpr_consent: true,
      gdpr_consent_at: now,
      meta: baseMeta,
    }).select("id").single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      // Ak gdpr stĺpce ešte neexistujú (migrácia nebola spustená), skús bez nich
      if (error.code === "42703" || error.message?.includes("gdpr_consent")) {
        const { data: inserted2, error: e2 } = await supabase.from("leads_demo").insert({
          email: normalizedEmail,
          address: body.address ?? null,
          source,
          estimated_price: body.estimatedPrice ?? null,
          meta: { ...baseMeta, gdprConsent: true, gdprConsentAt: now },
        }).select("id").single();
        if (e2 && e2.code !== "23505") throw e2;
        if (!e2 && inserted2?.id) {
          syncLeadToHubSpot({ id: inserted2.id, email: normalizedEmail, status: "new", source, estimatedPrice: body.estimatedPrice }).catch(() => {})
        }
        return NextResponse.json({ ok: true, duplicate: e2?.code === "23505" });
      }
      throw error;
    }

    // Fire-and-forget HubSpot sync — non-blocking
    if (inserted?.id) {
      syncLeadToHubSpot({ id: inserted.id, email: normalizedEmail, status: "new", source, estimatedPrice: body.estimatedPrice }).catch(() => {})
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
