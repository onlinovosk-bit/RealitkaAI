/**
 * Job – odošle due outbound správy.
 * Spustenie: npx tsx src/jobs/run-outbound-send.ts
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
const batchSize = parseInt(process.env.OUTBOUND_BATCH_SIZE ?? "100", 10);

async function main() {
  console.log(`[${new Date().toISOString()}] Spúšťam Outbound Send job...`);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { campaigns, messages } = createSupabaseOutboundRepositories(supabase);
  const contentBuilder = createSimpleOutboundContentBuilder();
  const emailSender = createConsoleEmailSender();

  const service = new OutboundService(campaigns, messages, contentBuilder, emailSender);
  const sent = await service.sendDueEmails(new Date(), batchSize);

  console.log(`Outbound Send job dokončený. Odoslané: ${sent}`);
}

main().catch((e) => {
  console.error("Job zlyhal:", e);
  process.exit(1);
});
