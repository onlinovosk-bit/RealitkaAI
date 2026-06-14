import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

import { assertNotProduction } from "../helpers/env-guard";

function getTestEnv() {
  const url = process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.TEST_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, anon, service };
}

const hasEnv = Boolean(getTestEnv().url && getTestEnv().anon && getTestEnv().service);

describe.skipIf(!hasEnv)("enrichment_log RLS isolation (TEST_SUPABASE_*)", () => {
  it("prevents cross-tenant read and write with anon client", async () => {
    assertNotProduction();
    const { url, anon, service } = getTestEnv();
    const admin = createClient(url!, service!, { auth: { persistSession: false, autoRefreshToken: false } });
    const user = createClient(url!, anon!, { auth: { persistSession: false, autoRefreshToken: false } });

    const agencyA = "a0000001-0001-4001-8001-000000000001";
    const agencyB = "a0000002-0002-4002-8002-000000000002";

    // Seed one row for agency B with service role.
    const seedId = randomUUID();
    const { error: seedError } = await admin.from("enrichment_log").insert({
      id: seedId,
      agency_id: agencyB,
      record_id: "contact-b-1",
      record_type: "contact",
      field: "email",
      source: "seed",
      value: { normalized: "b@example.com" },
    });
    expect(seedError?.message).toBeUndefined();

    // Anon should not be able to read agency B row.
    const { data: leaked } = await user.from("enrichment_log").select("id").eq("id", seedId);
    expect(leaked ?? []).toHaveLength(0);

    // Anon should not be able to write cross-tenant row.
    const { error: insertError } = await user.from("enrichment_log").insert({
      agency_id: agencyA,
      record_id: "contact-a-1",
      record_type: "contact",
      field: "phone",
      source: "probe",
      value: { normalized: "+421900000000" },
    });
    expect(insertError).toBeTruthy();
  });
});
