import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  return revolisGuard(req, 'Outreach Engine', async () => {
    const supabase = await createClient();
    const { data: leads, error } = await supabase.from('leads').select('*').eq('status', 'SEGMENTED').eq('segment', 'A');
    if (error) throw error;
    if (!leads?.length) return NextResponse.json({ message: 'No A-leads' });
    const updated = leads.map((l) => ({ ...l, status: 'OUTREACH_PENDING' }));
    const { error: upsertError } = await supabase.from('leads').upsert(updated, { onConflict: 'phone' });
    if (upsertError) throw upsertError;
    return NextResponse.json({ success: true, count: updated.length });
  });
}
