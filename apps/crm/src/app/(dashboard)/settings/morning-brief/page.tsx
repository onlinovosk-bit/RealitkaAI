import MorningBriefSettingsPanel, {
  BRIEF_DEFAULTS,
  type BriefSettings,
} from "@/components/morning-brief/settings-panel";
import { getRscSupabase } from "@/lib/supabase/rsc-client";

/**
 * MORNING-BRIEF-UI-01 — bod 2 zadania foundera 2026-10-15.
 *
 * Cron `/api/cron/morning-brief` posiela iba profilom s riadkom
 * `morning_brief_settings.enabled = true`. Na PROD bolo 2026-10-15 nula
 * riadkov pri 23 profiloch, takže cron bežal 14 dní zo 14 a zakaždým skončil
 * na `enabled_rows: 0`. Táto stránka je to chýbajúce miesto.
 */
export default async function MorningBriefSettingsPage() {
  const supabase = await getRscSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle()
    : { data: null };

  // Klient tu nie je generovaný z DB typov, takže `select(string)` vracia
  // úniu s `GenericStringError`. Tvar riadku preto určuje tento typ.
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

  const { data: row } = profile?.id
    ? await supabase
        .from("morning_brief_settings")
        .select(
          "enabled,delivery_hour_utc,delivery_minute_utc,lead_count," +
            "include_lv_changes,include_arbitrage,include_price_drops," +
            "include_team_stats,channels,a_b_variant",
        )
        .eq("profile_id", profile.id)
        .maybeSingle<SettingsRow>()
    : { data: null as SettingsRow | null };

  const initial: BriefSettings = row
    ? {
        enabled:           row.enabled,
        deliveryHourUtc:   row.delivery_hour_utc,
        deliveryMinuteUtc: row.delivery_minute_utc,
        leadCount:         row.lead_count,
        includeLvChanges:  row.include_lv_changes,
        includeArbitrage:  row.include_arbitrage,
        includePriceDrops: row.include_price_drops,
        includeTeamStats:  row.include_team_stats,
        channels:          row.channels,
        abVariant:         row.a_b_variant === "B" ? "B" : "A",
      }
    : BRIEF_DEFAULTS;

  return (
    <main className="p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Ranný prehľad</h1>
          <p className="mt-1 text-gray-500">
            Každé ráno zhrnutie toho, čo sa oplatí riešiť ako prvé — leady,
            zmeny a príležitosti za posledný deň.
          </p>
        </div>

        <MorningBriefSettingsPanel initial={initial} neverConfigured={!row} />
      </div>
    </main>
  );
}
