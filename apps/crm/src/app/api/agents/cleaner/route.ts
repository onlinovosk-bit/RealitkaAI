import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  return revolisGuard(req, 'Systémový Čistič', async () => {
    const supabase = await createClient();
    const { error } = await supabase.from('leads').delete().lt('lead_score', 20);
    if (error) throw error;
    return NextResponse.json({ success: true, message: "Nerelevantné leady boli odstránené." });
  });
}
