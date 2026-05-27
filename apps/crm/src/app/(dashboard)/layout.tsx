import { createClient } from "@/lib/supabase/server";
import { linkProfileToAuthUser } from "@/lib/profiles/resolve-profile-for-auth";
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

  // Zhodné s profile_agencies_for_auth(): párovanie cez auth_user_id alebo legacy profiles.id.
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "ui_role, account_tier, full_name, agency_name, agency_id, role, team_license_id"
    )
    .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
    .maybeSingle();

  return (
    <div
      data-theme="slate-horizon"
      style={{ display: "flex", flex: 1, minHeight: 0, width: "100%", overflow: "hidden" }}
    >
      <SessionRecovery />
      <AppSidebar
        uiRole={profile?.ui_role ?? "agent"}
        accountTier={profile?.account_tier ?? "free"}
        isInTeam={!!profile?.team_license_id}
        appRole={profile?.role ?? undefined}
        agencyName={profile?.agency_name ?? undefined}
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