import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';
import { sendSlackMessage } from '@/lib/slack';

export async function GET(req: NextRequest) {
  return revolisGuard(req, 'Morning Briefing', async () => {
    const activeTodos = "Dokončiť integráciu Slacku a otestovať Outreach flow.";
    
    const briefing = `*🌅 Revolis Morning Briefing*\n\n` +
      `*Naposledy si pracoval na:* Zabezpečení API a rotácii kľúčov.\n` +
      `*Aktuálne TODO:* ${activeTodos}\n\n` +
      `*3 Priority na dnes:*\n` +
      `1. ✅ Otestovať Outreach trigger do Slacku\n` +
      `2. 📊 Skontrolovať úspešnosť scrapingu v Supabase\n` +
      `3. 🤖 Navrhnúť šablóny pre A-segment outreach\n\n` +
      `_Dajme do toho 100%, šéfe!_`;

    await sendSlackMessage(briefing);
    return NextResponse.json({ success: true, message: "Briefing sent to Slack" });
  });
}
