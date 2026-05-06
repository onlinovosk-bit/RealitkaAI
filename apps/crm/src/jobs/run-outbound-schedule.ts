/**
 * Job – naplánuje outbound správy pre top agentúry.
 * Spustenie: npx tsx src/jobs/run-outbound-schedule.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { createSupabaseOutboundRepositories } from "@/infra/db/SupabaseOutboundRepositories";
import { createSimpleOutboundContentBuilder } from "@/infra/outbound/SimpleOutboundContentBuilder";
import { createConsoleEmailSender } from "@/infra/email/ConsoleEmailSender";
import { OutboundService } from "@/services/outbound/OutboundService";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const tenantId = process.env.DEFAULT_TENANT_ID ?? "";
const limit = parseInt(process.env.OUTBOUND_LIMIT ?? "50", 10);

async function main() {
  console.log(`[${new Date().toISOString()}] Spúšťam Outbound Schedule job...`);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { campaigns, messages } = createSupabaseOutboundRepositories(supabase);
  const contentBuilder = createSimpleOutboundContentBuilder();
  const emailSender = createConsoleEmailSender();

  const service = new OutboundService(campaigns, messages, contentBuilder, emailSender);
  const total = await service.scheduleForTopAgencies(tenantId, limit);

  console.log(`Outbound Schedule job dokončený. Naplánovaných: ${total}`);
}

main().catch((e) => {
  console.error("Job zlyhal:", e);
  process.exit(1);
});
