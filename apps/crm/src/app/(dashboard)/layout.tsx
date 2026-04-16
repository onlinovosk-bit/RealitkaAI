import { getCurrentProfile, requireUser } from "@/lib/auth";
import { mapProfileRole } from "@/lib/navigation";

import DashboardClientLayout from "./dashboard-client-layout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  const userName =
    profile?.full_name ||
    user.email ||
    "Prihlásený používateľ";

  const role = mapProfileRole(profile?.role);

  return (
    <DashboardClientLayout userName={userName} role={role}>
      {children}
    </DashboardClientLayout>
  );
}
