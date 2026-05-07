import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export type DashboardSummaryResponse = {
  period: 'today' | 'last_7_days' | 'last_30_days';
  totals: {
    newLeads: number;
    activeLeads: number;
    hotLeads: number;
    dealsInPipeline: number;
    dealsWon: number;
  };
  buyerReadiness: {
    averageScore: number;
    hotCount: number;
    warmCount: number;
    coldCount: number;
  };
  topHotLeads: Array<{
    id: string;
    name: string;
    segment: 'buyer' | 'seller' | 'investor';
    readinessScore: number;
    lastActivityAt: string;
    nextStep?: string;
    propertyInterestSummary?: string;
  }>;
  activity: {
    callsToday: number;
    emailsToday: number;
    viewingsScheduled: number;
  };
};

export async function GET() {
  try {
    const supabase  = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayISO = todayStart.toISOString()

    const [
      { count: newLeads },
      { count: activeLeads },
      { data: hotLeadsData },
      { data: topLeads },
      { count: callsToday },
      { count: emailsToday },
    ] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
      supabase.from('leads').select('id', { count: 'exact', head: true }).neq('status', 'Archivovaný'),
      supabase.from('lead_scores').select('bri_score').gte('bri_score', 70),
      supabase.from('leads')
        .select('id, name, property_type, location, budget, last_contact_at, created_at')
        .order('score', { ascending: false })
        .limit(5),
      supabase.from('events').select('id', { count: 'exact', head: true })
        .eq('event_type', 'call_completed').gte('created_at', todayISO),
      supabase.from('events').select('id', { count: 'exact', head: true })
        .eq('event_type', 'message_sent').gte('created_at', todayISO),
    ])

    const scores  = (hotLeadsData ?? []).map(r => r.bri_score as number)
    const avg     = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const hotCnt  = scores.filter(s => s >= 70).length
    const warmCnt = scores.filter(s => s >= 40 && s < 70).length
    const coldCnt = scores.filter(s => s < 40).length

    const topHotLeads = (topLeads ?? []).map(l => ({
      id:                     l.id,
      name:                   l.name,
      segment:                'buyer' as const,
      readinessScore:         0,
      lastActivityAt:         l.last_contact_at ?? l.created_at,
      propertyInterestSummary: [l.property_type, l.location, l.budget].filter(Boolean).join(', ') || undefined,
    }))

    const data: DashboardSummaryResponse = {
      period: 'today',
      totals: {
        newLeads:        newLeads  ?? 0,
        activeLeads:     activeLeads ?? 0,
        hotLeads:        hotCnt,
        dealsInPipeline: 0,
        dealsWon:        0,
      },
      buyerReadiness: { averageScore: avg, hotCount: hotCnt, warmCount: warmCnt, coldCount: coldCnt },
      topHotLeads,
      activity: {
        callsToday:         callsToday  ?? 0,
        emailsToday:        emailsToday ?? 0,
        viewingsScheduled:  0,
      },
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[dashboard/summary]', err)
    return NextResponse.json({ error: 'Interná chyba.' }, { status: 500 })
  }
}
