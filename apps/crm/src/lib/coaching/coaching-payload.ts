/**
 * Every number here must come from `broker_performance_stats` (Directive 4:
 * never a fake number). A field without a source is null, and the dashboard
 * hides it; with no stats row at all the panel is not shown.
 */
export type CoachingPayload = {
  stats: {
    funnelDropOffStage: string;
    followUpConsistency: number;
    avgDealVelocityDays: number;
  };
  insight: string;
  /** No streak source yet. */
  streakDays: number | null;
  /** No regional ranking source yet. */
  followUpRankLabel: string | null;
  dealVelocityLabel: string | null;
  /** No market-average source yet. */
  dealVelocityDeltaLabel: string | null;
};
