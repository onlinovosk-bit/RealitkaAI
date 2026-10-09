import { createClient } from "@/lib/supabase/server";
import { resolveAccountTier } from "@/lib/license/resolve-account-tier";
import {
  linkProfileToAuthUser,
  resolveProfileForAuthUser,
} from "@/lib/profiles/resolve-profile-for-auth";
import { normalizeProfileEntitlements } from "@/lib/profiles/normalize-profile-entitlements";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/layout/AppSidebar";
import { WorkdeskTopbar } from "@/components/layout/WorkdeskTopbar";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";
import SessionRecovery from "@/components/auth/session-recovery";
import { isInvalidRefreshTokenError } from "@/lib/supabase/auth-session";
import { PricingV2Provider } from "@/components/marketing/pricing-v2-context";
import { getPricingV2CatalogIfEnabled } from "@/components/marketing/pricing-v2-copy";
import { AgencyPricingV2Provider } from "@/components/billing/v2/agency-pricing-context";
import { fetchAgencyPricingV2 } from "@/lib/pricing-v2-agency";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && isInvalidRefreshTokenError(authError)) {
    await supabase.auth.signOut();
    redirect("/login?reason=session_expired");
  }
  if (!user) redirect("/login");

  await linkProfileToAuthUser(supabase, user.id, user.email);

  // Only columns on `profiles` — invalid fields (e.g. agency_name, team_license_id) break the whole select.
  const SIDEBAR_PROFILE_SELECT =
    "id, ui_role, account_tier, full_name, agency_id, role, email, is_platform_admin";
  const { profile: rawProfile } = await resolveProfileForAuthUser(
    supabase,
    user.id,
    SIDEBAR_PROFILE_SELECT,
    user.email,
  );
  const profile = normalizeProfileEntitlements(rawProfile);

  let agencyName: string | undefined;
  let agencyManualPlan: string | null = null;
  if (profile?.agency_id) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("name, manual_plan")
      .eq("id", profile.agency_id)
      .maybeSingle();
    agencyName = agency?.name ?? undefined;
    agencyManualPlan = agency?.manual_plan ?? null;
  }

  const accountTier = resolveAccountTier(profile, agencyManualPlan);

  // Cenník v2 (W3-fix): katalóg a stav kancelárie sa načítajú LEN pri zapnutom prepínači; vypnutý = žiadny
  // ďalší dotaz a providery s null (nerenderujú žiadne DOM) = výstup ako doteraz.
  const pricingV2Catalog = getPricingV2CatalogIfEnabled();
  const agencyPricingV2 =
    pricingV2Catalog && profile?.agency_id ? await fetchAgencyPricingV2(supabase, profile.agency_id) : null;

  return (
    <PricingV2Provider catalog={pricingV2Catalog}>
    <AgencyPricingV2Provider value={agencyPricingV2}>
    <div
      data-theme="slate-horizon"
      style={{ display: "flex", flex: 1, minHeight: 0, width: "100%", overflow: "hidden" }}
    >
      <SessionRecovery />
      <AppSidebar
        uiRole={profile?.ui_role ?? "agent"}
        accountTier={accountTier}
        agencyManualPlan={agencyManualPlan}
        isInTeam={false}
        appRole={profile?.role ?? undefined}
        agencyName={agencyName}
        userName={profile?.full_name ?? user.email ?? undefined}
        isPlatformAdmin={profile?.is_platform_admin === true}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <WorkdeskTopbar userName={profile?.full_name ?? user.email ?? undefined} />
        <main
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            background: `linear-gradient(180deg, ${SLATE_HORIZON.bg}, #ffffff)`,
          }}
        >
          {children}
        </main>
      </div>
    </div>
    </AgencyPricingV2Provider>
    </PricingV2Provider>
  );
}
