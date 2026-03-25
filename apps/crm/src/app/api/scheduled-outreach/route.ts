// api/scheduled-outreach.ts
// Serverless handler for scheduled outreach (Vercel/Netlify cron)
import { NextRequest, NextResponse } from "next/server";
import { listLeads } from "@/lib/leads-store";
import { runOutreachSequence } from "@/scripts/outreach-automation-2.0";

export async function POST(req: NextRequest) {
  const leads = await listLeads();
  for (const lead of leads) {
    if (lead.email) {
      await runOutreachSequence(lead.id);
    }
  }
  return NextResponse.json({ ok: true });
}
