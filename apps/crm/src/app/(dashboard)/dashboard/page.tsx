import { createClient } from "@/lib/supabase/server";
import {
  buildPropertiesSummary,
  listProperties,
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
      const summaryRows = await listProperties(undefined, supabase, {
        columns: "summary",
      });
      initialPropertiesSummary = buildPropertiesSummary(summaryRows);
    }
  } catch {
    initialPropertiesSummary = undefined;
  }

  return <DashboardPageClient initialPropertiesSummary={initialPropertiesSummary} />;
}
