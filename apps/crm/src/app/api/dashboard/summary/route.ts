import { NextResponse } from 'next/server';

// --- Typy pre summary ---
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
    averageScore: number; // 0-100
    hotCount: number;     // score >= 70
    warmCount: number;    // 40–69
    coldCount: number;    // < 40
  };
  topHotLeads: Array<{
    id: string;
    name: string;
    segment: 'buyer' | 'seller' | 'investor';
    readinessScore: number; // 0-100
    lastActivityAt: string; // ISO
    nextStep?: string;      // e.g. "Call", "Follow-up email"
    propertyInterestSummary?: string; // krátky opis
  }>;
  activity: {
    callsToday: number;
    emailsToday: number;
    viewingsScheduled: number;
  };
};

export async function GET() {
  // TODO: načítaj dáta z DB
  const data: DashboardSummaryResponse = {
    period: 'today',
    totals: {
      newLeads: 8,
      activeLeads: 42,
      hotLeads: 12,
      dealsInPipeline: 19,
      dealsWon: 3,
    },
    buyerReadiness: {
      averageScore: 67,
      hotCount: 12,
      warmCount: 21,
      coldCount: 17,
    },
    topHotLeads: [
      {
        id: 'lead_1',
        name: 'Ján Novák',
        segment: 'buyer',
        readinessScore: 92,
        lastActivityAt: new Date().toISOString(),
        nextStep: 'Call',
        propertyInterestSummary: '3-izbový byt, Prešov, 150k €',
      },
      {
        id: 'lead_2',
        name: 'Petra Kováčová',
        segment: 'buyer',
        readinessScore: 91,
        lastActivityAt: new Date().toISOString(),
        nextStep: 'Call',
        propertyInterestSummary: '2-izbový byt, Košice, 180k €',
      },
      {
        id: 'lead_3',
        name: 'Marek Horváth',
        segment: 'investor',
        readinessScore: 90,
        lastActivityAt: new Date().toISOString(),
        nextStep: 'Meeting',
        propertyInterestSummary: 'Polyfunkčný objekt, Prešov, 500k €',
      },
    ],
    activity: {
      callsToday: 4,
      emailsToday: 9,
      viewingsScheduled: 3,
    },
  };

  return NextResponse.json(data);
}
