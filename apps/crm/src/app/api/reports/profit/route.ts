import { NextRequest } from 'next/server';
import { apiErr, apiOk } from '@/lib/api/response';
import { revolisGuard } from '@/lib/revolis-guard';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  return revolisGuard(req, 'Profit Dashboard', async () => {
    const supabase = await createClient();
    const { data: stats, error } = await supabase.from('leads').select('status, lead_score');
    if (error) return apiErr(error.message, 500, 'DB_ERROR');

    const report = {
      total_leads: stats?.length || 0,
      negotiation_ready: stats?.filter(l => l.status === 'NEGOTIATION_READY').length || 0,
      high_potential: stats?.filter(l => l.lead_score > 90).length || 0,
      timestamp: new Date().toISOString(),
    };

    return apiOk({ report });
  });
}
