import Link from "next/link";
import ModuleShell from "@/components/shared/module-shell";
import { createClient } from "@/lib/supabase/server";
import { SLATE_HORIZON, WORKDESK_CARD, WORKDESK_LOCKED } from "@/lib/slate-horizon-theme";
import { isTrhUnlocked, resolveTrhAccountTier } from "./trh-access";

export const dynamic = "force-dynamic";

export default async function TrhPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("account_tier, ui_role, role, agency_id")
        .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
        .maybeSingle()
    : { data: null };

  let agencyManualPlan: string | null = null;
  if (profile?.agency_id) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("manual_plan")
      .eq("id", profile.agency_id)
      .maybeSingle();
    agencyManualPlan = agency?.manual_plan ?? null;
  }

  const accountTier = resolveTrhAccountTier(profile, agencyManualPlan);
  const unlocked = isTrhUnlocked(accountTier);

  return (
    <ModuleShell
      title="Trh"
      description="Trhové signály — program Reality Monopol."
    >
      {unlocked ? (
        <section
          className="rounded-2xl border p-5"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
          data-testid="trh-unlocked"
        >
          <h2 className="text-lg font-bold" style={{ color: SLATE_HORIZON.ink }}>
            Trhové signály
          </h2>
          <p className="mt-2 text-sm" style={{ color: SLATE_HORIZON.muted }}>
            Táto obrazovka neukazuje vymyslené čísla. Živé trhové signály sú v
            Competition Heatmap, keď sú v kancelárii zapojené.
          </p>
          <p className="mt-4 text-sm" style={{ color: SLATE_HORIZON.muted }}>
            Zatiaľ bez dát
          </p>
          <Link
            href="/l99-hub"
            className="mt-4 inline-flex text-sm font-semibold"
            style={{ color: SLATE_HORIZON.brandDeep }}
          >
            Otvoriť trhové nástroje →
          </Link>
        </section>
      ) : (
        <section
          className="rounded-2xl border p-5"
          style={{
            background: WORKDESK_LOCKED.background,
            borderColor: WORKDESK_LOCKED.borderColor,
            boxShadow: WORKDESK_LOCKED.glow,
          }}
          data-testid="trh-locked"
        >
          <h2 className="text-lg font-bold" style={{ color: WORKDESK_LOCKED.titleColor }}>
            Trhové signály patria do Reality Monopol
          </h2>
          <p className="mt-2 text-sm" style={{ color: WORKDESK_LOCKED.subtitleColor }}>
            Ukážu, kde v lokalite spí konkurencia a kde máte priestor na deal —
            bez vymyslených čísiel na tejto stránke. Funkcia je v programe Reality
            Monopol.
          </p>
          <Link
            href="/billing"
            className="mt-4 inline-flex rounded-full px-5 py-2.5 text-sm font-bold text-white"
            style={{ background: SLATE_HORIZON.ctaGradient }}
          >
            Pozrieť program Reality Monopol
          </Link>
        </section>
      )}
    </ModuleShell>
  );
}
