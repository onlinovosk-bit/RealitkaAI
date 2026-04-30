import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  return revolisGuard(req, 'Bazoš Scraper', async () => {
    console.log("🚀 Revolis Engine: Štartujem scraping...");
    const supabase = await createClient();

    // Tu prebehne tvoja scraping logika (rawLeads)
    const rawLeads = [
      { title: "Byt Poprad - Súkromný", phone: "0900111222", region: "Poprad", price: 120000 }
    ];

    const { error } = await supabase
      .from('leads')
      .upsert(
        rawLeads.map(lead => ({
          ...lead,
          status: 'SCRAPED',
          updated_at: new Date()
        })),
        { onConflict: 'phone' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true, count: rawLeads.length });
  });
}
