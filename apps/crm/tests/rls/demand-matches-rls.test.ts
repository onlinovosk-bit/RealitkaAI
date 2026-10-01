import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

/**
 * DEMAND-D4 tenant pin for `demand_property_matches`:
 *   1. a tenant reads its own agency's matches, not another agency's,
 *   2. a tenant cannot write,
 *   3. a match cannot exist without the demand record it came from
 *      (demand_record_id NOT NULL, contract §5) — not even via the service role.
 */

function env() {
  const url = process.env.TEST_SUPABASE_URL;
  const anon = process.env.TEST_SUPABASE_ANON_KEY;
  const service = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    throw new Error(
      "Missing TEST_SUPABASE_URL / TEST_SUPABASE_ANON_KEY / TEST_SUPABASE_SERVICE_ROLE_KEY. " +
        "RLS integration test must run against dedicated TEST Supabase.",
    );
  }
  if (url.includes("ypgajkhqtbriqqmyawyv")) throw new Error(`Refusing to run RLS test on production URL: ${url}`);
  return { url, anon, service };
}

describe("demand_property_matches RLS", () => {
  it("isolates tenants, allows no tenant writes, requires a demand record", async () => {
    const { url, anon, service } = env();
    const opts = { auth: { persistSession: false, autoRefreshToken: false } };
    const admin = createClient(url, service, opts);
    const user = createClient(url, anon, opts);

    const stamp = Date.now();
    const email = `rls-demand-matches-${stamp}@revolis.test`;
    const password = "RlsDemandMatches123!";
    const authUserId = randomUUID();
    const seed: Record<"a" | "b", { agency: string; lead: string; prop: string; demand?: string; match?: string }> = {
      a: { agency: randomUUID(), lead: `dm-lead-a-${stamp}`, prop: `dm-prop-a-${stamp}` },
      b: { agency: randomUUID(), lead: `dm-lead-b-${stamp}`, prop: `dm-prop-b-${stamp}` },
    };

    for (const [tag, s] of Object.entries(seed)) {
      const { error: agErr } = await admin.from("agencies").upsert({
        id: s.agency, name: `RLS Demand Matches ${tag}`, slug: `rls-dm-${tag}-${stamp}`, city: "Bratislava", plan: "Team",
      });
      expect(agErr?.message).toBeUndefined();
      const { error: leadErr } = await admin.from("leads").upsert({
        id: s.lead, name: "Demand Match Probe", email: `${s.lead}@revolis.test`, agency_id: s.agency, status: "Nový",
      });
      expect(leadErr?.message).toBeUndefined();
      const { error: propErr } = await admin.from("properties").insert({ id: s.prop, title: "probe", agency_id: s.agency });
      expect(propErr?.message).toBeUndefined();
      const { data: dem, error: demErr } = await admin.from("lead_demands").insert({
        agency_id: s.agency, lead_id: s.lead, status: "ok", demand: {}, extractor: "test",
      }).select("id").single();
      expect(demErr?.message).toBeUndefined();
      s.demand = dem!.id;
      const { data: m, error: mErr } = await admin.from("demand_property_matches").insert({
        agency_id: s.agency, lead_id: s.lead, demand_record_id: s.demand, property_id: s.prop,
        score: 1, fields: {}, engine: "test",
      }).select("id").single();
      expect(mErr?.message).toBeUndefined();
      s.match = m!.id;
    }

    // 3. no match without a demand record, even for the service role
    const { error: orphanErr } = await admin.from("demand_property_matches").insert({
      agency_id: seed.a.agency, lead_id: seed.a.lead, demand_record_id: null, property_id: seed.a.prop,
      score: 1, fields: {}, engine: "test",
    });
    expect(orphanErr, "a match without demand_record_id was accepted").toBeTruthy();

    const { error: userErr } = await admin.auth.admin.createUser({ id: authUserId, email, password, email_confirm: true });
    expect(userErr?.message).toBeUndefined();
    const { error: profErr } = await admin.from("profiles").upsert({
      id: randomUUID(), agency_id: seed.a.agency, auth_user_id: authUserId, full_name: "RLS DM Owner A", email, role: "owner",
    });
    expect(profErr?.message).toBeUndefined();
    const { error: signInErr } = await user.auth.signInWithPassword({ email, password });
    expect(signInErr?.message).toBeUndefined();

    // 1. own visible, foreign invisible
    const { data: own } = await user.from("demand_property_matches").select("id").eq("id", seed.a.match!);
    expect(own ?? []).toHaveLength(1);
    const { data: foreign } = await user.from("demand_property_matches").select("id").eq("id", seed.b.match!);
    expect(foreign ?? [], "tenant A read tenant B's matches").toHaveLength(0);

    // 2. no tenant writes
    const { error: insErr } = await user.from("demand_property_matches").insert({
      agency_id: seed.a.agency, lead_id: seed.a.lead, demand_record_id: seed.a.demand, property_id: seed.a.prop,
      score: 0.5, fields: {}, engine: "tenant",
    });
    expect(insErr, "authenticated could insert into demand_property_matches").toBeTruthy();

    for (const s of Object.values(seed)) {
      await admin.from("leads").delete().eq("id", s.lead); // cascades demand + match
      await admin.from("properties").delete().eq("id", s.prop);
    }
  }, 120_000);
});
