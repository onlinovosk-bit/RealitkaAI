import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';
import { createClient } from '@/lib/supabase/server';
import { routeAlert } from '@/lib/alerts/router';
import { SOCIAL_TEMPLATES } from '@/lib/sms-templates';

export async function POST(req: NextRequest) {
  return revolisGuard(req, 'Social Media Scout', async () => {
    const body = await req.json();
    const { platform, content, author, link, title } = body;
    const supabase = await createClient();

    // 1. ZÁPIS DO DATABÁZY
    const { data: lead, error } = await supabase
      .from('leads')
      .insert([
        {
          source: platform,
          title: title || `Dopyt od ${author}`,
          content,
          url: link,
          status: 'SOCIAL_HOT'
        }
      ])
      .select('id')
      .single();

    if (error) throw error;

    // 2. GENERÁVANIE KONCEPTU (Protokol 1C, 2B, 3B)
    const draft = SOCIAL_TEMPLATES.FB_HELP_REQUEST
      .replace('{{name}}', title || 'vasej nehnutelnosti');
    void draft; // koncept žije v CRM pri leade, nie v alerte — viď nižšie

    // 3. ALERT CEZ ROUTER
    //
    // `author` je meno reálnej osoby zo sociálnej siete a `content` je jej text.
    // Obidvoje sú osobné údaje a do externého kanála nepatria (CLAUDE.md §4).
    // Navrhovaný koncept odpovede sem tiež nepatrí: je to obsah, nie identifikátor,
    // a maklér ho má schvaľovať v CRM, nie odklikávať zo Slacku.
    await routeAlert({
      type: "SOCIAL_LEAD",
      severity: "WARNING",
      title: `Horúci dopyt zo siete ${String(platform)}`,
      agent: "social-scout",
      dedupKey: `social-lead:${lead.id}`,
      actionRequired: true,
      fields: {
        platforma: String(platform),
        leadId: String(lead.id),
      },
      evidenceRef: `/dashboard/leads/${lead.id}`,
    });

    return NextResponse.json({ success: true });
  });
}
