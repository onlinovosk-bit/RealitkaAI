// Dashboard analytika: segmentácia, vizualizácie, prehľady

export interface DashboardStats {
  totalLeads: number;
  contactedLeads: number;
  convertedLeads: number;
  avgScore: number;
  byStatus: Record<string, number>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // TODO: Query na DB, agregácie
  // Stub: vráti prázdne štatistiky
  return {
    totalLeads: 0,
    contactedLeads: 0,
    convertedLeads: 0,
    avgScore: 0,
    byStatus: {},
  };
}
