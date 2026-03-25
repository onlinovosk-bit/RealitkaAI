// Lead enrichment & validation module
// Napojenie na externé databázy, scoring, doplnenie údajov

export interface LeadEnrichmentResult {
  valid: boolean;
  enriched: boolean;
  score: number;
  data: Record<string, any>;
  errors?: string[];
}

// Príklad: enrichment cez externé API (napr. Clearbit, OpenCorporates, email/phone validation)
export async function enrichLead(lead: {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  location?: string;
}): Promise<LeadEnrichmentResult> {
  // TODO: Integrácia na externé API podľa dostupnosti kľúčov
  // Tu len stub: validácia emailu, scoring podľa údajov
  const errors: string[] = [];
  let score = 50;
  let valid = true;
  if (!lead.email || !lead.email.includes('@')) {
    errors.push('Neplatný email');
    valid = false;
    score -= 20;
  }
  if (lead.phone && lead.phone.length < 8) {
    errors.push('Neplatné telefónne číslo');
    valid = false;
    score -= 10;
  }
  // Príklad enrichmentu: doplnenie domény z emailu
  let domain = '';
  if (lead.email) {
    const parts = lead.email.split('@');
    if (parts.length === 2) domain = parts[1];
  }
  return {
    valid,
    enriched: !!domain,
    score,
    data: { ...lead, domain },
    errors: errors.length ? errors : undefined,
  };
}
