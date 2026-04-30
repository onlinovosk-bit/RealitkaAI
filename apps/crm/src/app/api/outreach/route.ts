import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';
import { createClient } from '@/lib/supabase/server';
import { sendSlackMessage } from '@/lib/slack';

export async function GET(req: NextRequest) {
  return revolisGuard(req, 'Outreach Engine', async () => {
    const supabase = await createClient();
    const { data: leads, error } = await supabase.from('leads')
      .select('*')
      .eq('status', 'SEGMENTED')
      .eq('segment', 'A');

    if (error) throw error;
    if (!leads?.length) return NextResponse.json({ message: "No hot leads for Slack" });

    for (const lead of leads) {
      await sendSlackMessage(`🔥 *Nový HOT Lead (A-Segment)!*\n*Mesto:* ${lead.region}\n*Cena:* ${lead.price}€\n*Kontakt:* ${lead.phone}\n_Pripravené na kontaktovanie._`);
    }

    const updated = leads.map((l) => ({ ...l, status: 'OUTREACH_DONE' }));
    const { error: upsertError } = await supabase.from('leads').upsert(updated, { onConflict: 'phone' });

    if (upsertError) throw upsertError;
    return NextResponse.json({ success: true, alerted: leads.length });
  });
}
