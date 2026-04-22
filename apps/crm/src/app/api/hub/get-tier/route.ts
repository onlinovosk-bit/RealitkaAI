import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { HubTier } from "@/types/intelligence-hub";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ tier: "free" as HubTier });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_tier, role")
      .eq("auth_user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ tier: "free" as HubTier });
    }

    // Founder vždy dostane enterprise
    if (profile.role === "founder") {
      return NextResponse.json({ tier: "enterprise" as HubTier });
    }

    const tier = (profile.account_tier ?? "free") as HubTier;
    return NextResponse.json({ tier });
  } catch (err) {
    console.error("[hub/get-tier] Error:", err);
    return NextResponse.json({ tier: "free" as HubTier });
  }
}
