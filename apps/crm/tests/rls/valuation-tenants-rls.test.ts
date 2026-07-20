import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

type TestEnv = {
  url: string;
  anon: string;
  service: string;
};

const ENABLED_AGENCY_ID = "a0000001-0001-4001-8001-000000000011";
const DISABLED_AGENCY_ID = "a0000002-0002-4002-8002-000000000012";
const ENABLED_SLUG = "rls-valuation-enabled";
const DISABLED_SLUG = "rls-valuation-disabled";

function testEnv(): TestEnv {
  const url = process.env.TEST_SUPABASE_URL;
  const anon = process.env.TEST_SUPABASE_ANON_KEY;
  const service = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon || !service) {
    throw new Error(
      "Missing TEST_SUPABASE_URL / TEST_SUPABASE_ANON_KEY / TEST_SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!url.includes("127.0.0.1") && !url.includes("localhost")) {
    throw new Error(`Refusing valuation RLS test outside local ephemeral DB: ${url}`);
  }

  return { url, anon, service };
}

describe("valuation_tenants public RLS boundary", () => {
  it("returns only enabled branding to anon and never exposes leads", async () => {
    const { url, anon, service } = testEnv();
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const publicClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    for (const [id, slug] of [
      [ENABLED_AGENCY_ID, "rls-valuation-agency-enabled"],
      [DISABLED_AGENCY_ID, "rls-valuation-agency-disabled"],
    ] as const) {
      const { error } = await admin.from("agencies").upsert({
        id,
        name: `RLS valuation ${slug}`,
        slug,
        city: "Košice",
        plan: "Team",
      });
      expect(error?.message).toBeUndefined();
    }

    const { error: seedError } = await admin.from("valuation_tenants").upsert(
      [
        {
          agency_id: ENABLED_AGENCY_ID,
          slug: ENABLED_SLUG,
          brand_name: "Enabled valuation tenant",
          primary_color: "#6D28D9",
          enabled: true,
        },
        {
          agency_id: DISABLED_AGENCY_ID,
          slug: DISABLED_SLUG,
          brand_name: "Disabled valuation tenant",
          primary_color: "#6D28D9",
          enabled: false,
        },
      ],
      { onConflict: "slug" },
    );
    expect(seedError?.message).toBeUndefined();

    const { data: enabled, error: enabledError } = await publicClient.rpc(
      "get_valuation_tenant",
      { requested_slug: ENABLED_SLUG },
    );
    expect(enabledError?.message).toBeUndefined();
    expect(enabled).toEqual([
      {
        slug: ENABLED_SLUG,
        brand_name: "Enabled valuation tenant",
        logo_url: null,
        primary_color: "#6D28D9",
        calendly_url: null,
      },
    ]);

    const { data: disabled, error: disabledError } = await publicClient.rpc(
      "get_valuation_tenant",
      { requested_slug: DISABLED_SLUG },
    );
    expect(disabledError?.message).toBeUndefined();
    expect(disabled).toEqual([]);

    const { data: directTenants, error: directTenantsError } = await publicClient
      .from("valuation_tenants")
      .select("*");
    expect(directTenants ?? []).toEqual([]);
    expect(directTenantsError).toBeTruthy();

    const { data: leakedLeads, error: leadsError } = await publicClient
      .from("leads")
      .select("id")
      .limit(1);
    expect(leakedLeads ?? []).toEqual([]);
    expect(leadsError).toBeFalsy();
  });
});
