import { createClient }  from "@/lib/supabase/server";
import { redirect }      from "next/navigation";
import AppSidebar        from "@/components/layout/AppSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      ui_role,
      account_tier,
      full_name,
      agency_name,
      role,
      team_license_id
    `)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return (
    <div
      style={{
        display:   "flex",
        minHeight: "100vh",
        background: "#050914",
      }}
    >
      <AppSidebar
        uiRole={profile?.ui_role      ?? "agent"}
        accountTier={profile?.account_tier ?? "free"}
        isInTeam={!!profile?.team_license_id}
        appRole={profile?.role          ?? undefined}
        agencyName={profile?.agency_name  ?? undefined}
        userName={profile?.full_name    ?? undefined}
      />
      <main
        style={{
          flex:      1,
          minWidth:  0,
          overflowY: "auto",
        }}
      >
        {children}
      </main>
    </div>
  );
}
