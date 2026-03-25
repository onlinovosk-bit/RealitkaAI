

import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import { getCurrentProfile, requireUser } from "@/lib/auth";

import DashboardClientShell from "./DashboardClientShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('DASHBOARD LAYOUT RENDER', { time: new Date().toISOString() });
  const user = await requireUser();
  const profile = await getCurrentProfile();

  const userName =
    profile?.full_name ||
    user.email ||
    "Prihlásený používateľ";

  const role = "owner";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={userName} role={role} />
        <DashboardClientShell userId={userName}>
          {children}
        </DashboardClientShell>
      </div>
    </div>
  );
}
