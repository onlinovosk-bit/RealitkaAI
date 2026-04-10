// Typy pre dashboard summary a insights

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
