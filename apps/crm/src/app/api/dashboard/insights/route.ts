import { NextResponse } from 'next/server';
import type { DashboardSummaryResponse } from '../summary/route';
import { getCurrentProfile } from "@/lib/auth";
import { personalizeInsights } from "@/lib/ai-insights/personalization";
import { getUserHistory } from "@/lib/ai-insights/history";
import { logAnalyticsEvent } from "@/lib/ai-insights/analytics";
import { generateDashboardInsights } from "@/lib/ai/dashboard-insights";
import { createClient } from "@/lib/supabase/server";

export type DashboardInsightsRequest = {
  period: 'today' | 'last_7_days';
  summary: DashboardSummaryResponse;
};

export type DashboardInsightsResponse = {
  headline: string;
  summary: string;
  actions: Array<{
    title: string;
    description: string;
    recommendedChannel: 'call' | 'email' | 'sms' | 'meeting';
    relatedLeadIds: string[];
    impact: 'high' | 'medium' | 'low';
  }>;
  notesForOwner?: string;
};

export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as DashboardInsightsRequest;
  const userId   = profile.id;
  const userName = profile.full_name || profile.email || "Používateľ";

  const supabase = await createClient();
  const { data: properties } = await supabase
    .from('properties')
    .select('id, title, location, price, status')
    .neq('status', 'Archivovaná')
    .order('created_at', { ascending: false })
    .limit(5);

  let insights = await generateDashboardInsights({
    period: body.period ?? 'today',
    summary: body.summary,
    userName,
    properties: (properties ?? []).map(p => ({
      id:       p.id as string,
      title:    p.title as string,
      location: (p.location as string) ?? '',
      price:    (p.price as number) ?? 0,
      status:   (p.status as string) ?? '',
    })),
  });

  insights = {
    ...insights,
    actions: personalizeInsights(insights.actions, profile),
  };

  await logAnalyticsEvent({
    userId,
    actionIdx: -1,
    actionTitle: 'dashboard-insights',
    event: 'viewed',
    timestamp: new Date().toISOString(),
  });

  await getUserHistory(userId);

  return NextResponse.json(insights);
}
