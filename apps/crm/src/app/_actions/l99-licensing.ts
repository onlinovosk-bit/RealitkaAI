"use server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type L99Balik = "pro" | "enterprise";

const SLOT_CONFIG: Record<L99Balik, { protocol: number; vision: number; active: number }> = {
  pro:        { protocol: 0, vision: 1, active: 1 },  // Market Vision  – 2 sloty
  enterprise: { protocol: 1, vision: 0, active: 4 },  // Protocol Authority – 5 slotov
};

export async function upgradeToL99(authUserId: string, balik: L99Balik) {
  const supabase = createServiceRoleClient();
  if (!supabase) throw new Error("Supabase service client nedostupný.");

  const config = SLOT_CONFIG[balik];

  const { data, error } = await supabase
    .from("profiles")
    .update({
      account_tier: balik,
      tier_updated_at: new Date().toISOString(),
      // Sloty uložíme do meta JSON poľa – nevyžaduje migráciu
      meta: {
        l99_slots_protocol: config.protocol,
        l99_slots_vision:   config.vision,
        l99_slots_active:   config.active,
        l99_upgraded_at:    new Date().toISOString(),
      },
    })
    .eq("auth_user_id", authUserId)
    .select("id, account_tier")
    .single();

  if (error) throw error;
  return data;
}
