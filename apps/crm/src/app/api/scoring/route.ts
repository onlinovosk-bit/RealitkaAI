import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  return revolisGuard(req, 'AI Scoring Engine', async () => {
    console.log("🎯 Revolis Engine: Spúšťam Scoring...");
    const supabase = await createClient();

    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'SCRAPED');

    if (fetchError) throw fetchError;
    if (!leads || leads.length === 0) {
      return NextResponse.json({ message: "Žiadne nové leady na scoring." });
    }

    const scoredLeads = leads.map(lead => {
      let score = 50;
      if (lead.price && lead.price > 100000) score += 10;
      if (lead.region === 'Poprad') score += 15;
      if (!lead.agent_name) score += 25; // Bonus za priamy kontakt

      return {
        ...lead,
        lead_score: score,
        status: 'SCORED'
      };
    });

    const { error: updateError } = await supabase
      .from('leads')
      .upsert(scoredLeads, { onConflict: 'phone' });

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, processed: scoredLeads.length });
  });
}
