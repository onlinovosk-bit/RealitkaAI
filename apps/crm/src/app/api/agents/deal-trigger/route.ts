import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';
import { createClient } from '@/lib/supabase/server';
import { sendSlackMessage } from '@/lib/slack';
import { SMS_TEMPLATES } from '@/lib/sms-templates';

export async function GET(req: NextRequest) {
  return revolisGuard(req, 'Strážca Cien a Ziskov', async () => {
    const supabase = await createClient();
    const { data: deals, error } = await supabase.from('leads').select('*').eq('status', 'SEGMENTED').gt('lead_score', 85);
    if (error) throw error;
    if (!deals?.length) return NextResponse.json({ message: "Pokoj na trhu." });

    for (const d of deals) {
      // Vygenerovanie konceptu (Výber 2B)
      const draft = SMS_TEMPLATES.EXCLUSIVITY_INFORMATIONAL
        .replace('{{name}}', d.title ?? 'nehnuteľnosť');

      await sendSlackMessage(
        `🛡️ *STRÁŽCA CIEN: Pripravený koncept SMS*\n` +
        `*Pre:* ${d.phone}\n` +
        `*Cieľ:* Získanie exkluzivity (3B)\n` +
        `--- \n` +
        `💬 \`${draft}\` \n` +
        `--- \n` +
        `📲 *AKCIA:* Skopírujte a pošlite, alebo kliknite na [ODOSLAŤ CEZ BRÁNU] (ak je aktívna).`
      );

      const { error: updateError } = await supabase.from('leads').update({ status: 'SMS_DRAFTED' }).eq('id', d.id);
      if (updateError) throw updateError;
    }
    return NextResponse.json({ success: true, drafted: deals.length });
  });
}
