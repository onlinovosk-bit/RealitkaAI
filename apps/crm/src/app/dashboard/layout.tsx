import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { mapProfileRole } from "@/lib/navigation";

import DashboardClientShell from "../(dashboard)/DashboardClientShell";

export default async function DashboardSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  const userName =
    profile?.full_name || user.email || "Prihlásený používateľ";

  const role = mapProfileRole(profile?.role);

  return (
    <div className="flex min-h-screen" style={{ background: "#050914" }}>
      <div className="hidden md:block">
        <Sidebar role={role} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={userName} role={role} />
        <DashboardClientShell userId={userName}>{children}</DashboardClientShell>
      </div>
    </div>
  );
}
