import { NextResponse } from 'next/server';
import type { DashboardSummaryResponse } from '../summary/route';
import { getCurrentProfile } from "@/lib/auth";
import { personalizeInsights } from "@/lib/ai-insights/personalization";
import { getUserHistory } from "@/lib/ai-insights/history";
import { logAnalyticsEvent } from "@/lib/ai-insights/analytics";

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
  const body = (await req.json()) as DashboardInsightsRequest;
  const profile = await getCurrentProfile();
  const userId = profile?.id || 'demo';
  const userName = profile?.full_name || profile?.email || "Používateľ";

  let insights: DashboardInsightsResponse = {
    headline: `Dnes máš ${body.summary.totals.hotLeads} horúcich klientov, ${userName}, ktorí čakajú na tvoj krok.`,
    summary: `Najväčší potenciál vidíme v kupujúcich s rozpočtom 150–250k € v Prešove a Košiciach. Posledné 3 dni boli aktívni, ale nedostali žiadny personalizovaný follow‑up.`,
    actions: [
      {
        title: `Zavolaj top 3 hot leadom s readiness score > 90` + (userName ? ` (${userName})` : ""),
        description: `Títo klienti reagovali na posledný email, pozerali si nové ponuky a sú blízko rozhodnutiu. Navrhni im 2–3 konkrétne nehnuteľnosti a dohodni obhliadku.`,
        recommendedChannel: 'call',
        relatedLeadIds: body.summary.topHotLeads.slice(0, 3).map(l => l.id),
        impact: 'high',
      },
      {
        title: 'Pošli follow‑up email 5 warm leadom bez kontaktu 7 dní',
        description: 'Udržíš ich v hre a získaš lepší signál o záujme. AI ti navrhne text na mieru.',
        recommendedChannel: 'email',
        relatedLeadIds: body.summary.topHotLeads.slice(3, 5).map(l => l.id),
        impact: 'medium',
      },
    ],
    notesForOwner: 'Najaktívnejší makléri generujú 80 % obratov. Zváž, či ostatným nepomôže zjednodušený denný plán založený na týchto akciách.',
  };

  insights.actions = personalizeInsights(insights.actions, profile);

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
