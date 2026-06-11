import { NextResponse } from 'next/server';
import { getCurrentProfile } from "@/lib/auth";
import { personalizeInsights } from "@/lib/ai-insights/personalization";
import { getUserHistory } from "@/lib/ai-insights/history";
import { logAnalyticsEvent } from "@/lib/ai-insights/analytics";
import { buildEmptyInsights } from "@/lib/ai/dashboard-insights";
import { isDashboardInsightsCacheFresh } from "@/lib/ai/dashboard-insights-cache";
import type { DashboardInsightsCachePayload } from "@/lib/ai/dashboard-insights-cron";
import { createClient } from "@/lib/supabase/server";

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
  generatedAt: string | null;
  cacheStatus: 'hit' | 'missing';
};

export async function POST() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = profile.id;
  const userName = profile.full_name || profile.email || "Používateľ";

  if (!profile.agency_id) {
    const empty = buildEmptyInsights(userName);
    return NextResponse.json({
      ...empty,
      generatedAt: null,
      cacheStatus: 'missing' as const,
    });
  }

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from('dashboard_insights_cache')
    .select('payload, generated_at')
    .eq('agency_id', profile.agency_id)
    .maybeSingle();

  if (error) {
    console.error('[dashboard/insights] cache read:', error.message);
    return NextResponse.json({ error: 'Cache read failed' }, { status: 500 });
  }

  if (!row?.payload || !isDashboardInsightsCacheFresh(row.generated_at as string)) {
    const empty = buildEmptyInsights(userName);
    return NextResponse.json({
      ...empty,
      generatedAt: null,
      cacheStatus: 'missing' as const,
    });
  }

  const cached = row.payload as DashboardInsightsCachePayload;
  const actions = Array.isArray(cached.actions) ? cached.actions : [];
  const insights = {
    headline: cached.headline,
    summary: cached.summary,
    actions: personalizeInsights(actions, profile),
    notesForOwner: cached.notesForOwner,
    generatedAt: row.generated_at as string,
    cacheStatus: 'hit' as const,
  };

  // Demo FS analytics/history — must not break cache read on Vercel (read-only FS).
  try {
    await logAnalyticsEvent({
      userId,
      actionIdx: -1,
      actionTitle: 'dashboard-insights',
      event: 'viewed',
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[dashboard/insights] analytics:', e);
  }

  try {
    await getUserHistory(userId);
  } catch (e) {
    console.error('[dashboard/insights] history:', e);
  }

  return NextResponse.json(insights);
}
