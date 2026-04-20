export type FounderMetrics = {
  totalRevenue: number;
  activeLeads: number;
  conversionRate: number;
  avgDealSize: number;
  topAgents: { id: string; name: string; score: number }[];
};
export type GrowthDataPoint = { month: string; revenue: number; leads: number };
export type WhyLostReason = { reason: string; count: number; percentage: number };
