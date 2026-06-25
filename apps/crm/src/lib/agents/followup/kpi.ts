export type LeadContactKpiInput = {
  id: string;
  created_at?: string | null;
  last_contact?: string | null;
};

export type ContactWithin24hKpi = {
  totalLeads: number;
  contactedWithin24h: number;
  percentWithin24h: number;
};

const MS_24H = 24 * 60 * 60 * 1000;

function parseMs(value?: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Smolko case-study KPI: share of leads with first contact within 24h of creation.
 */
export function computeContactedWithin24hPercent(
  leads: LeadContactKpiInput[],
  nowMs = Date.now(),
): ContactWithin24hKpi {
  void nowMs;
  const totalLeads = leads.length;
  if (totalLeads === 0) {
    return { totalLeads: 0, contactedWithin24h: 0, percentWithin24h: 0 };
  }

  let contactedWithin24h = 0;
  for (const lead of leads) {
    const createdMs = parseMs(lead.created_at);
    const contactMs = parseMs(lead.last_contact);
    if (createdMs == null || contactMs == null) continue;
    if (contactMs - createdMs <= MS_24H) contactedWithin24h += 1;
  }

  const percentWithin24h = Math.round((contactedWithin24h / totalLeads) * 1000) / 10;
  return { totalLeads, contactedWithin24h, percentWithin24h };
}
