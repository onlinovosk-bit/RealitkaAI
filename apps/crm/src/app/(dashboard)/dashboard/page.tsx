import { createClient } from "@/lib/supabase/server";
import {
  loadPropertiesInventory,
  type PropertiesSummary,
} from "@/lib/properties-store";
import DashboardPageClient from "./DashboardPageClient";

export const dynamic = "force-dynamic";

export default async function DashboardRoutePage() {
  let initialPropertiesSummary: PropertiesSummary | undefined;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { summary } = await loadPropertiesInventory(supabase);
      initialPropertiesSummary = summary;
    }
  } catch {
    initialPropertiesSummary = undefined;
  }

  return <DashboardPageClient initialPropertiesSummary={initialPropertiesSummary} />;
}
