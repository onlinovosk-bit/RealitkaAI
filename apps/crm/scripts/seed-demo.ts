/**
 * Seed script – vloží demo leady a aktivity do Supabase.
 * Používa service role key (obchádza RLS).
 *
 * Spustenie:
 *   npx tsx scripts/seed-demo.ts
 *
 * Požiadavky v .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { randomUUID } from "crypto";
import { config } from "dotenv";
import { resolve } from "path";
// Načítaj .env.local z root-u projektu
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const ACTIVITY_TYPES = ["Obhliadka", "Dopyt", "Hovor", "Portál", "Email", "SMS", "Poznámka"];
const SK_NAMES = ["Ján Novák","Peter Kováč","Mária Horváth","Tomáš Lukáč","Zuzana Baláž","Martin Blaho","Eva Oravec","Michal Varga","Katarína Tóth","Ladislav Farkas"];

interface DemoEvent { type: string; occurredAt: Date }

function generateRandomEvents(count: number, days: number): DemoEvent[] {
  return Array.from({ length: count }, () => ({
    type: ACTIVITY_TYPES[Math.floor(Math.random() * ACTIVITY_TYPES.length)],
    occurredAt: new Date(Date.now() - Math.random() * days * 86400000),
  }));
}

function groupEventsByBuyer(events: DemoEvent[]): Map<string, { name: string; events: DemoEvent[] }> {
  const map = new Map<string, { name: string; events: DemoEvent[] }>();
  const buyers = SK_NAMES.map((name, i) => ({ name, email: `demo${i + 1}@revolis.ai` }));
  for (const ev of events) {
    const buyer = buyers[Math.floor(Math.random() * buyers.length)];
    const existing = map.get(buyer.email);
    if (existing) existing.events.push(ev);
    else map.set(buyer.email, { name: buyer.name, events: [ev] });
  }
  return map;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Chýba NEXT_PUBLIC_SUPABASE_URL alebo SUPABASE_SERVICE_ROLE_KEY v .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log("Generujem demo udalosti...");
  const events = generateRandomEvents(1200, 30);
  const buyerGroups = groupEventsByBuyer(events);

  console.log(`Seed: ${buyerGroups.size} kupujúcich, ${events.length} udalostí`);

  let leadCount = 0;
  let activityCount = 0;

  for (const [email, { name, events: buyerEvents }] of buyerGroups) {
    // Skús nájsť existujúci lead podľa mena
    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    let leadId: string;

    if (existing) {
      leadId = existing.id;
    } else {
      // Vložiť nový lead
      const { data: created, error: leadError } = await supabase
        .from("leads")
        .insert({
          id: randomUUID(),
          name,
          email,
          source: "Demo seed",
          status: "Nový",
          score: Math.floor(40 + Math.random() * 50),
          budget: `${Math.floor(150 + Math.random() * 200)} 000 €`,
          property_type: "Byt",
          rooms: `${Math.floor(2 + Math.random() * 3)}-izbový`,
          location: "Bratislava",
          note: `Demo klient generovaný seedom`,
        })
        .select("id")
        .single();

      if (leadError || !created) {
        console.warn(`Preskočený lead ${name}:`, leadError?.message);
        continue;
      }
      leadId = created.id;
    }

    const lead = { id: leadId };

    leadCount++;

    // Vložiť aktivity pre tohto leadu
    const activityRows = buyerEvents.map((ev) => ({
      lead_id: lead.id,
      type: ev.type,
      text: `${ev.type} – demo aktivita`,
      source: "Demo",
      created_at: ev.occurredAt.toISOString(),
    }));

    const { error: actError } = await supabase
      .from("activities")
      .insert(activityRows);

    if (actError) {
      console.warn(`Chyba pri aktivitách pre ${name}:`, actError.message);
    } else {
      activityCount += activityRows.length;
    }
  }

  console.log(`\nSeed dokončený:`);
  console.log(`  Leady:    ${leadCount}`);
  console.log(`  Aktivity: ${activityCount}`);
}

main().catch((e) => {
  console.error("Seed zlyhalo:", e);
  process.exit(1);
});
