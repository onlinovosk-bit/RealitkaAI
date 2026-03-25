// Pokročilý reporting a analytika (dashboardy, exporty, vizualizácie, segmentácia)

export interface ReportFilter {
  fromDate?: string;
  toDate?: string;
  agentId?: string;
  status?: string;
  channel?: string;
}

export interface LeadReportRow {
  leadId: string;
  name: string;
  email: string;
  status: string;
  score: number;
  createdAt: string;
  lastContact: string;
}

export async function getLeadsReport(filter: ReportFilter): Promise<LeadReportRow[]> {
  // TODO: Query na DB podľa filtra, segmentácia, export
  // Stub: vráti prázdne pole
  return [];
}

export async function exportLeadsToCsv(rows: LeadReportRow[]): Promise<string> {
  // Jednoduchý CSV export
  const header = 'leadId,name,email,status,score,createdAt,lastContact';
  const lines = rows.map(r => `${r.leadId},${r.name},${r.email},${r.status},${r.score},${r.createdAt},${r.lastContact}`);
  return [header, ...lines].join('\n');
}
