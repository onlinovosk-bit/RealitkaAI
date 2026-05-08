// api/scheduled-outreach.ts
// Serverless handler for scheduled outreach (Vercel/Netlify cron)
import { NextRequest, NextResponse } from "next/server";
import { listLeads } from "@/lib/leads-store";
import { runOutreachSequence } from "@/scripts/outreach-automation-2.0";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const leads = await listLeads();
  for (const lead of leads) {
    if (lead.email) {
      await runOutreachSequence(lead.id);
    }
  }
  return NextResponse.json({ ok: true });
}
