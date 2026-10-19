import { z } from "zod";

import { okResponse, errorResponse } from "@/lib/api-response";
import { validateBody } from "@/lib/api-validate";
import { createClient } from "@/lib/supabase/server";
import { incrementUsageMetric } from "@/lib/usage-metrics";

/**
 * Nastavenia ranného prehľadu pre PRIHLÁSENÉHO používateľa.
 *
 * MORNING-BRIEF-UI-01 — prečo táto route vznikla:
 * cron `/api/cron/morning-brief` posiela iba profilom, ktoré majú v
 * `morning_brief_settings` riadok s `enabled = true` (route.ts:49). Na PROD
 * mala tá tabuľka 2026-10-15 **nula riadkov** pri 7 agentúrach a 23 profiloch,
 * takže cron bežal 14 dní zo 14 a zakaždým skončil na `enabled_rows: 0`.
 * Chýbalo jediné: miesto, kde si to človek zapne.
 *
 * Bezpečnosť: zapisuje sa SESSION klientom, nie service rolou, takže platí RLS
 * politika „users manage own brief settings". `profile_id` sa NIKDY neberie
 * z tela požiadavky — odvodzuje sa z `auth.uid()`. Keby sa bral z tela, mohol
 * by si prihlásený používateľ prepnúť prehľad cudziemu profilu; RLS by to
 * síce zachytila, ale spoliehať sa na druhú obranu, keď tú prvú stačí
 * nenechať otvorenú, je zbytočné riziko.
 */

/** Hranice sú rovnaké ako CHECK v migrácii 20260426114846_morning_brief.sql. */
const SettingsBody = z.object({
  enabled:             z.boolean(),
  deliveryHourUtc:     z.number().int().min(0).max(23),
  deliveryMinuteUtc:   z.number().int().min(0).max(59),
  leadCount:           z.number().int().min(1).max(10),
  includeLvChanges:    z.boolean(),
  includeArbitrage:    z.boolean(),
  includePriceDrops:   z.boolean(),
  includeTeamStats:    z.boolean(),
  // 'whatsapp' je v komentári migrácie ako budúci kanál, kód ho nevie doručiť,
  // takže ho tu zámerne nepúšťam — inak by si ho zákazník mohol zapnúť
  // a čakať správu, ktorá nikdy nepríde.
  channels:            z.array(z.enum(["email", "push"])).min(1),
  abVariant:           z.enum(["A", "B"]),
});

type SettingsRow = {
  enabled: boolean;
  delivery_hour_utc: number;
  delivery_minute_utc: number;
  lead_count: number;
  include_lv_changes: boolean;
  include_arbitrage: boolean;
  include_price_drops: boolean;
  include_team_stats: boolean;
  channels: string[];
  a_b_variant: string;
};

const COLUMNS =
  "enabled,delivery_hour_utc,delivery_minute_utc,lead_count," +
  "include_lv_changes,include_arbitrage,include_price_drops,include_team_stats," +
  "channels,a_b_variant";

/** Profil prihláseného používateľa, alebo null keď nie je prihlásený. */
async function currentProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ id: string; agencyId: string | null } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id,agency_id")
    .eq("auth_user_id", user.id)
    .maybeSingle<{ id: string; agency_id: string | null }>();

  return data ? { id: data.id, agencyId: data.agency_id } : null;
}

function toApi(row: SettingsRow) {
  return {
    enabled:           row.enabled,
    deliveryHourUtc:   row.delivery_hour_utc,
    deliveryMinuteUtc: row.delivery_minute_utc,
    leadCount:         row.lead_count,
    includeLvChanges:  row.include_lv_changes,
    includeArbitrage:  row.include_arbitrage,
    includePriceDrops: row.include_price_drops,
    includeTeamStats:  row.include_team_stats,
    channels:          row.channels,
    abVariant:         row.a_b_variant,
  };
}

export async function GET() {
  const supabase = await createClient();
  const profile = await currentProfile(supabase);
  if (!profile) return errorResponse("Neprihlásený používateľ.", 401);

  const { data, error } = await supabase
    .from("morning_brief_settings")
    .select(COLUMNS)
    .eq("profile_id", profile.id)
    .maybeSingle<SettingsRow>();

  if (error) {
    console.error("[morning-brief/settings] GET:", error.message);
    return errorResponse("Nastavenia sa nepodarilo načítať.", 500);
  }

  // `null` znamená „ešte si to nikdy nenastavil", nie „vypnuté". Rozdiel drží
  // UI: nenastavené sa nesmie tváriť ako vedomé vypnutie.
  return okResponse({ settings: data ? toApi(data) : null });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const profile = await currentProfile(supabase);
  if (!profile) return errorResponse("Neprihlásený používateľ.", 401);

  const parsed = await validateBody(request, SettingsBody);
  if (!parsed.ok) return parsed.response;
  const b = parsed.data;

  const { data, error } = await supabase
    .from("morning_brief_settings")
    .upsert(
      {
        profile_id:          profile.id,
        enabled:             b.enabled,
        delivery_hour_utc:   b.deliveryHourUtc,
        delivery_minute_utc: b.deliveryMinuteUtc,
        lead_count:          b.leadCount,
        include_lv_changes:  b.includeLvChanges,
        include_arbitrage:   b.includeArbitrage,
        include_price_drops: b.includePriceDrops,
        include_team_stats:  b.includeTeamStats,
        channels:            b.channels,
        a_b_variant:         b.abVariant,
        updated_at:          new Date().toISOString(),
      },
      { onConflict: "profile_id" },
    )
    .select(COLUMNS)
    .single<SettingsRow>();

  if (error || !data) {
    console.error("[morning-brief/settings] PUT:", error?.message);
    return errorResponse("Nastavenia sa nepodarilo uložiť.", 500);
  }

  if (profile.agencyId) {
    // Počítadlo nikdy nesmie rozhodnúť o výsledku uloženia — `incrementUsageMetric`
    // chyby prehĺta sám, preto tu nie je ďalší try/catch.
    await incrementUsageMetric({
      agencyId: profile.agencyId,
      metric: "morning_brief_settings_save",
    });
  }

  return okResponse({ settings: toApi(data) });
}
