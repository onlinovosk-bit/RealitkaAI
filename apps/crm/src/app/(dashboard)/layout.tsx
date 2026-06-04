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
    "id, ui_role, account_tier, full_name, agency_id, role, email";
  const { profile: rawProfile } = await resolveProfileForAuthUser(
    supabase,
    user.id,
    SIDEBAR_PROFILE_SELECT,
    user.email,
  );
  const profile = normalizeProfileEntitlements(rawProfile);
  const accountTier = resolveAccountTier(profile);

  let agencyName: string | undefined;
  if (profile?.agency_id) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("name")
      .eq("id", profile.agency_id)
      .maybeSingle();
    agencyName = agency?.name ?? undefined;
  }

  return (
    <div
      data-theme="slate-horizon"
      style={{ display: "flex", flex: 1, minHeight: 0, width: "100%", overflow: "hidden" }}
    >
      <SessionRecovery />
      <AppSidebar
        uiRole={profile?.ui_role ?? "agent"}
        accountTier={accountTier}
        isInTeam={false}
        appRole={profile?.role ?? undefined}
        agencyName={agencyName}
        userName={profile?.full_name ?? user.email ?? undefined}
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
  );
}
