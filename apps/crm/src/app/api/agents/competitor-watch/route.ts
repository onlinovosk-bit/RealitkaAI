import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';
import { createClient } from '@/lib/supabase/server';
import { sendSlackMessage } from '@/lib/slack';

export async function GET(req: NextRequest) {
  return revolisGuard(req, 'Competitor Watch Agent', async () => {
    console.log("🕵️ Agent Team: Sledujem zmeny u konkurencie...");
    const supabase = await createClient();
    void supabase;

    // Simulácia: Hľadáme záznamy, kde sa zmenila cena (Market Arbitrage)
    // V reále tu bude query na tvoju históriu cien v Supabase
    const priceDrops = [
      { id: 1, title: "Byt Centrum", old_price: 155000, new_price: 149000, source: "Nehnutelnosti.sk" }
    ];

    for (const drop of priceDrops) {
      await sendSlackMessage(
        `🚨 *MARKET ALERERT: Cenový skok!*\n` +
        `Objekt: ${drop.title}\n` +
        `Pôvodná cena: ${drop.old_price}€\n` +
        `Nová cena: ${drop.new_price}€\n` +
        `⚠️ *PRÍLEŽITOSŤ:* Konkurencia stráca dych. Ideálny čas na agresívny outreach.`
      );
    }

    return NextResponse.json({ success: true, alerts_sent: priceDrops.length });
  });
}
