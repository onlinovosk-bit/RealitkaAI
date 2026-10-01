import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';
import { createClient } from '@/lib/supabase/server';
import { routeAlert } from '@/lib/alerts/router';

export async function GET(req: NextRequest) {
  return revolisGuard(req, 'Outreach Engine', async () => {
    const supabase = await createClient();
    const { data: leads, error } = await supabase.from('leads')
      .select('*')
      .eq('status', 'SEGMENTED')
      .eq('segment', 'A');

    if (error) throw error;
    if (!leads?.length) return NextResponse.json({ message: "No hot leads for Slack" });

    // Jeden agregovaný alert, nie jedna správa na lead: pri 20 horúcich leadoch
    // poslal starý kód 20 správ a siréna sa zmenila na šum.
    //
    // Telefón, meno ani adresa sa do alertu NEDOSTANÚ. Sú to osobné údaje
    // (CLAUDE.md §4) a alert je externý kanál. Founder dostane počet a odkaz
    // do CRM; kto to je, si pozrie tam, za autentifikáciou.
    await routeAlert({
      type: "HOT_LEADS",
      severity: "WARNING",
      title: `Nové horúce leady (A-segment): ${leads.length}`,
      agent: "outreach",
      dedupKey: "outreach:hot-leads",
      actionRequired: true,
      fields: {
        pocet: String(leads.length),
        segment: "A",
      },
      evidenceRef: "/dashboard/leads?segment=A&status=OUTREACH_DONE",
    });

    const updated = leads.map((l) => ({ ...l, status: 'OUTREACH_DONE' }));
    // Use 'id' (UUID) as conflict key — never 'phone', which can collide across tenants.
    const { error: upsertError } = await supabase.from('leads').upsert(updated, { onConflict: 'id' });

    if (upsertError) throw upsertError;
    return NextResponse.json({ success: true, alerted: leads.length });
  });
}
