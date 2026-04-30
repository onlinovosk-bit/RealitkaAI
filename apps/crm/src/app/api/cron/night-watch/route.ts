import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';
import { sendSlackMessage } from '@/lib/slack';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  return revolisGuard(req, 'NightWatch Agent', async () => {
    // Získanie štatistík za posledných 24 hodín
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const supabase = await createClient();

    const { data: leads, error } = await supabase.from('leads')
      .select('status, source')
      .gte('created_at', today.toISOString());

    if (error) throw error;

    const stats = {
      total: leads?.length || 0,
      social: leads?.filter(l => l.source === 'facebook' || l.source === 'instagram').length || 0,
      drafts: leads?.filter(l => l.status === 'SMS_DRAFTED').length || 0,
    };

    const report = `*🌙 Revolis NightWatch: Bilancia dňa*\n\n` +
      `✅ *Nové príležitosti:* ${stats.total}\n` +
      `📱 *Social Scout úlovky:* ${stats.social}\n` +
      `✉️ *Pripravené SMS na exkluzivitu:* ${stats.drafts}\n\n` +
      `*Verdikt:* Dnes sme rozpracovali príležitosti v hodnote tisícov eur. \n` +
      `_Dobrá práca, šéfe. Systém beží ďalej, kým spíte._`;

    await sendSlackMessage(report);
    return NextResponse.json({ success: true });
  });
}
