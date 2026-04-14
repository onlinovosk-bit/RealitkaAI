/**
 * Hromadné vloženie syntetických nehnuteľností do Supabase (service role).
 * Po spustení má modul Nehnuteľnosti zmiešané stavy vrátane „Predaná“.
 *
 *   npx tsx scripts/seed-properties-bulk.ts
 *
 * .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Pozn.: Opakované spustenie pridá ďalšie riadky (nový seed). Na čistý reštart
 * vymaž v SQL: delete from public.properties where id like 'demo-syn-%';
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { generateSyntheticProperties } from "../src/lib/demo/synthetic-properties";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("Chýba NEXT_PUBLIC_SUPABASE_URL alebo SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const seed = Math.floor(Date.now() / 1000) % 2147483647;
  const rows = generateSyntheticProperties(420, seed).map((p) => ({
    id: p.id,
    agency_id: p.agencyId,
    title: p.title,
    location: p.location,
    price: p.price,
    type: p.type,
    rooms: p.rooms,
    features: p.features,
    status: p.status,
    description: p.description,
    owner_name: p.ownerName,
    owner_phone: p.ownerPhone,
  }));

  const chunk = 80;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const { error } = await supabase.from("properties").insert(part);
    if (error) {
      console.error(`Batch ${i}-${i + part.length}:`, error.message);
      process.exit(1);
    }
    console.log(`OK ${i + part.length}/${rows.length}`);
  }

  console.log(`Hotovo: ${rows.length} nehnuteľností (seed=${seed}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
