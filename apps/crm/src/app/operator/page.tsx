import { notFound } from "next/navigation";
import OperatorDashboardClient from "@/components/operator/OperatorDashboardClient";
import { canAccessOperatorDashboard } from "@/lib/operator/access";
import { isOperatorDashboardEnabled } from "@/lib/operator/config";
import { gatherOperatorDashboard } from "@/lib/operator/gather";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OperatorDashboardPage() {
  if (!isOperatorDashboardEnabled()) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allowed = await canAccessOperatorDashboard(supabase, user?.id);
  if (!allowed) {
    notFound();
  }

  const admin = createAdminClient();
  const payload = await gatherOperatorDashboard(admin);

  return <OperatorDashboardClient payload={payload} />;
}
