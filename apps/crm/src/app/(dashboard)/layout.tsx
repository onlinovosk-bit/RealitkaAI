import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/layout/AppSidebar";
import { WorkdeskTopbar } from "@/components/layout/WorkdeskTopbar";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("ui_role, account_tier, full_name, agency_name, role, team_license_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return (
    <div
      data-theme="slate-horizon"
      style={{ display: "flex", flex: 1, minHeight: 0, width: "100%", overflow: "hidden" }}
    >
      <AppSidebar
        uiRole={profile?.ui_role ?? "agent"}
        accountTier={profile?.account_tier ?? "free"}
        isInTeam={!!profile?.team_license_id}
        appRole={profile?.role ?? undefined}
        agencyName={profile?.agency_name ?? undefined}
        userName={profile?.full_name ?? undefined}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <WorkdeskTopbar userName={profile?.full_name ?? undefined} />
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