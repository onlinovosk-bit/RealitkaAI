import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';
import { createClient } from '@/lib/supabase/server';
import { sendSlackMessage } from '@/lib/slack';

export async function GET(req: NextRequest) {
  return revolisGuard(req, 'Strážca Cien a Ziskov', async () => {
    const supabase = await createClient();
    const { data: deals, error } = await supabase.from('leads').select('*').eq('status', 'SEGMENTED').gt('lead_score', 85);
    if (error) throw error;
    if (!deals?.length) return NextResponse.json({ message: "Pokoj na trhu." });

    for (const d of deals) {
      await sendSlackMessage(
        `🛡️ *STRÁŽCA CIEN A ZISKOV: Detegovaná anomália!*\n` +
        `*Objekt:* ${d.title}\n` +
        `💰 *Analýza:* Cena klesla. Toto je priamy zásah do vášho zisku, ak nebudete prví.\n` +
        `🏆 *VÁŠ REALITY MONOPOL:* Dáta sú pripravené na uzavretie obchodu.`
      );
    }
    return NextResponse.json({ success: true });
  });
}
