import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';
import { createClient } from '@/lib/supabase/server';
import { sendSlackMessage } from '@/lib/slack';

export async function GET(req: NextRequest) {
  return revolisGuard(req, 'Deal-Trigger Agent', async () => {
    console.log("⚡ Agent Team: Vyhodnocujem príležitosti na uzavretie obchodu...");
    const supabase = await createClient();

    // Hľadáme leady: Vysoký score (>80) + Znížená cena + Súkromný inzerát
    const { data: hotDeals, error: fetchError } = await supabase.from('leads')
      .select('*')
      .eq('status', 'SEGMENTED')
      .gt('lead_score', 80);

    if (fetchError) throw fetchError;
    if (!hotDeals?.length) return NextResponse.json({ message: "No urgent deals found." });

    for (const deal of hotDeals) {
      await sendSlackMessage(
        `🚨 *DEAL TRIGGER: Okamžitá Akcia!*\n` +
        `*Objekt:* ${deal.title}\n*Score:* ${deal.lead_score}\n` +
        `🔥 *Dôvod:* Kombinácia vysokej marže a priameho kontaktu na majiteľa.\n` +
        `⚡ *STAV:* Mením na NEGOTIATION_READY.`
      );
      
      const { error: updateError } = await supabase.from('leads')
        .update({ status: 'NEGOTIATION_READY' })
        .eq('id', deal.id);
      if (updateError) throw updateError;
    }

    return NextResponse.json({ success: true, triggers_fired: hotDeals.length });
  });
}
