import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  return revolisGuard(req, 'AI Segmentation', async () => {
    const supabase = await createClient();
    const { data: leads, error } = await supabase.from('leads').select('*').eq('status', 'SCORED');
    if (error) throw error;
    if (!leads?.length) return NextResponse.json({ message: 'No leads' });
    const segmented = leads.map((l) => ({ ...l, segment: l.lead_score > 80 ? 'A' : 'B', status: 'SEGMENTED' }));
    const { error: upsertError } = await supabase.from('leads').upsert(segmented, { onConflict: 'phone' });
    if (upsertError) throw upsertError;
    return NextResponse.json({ success: true, count: segmented.length });
  });
}
