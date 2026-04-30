import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';
import { createClient } from '@/lib/supabase/server';
import { sendSlackMessage } from '@/lib/slack';
import { SOCIAL_TEMPLATES } from '@/lib/sms-templates';

export async function POST(req: NextRequest) {
  return revolisGuard(req, 'Social Media Scout', async () => {
    const body = await req.json();
    const { platform, content, author, link, title } = body;
    const supabase = await createClient();

    // 1. ZÁPIS DO DATABÁZY
    const { error } = await supabase
      .from('leads')
      .insert([
        {
          source: platform,
          title: title || `Dopyt od ${author}`,
          content,
          url: link,
          status: 'SOCIAL_HOT'
        }
      ]);

    if (error) throw error;

    // 2. GENERÁVANIE KONCEPTU (Protokol 1C, 2B, 3B)
    const draft = SOCIAL_TEMPLATES.FB_HELP_REQUEST
      .replace('{{name}}', title || 'vasej nehnutelnosti');

    // 3. SLACK ALERT S KONCEPTOM
    await sendSlackMessage(
      `📱 *SOCIAL SCOUT: Horúci dopyt (${platform})*\n` +
      `*Autor:* ${author}\n` +
      `--- \n` +
      `💬 *Navrhovaný koncept:* \`${draft}\` \n` +
      `--- \n` +
      `🔗 [Odkaz na príspevok](${link})\n` +
      `⚡ *AKCIA:* Odpovedzte ako prvý a získajte exkluzivitu.`
    );

    return NextResponse.json({ success: true });
  });
}
