/**
 * Post-deploy verification for 20260713 migrations + buyer intent backfill.
 *
 *   node scripts/prod-deploy-verify.mjs
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

const AGENCY = "11111111-1111-1111-1111-111111111111";

async function probe(sb, label, fn) {
  try {
    const result = await fn();
    return { label, ok: true, result };
  } catch (error) {
    return { label, ok: false, error: String(error?.message ?? error) };
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env");

const sb = createClient(url, key, { auth: { persistSession: false } });

const checks = [];

checks.push(
  await probe(sb, "leads.auto_response_sent_at", async () => {
    const { error } = await sb.from("leads").select("auto_response_sent_at").limit(1);
    if (error) throw error;
    return "present";
  }),
);

checks.push(
  await probe(sb, "agencies.auto_response_enabled", async () => {
    const { error } = await sb.from("agencies").select("auto_response_enabled").limit(1);
    if (error) throw error;
    return "present";
  }),
);

checks.push(
  await probe(sb, "buyer_intents upsert constraint", async () => {
    const { error } = await sb.from("buyer_intents").upsert(
      {
        lead_id: "__probe__",
        deal_type: "buy",
        property_type: "flat",
      },
      { onConflict: "lead_id", ignoreDuplicates: true },
    );
    if (error) throw error;
    await sb.from("buyer_intents").delete().eq("lead_id", "__probe__");
    return "ok";
  }),
);

const { data: agency } = await sb
  .from("agencies")
  .select("id,name,auto_response_enabled")
  .eq("id", AGENCY)
  .maybeSingle();

const { count: intents } = await sb
  .from("buyer_intents")
  .select("id", { count: "exact", head: true });

const { data: owner } = await sb
  .from("profiles")
  .select("email,phone,full_name")
  .eq("agency_id", AGENCY)
  .eq("role", "owner")
  .limit(1);

console.log(
  JSON.stringify(
    {
      checks,
      agency,
      buyerIntents: intents ?? 0,
      ownerFallback: owner?.[0] ?? null,
      readyForBackfillApply: checks.every((c) => c.ok),
    },
    null,
    2,
  ),
);
