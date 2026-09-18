import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';
import { routeAlert } from '@/lib/alerts/router';
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

    // Severity EVENT, nie WARNING: denná bilancia nie je incident. Pri
    // štandardnom prahu (ALERTS_MIN_SEVERITY=WARNING) sa preto NEDORUČÍ —
    // zapína ju `ALERTS_MIN_SEVERITY=EVENT`. Je to vedomá zmena oproti
    // starému správaniu, kde sa súhrn posielal vždy.
    //
    // Pôvodný text obsahoval vetu „príležitosti v hodnote tisícov eur“.
    // Žiadny výpočet za ňou nestál, takže je preč (CLAUDE.md §4 — nikdy
    // vymyslené číslo). Zostávajú tri počty, ktoré sú naozaj spočítané.
    await routeAlert({
      type: "NIGHT_WATCH_SUMMARY",
      severity: "EVENT",
      title: "NightWatch — bilancia dňa",
      agent: "night-watch",
      dedupKey: `night-watch:${today.toISOString().slice(0, 10)}`,
      fields: {
        novePrilezitosti: String(stats.total),
        zoSocialnychSieti: String(stats.social),
        pripraveneSms: String(stats.drafts),
      },
      evidenceRef: "/dashboard/leads",
    });

    return NextResponse.json({ success: true });
  });
}
