import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ValuationTable = "leads" | "lead_consents" | "sandbox_submissions";

export function getAdminClient(): SupabaseClient {
  const url = process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin credentials for valuation e2e");
  }

  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function countRows(
  client: SupabaseClient,
  table: ValuationTable,
  filters?: Record<string, string>,
): Promise<number> {
  let query = client.from(table).select("*", { count: "exact", head: true });

  if (filters) {
    for (const [column, value] of Object.entries(filters)) {
      query = query.eq(column, value);
    }
  }

  const { count, error } = await query;
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return count ?? 0;
}

export function smolkoSubmitPayload(email: string) {
  return {
    agencySlug: "reality-smolko",
    propertyType: "byt" as const,
    location: "Košice",
    sqm: 75,
    name: "E2E Test User",
    email,
    phone: "0900123456",
    sellWithin12Months: false,
    privacyAck: true,
  };
}

export function demoSubmitPayload(suffix: string) {
  return {
    agencySlug: "demo",
    propertyType: "byt" as const,
    location: "Košice",
    sqm: 75,
    name: "Demo User",
    email: `e2e-demo-${suffix}@revolis.test`,
    phone: "0900123456",
    sellWithin12Months: false,
    privacyAck: true,
  };
}
