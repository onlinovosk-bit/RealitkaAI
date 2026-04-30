import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';
import { createClient } from '@/lib/supabase/server';
import { sendSlackMessage } from '@/lib/slack';

export async function POST(req: NextRequest) {
  return revolisGuard(req, 'Social Media Scout', async () => {
    const body = await req.json();
    const { platform, content, author, link } = body;

    console.log(`📱 Agent Team: Prijímam lead z platformy ${platform}...`);
    const supabase = await createClient();

    // 1. ZÁPIS DO SUPABASE (S novým statusom SOCIAL_RAW)
    const { error } = await supabase
      .from('leads')
      .insert([
        {
          source: platform,
          title: `Príspevok od: ${author}`,
          content,
          url: link,
          status: 'SCRAPED', // Rovno ho hodíme do štafety na scoring
          updated_at: new Date()
        }
      ]);

    if (error) throw error;

    // 2. OKAMŽITÁ NOTIFIKÁCIA NA SLACK (Hormozi Speed)
    await sendSlackMessage(
      `📱 *SOCIAL SCOUT ALERT (${platform})*\n` +
      `*Autor:* ${author}\n` +
      `*Text:* _"${content.substring(0, 100)}..."_\n` +
      `🔗 [Odkaz na príspevok](${link})\n` +
      `⚡ *AKCIA:* Agent ho práve poslal do Scoringu.`
    );

    return NextResponse.json({ success: true, message: "Social lead captured" });
  });
}
