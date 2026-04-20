const store = new Map<string, { opens: string[]; clicks: string[] }>();

export function recordEmailOpen(leadId: string, timestamp: string): void {
  if (!store.has(leadId)) store.set(leadId, { opens: [], clicks: [] });
  store.get(leadId)!.opens.push(timestamp);
}

export function recordEmailClick(leadId: string, timestamp: string): void {
  if (!store.has(leadId)) store.set(leadId, { opens: [], clicks: [] });
  store.get(leadId)!.clicks.push(timestamp);
}

export function getEmailEngagement(leadId: string) {
  return store.get(leadId) ?? { opens: [], clicks: [] };
}
