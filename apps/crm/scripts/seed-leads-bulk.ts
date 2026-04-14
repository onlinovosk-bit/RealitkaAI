/**
 * Hromadné vloženie syntetických záujemcov do Supabase (service role).
 *
 *   npx tsx scripts/seed-leads-bulk.ts
 *
 * .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Pozn.: Opakované spustenie pridá ďalšie riadky (nový seed). Na čistý reštart:
 *   delete from public.leads where id like 'demo-syn-lead-%';
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { generateSyntheticLeads } from "../src/lib/demo/synthetic-leads";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("Chýba NEXT_PUBLIC_SUPABASE_URL alebo SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const seed = Math.floor(Date.now() / 1000) % 2147483647;
  const rows = generateSyntheticLeads(420, seed).map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    location: l.location,
    budget: l.budget,
    property_type: l.propertyType,
    rooms: l.rooms,
    financing: l.financing,
    timeline: l.timeline,
    source: l.source,
    status: l.status,
    score: l.score,
    assigned_agent: l.assignedAgent,
    assigned_profile_id: l.assignedProfileId ?? null,
    last_contact: l.lastContact,
    note: l.note,
    client_segment: l.client_segment ?? null,
    buyer_readiness_score: l.buyer_readiness_score ?? null,
  }));

  const chunk = 80;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const { error } = await supabase.from("leads").insert(part);
    if (error) {
      console.error(`Batch ${i}-${i + part.length}:`, error.message);
      process.exit(1);
    }
    console.log(`OK ${i + part.length}/${rows.length}`);
  }

  console.log(`Hotovo: ${rows.length} záujemcov (seed=${seed}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
