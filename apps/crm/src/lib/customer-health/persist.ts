import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyHealthResult } from "@/lib/customer-health/types";

/** Persist daily alert rows. Table may be missing until founder applies migration. */
export async function persistCustomerHealthDaily(
  admin: SupabaseClient,
  results: AgencyHealthResult[],
  checkedAt = new Date(),
): Promise<{ written: number; skipped?: string }> {
  if (results.length === 0) return { written: 0 };

  const day = checkedAt.toISOString().slice(0, 10);
  const rows = results.map((r) => ({
    agency_id: r.agencyId,
    checked_on: day,
    severity: r.severity,
    is_paying: r.isPaying,
    agency_name: r.agencyName,
    signals: r.signals,
    checked_at: checkedAt.toISOString(),
  }));

  const { error } = await admin.from("customer_health_daily").upsert(rows, {
    onConflict: "agency_id,checked_on",
  });

  if (error) {
    // Migration not applied yet — cron still returns alerts to founder.
    if (/relation .* does not exist|Could not find the table/i.test(error.message)) {
      return { written: 0, skipped: "table_missing" };
    }
    throw error;
  }

  return { written: rows.length };
}
