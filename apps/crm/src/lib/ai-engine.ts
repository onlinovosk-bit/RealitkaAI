// Revolis.AI – Smart Scoring Engine v2
// Váhový model: pipeline + aktivita + čas + decay

export type Lead = {
  id: string;
  name: string;
  phone?: string;
  status: string;
  last_contact_at?: string;
  created_at?: string;
  email?: string;
  score?: number;
};

// Helper: dni od dátumu
function daysSince(date?: string): number {
  if (!date) return 999;
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ─── SCORING ENGINE ───────────────────────────────────────────

// Váhy pipeline fáz
const STATUS_WEIGHTS: Record<string, number> = {
  "Nový":         20,
  "Teplý":        40,
  "Horúci":       80,
  "Obhliadka":    90,
  "Ponuka":      100,
  "Uzatvorený":    0,
  "Zamietnutý":    0,
};

export function calculateLeadScore(lead: Lead): number {
  let score = 0;

  // 1. Pipeline váha
  score += STATUS_WEIGHTS[lead.status] ?? 20;

  // 2. Čas od posledného kontaktu
  const days = daysSince(lead.last_contact_at);
  if (days <= 1)      score += 40;  // aktívny kontakt
  else if (days <= 3) score += 20;  // relatívne čerstvý
  else                score -= 10;  // začína chladnúť

  // 3. Engagement decay – kritická logika
  if (days >= 5)  score -= 30;  // výrazný pokles záujmu
  if (days >= 10) score -= 20;  // ďalší pokles (stacking)

  // 4. Čerstvo vytvorený lead = bonus
  const createdDays = daysSince(lead.created_at);
  if (createdDays <= 1) score += 15;  // nový lead = šanca

  return Math.max(0, Math.min(200, score)); // clamp 0–200
}

// Confidence % (realistický výpočet)
export function getConfidence(score: number): number {
  return Math.round((score / 200) * 100);
}

// Spätná kompatibilita – starý názov funkcie
export function getLeadScore(lead: Lead): number {
  return calculateLeadScore(lead);
}

// ─── LABELS ───────────────────────────────────────────────────

export function getLeadTemperature(score: number): string {
  if (score >= 130) return "🔥 Veľmi vysoká šanca kúpy";
  if (score >= 80)  return "🟡 Dobrá príležitosť";
  if (score >= 40)  return "🔵 Sleduj aktívne";
  return "⚪ Nízka aktivita";
}

export function getLeadBadge(score: number): {
  label: string;
  color: string;
  bg: string;
} {
  if (score >= 130) return { label: "HOT",    color: "#FCA5A5", bg: "rgba(239,68,68,0.15)" };
  if (score >= 80)  return { label: "TEPLÝ",  color: "#FCD34D", bg: "rgba(245,158,11,0.15)" };
  if (score >= 40)  return { label: "AKTÍVNY",color: "#67E8F9", bg: "rgba(34,211,238,0.12)" };
  return               { label: "STUDENÝ", color: "#94A3B8", bg: "rgba(148,163,184,0.10)" };
}

// ─── NEXT BEST ACTION ─────────────────────────────────────────

export function getNextBestAction(lead: Lead): string {
  const days = daysSince(lead.last_contact_at);

  if (lead.status === "Ponuka")    return "🤝 Zavolaj teraz – klient je blízko podpisu";
  if (lead.status === "Obhliadka") return "📅 Potvrď obhliadku a pošli detaily";
  if (lead.status === "Horúci")    return "🔥 Kontaktuj dnes – vysoká priorita";
  if (lead.status === "Nový")      return "⚡ Kontaktuj do 2 hodín – prvý kontakt rozhoduje";
  if (days >= 5)                   return "📩 Pošli správu na opätovný kontakt – klient začína chladnúť";
  if (days >= 2)                   return "💬 Pošli krátku správu so statusom";
  return "✅ Sleduj ďalší vývoj";
}

// ─── EXPLANATION (AI feel) ────────────────────────────────────

export function getExplanation(lead: Lead): string[] {
  const reasons: string[] = [];
  const days = daysSince(lead.last_contact_at);

  // Pipeline signály
  if (lead.status === "Ponuka")    reasons.push("je vo fáze ponuky");
  if (lead.status === "Obhliadka") reasons.push("má naplánovanú obhliadku");
  if (lead.status === "Horúci")    reasons.push("označený ako horúci lead");
  if (lead.status === "Nový")      reasons.push("čerstvo pridaný lead");

  // Časové signály
  if (days <= 1)  reasons.push("aktívna komunikácia dnes");
  if (days <= 3 && days > 1) reasons.push("nedávna komunikácia");
  if (days >= 5)  reasons.push("⚠ dlhšie bez kontaktu");
  if (days >= 10) reasons.push("⚠ riziko straty záujmu");

  // Vek leadu
  if (daysSince(lead.created_at) <= 1) reasons.push("nový lead – okno príležitosti");

  return reasons;
}

// ─── PAYWALL LOGIKA ───────────────────────────────────────────

export type PlanTier = "free" | "pro";

export function getVisibleRecommendations<T>(
  items: T[],
  plan: PlanTier,
  freeLimit = 2
): { visible: T[]; locked: T[]; isLocked: boolean } {
  if (plan === "pro") {
    return { visible: items, locked: [], isLocked: false };
  }
  return {
    visible: items.slice(0, freeLimit),
    locked: items.slice(freeLimit),
    isLocked: items.length > freeLimit,
  };
}

// ─── DAILY AI INSIGHTS ────────────────────────────────────────

export type AiInsight = {
  type: "warning" | "opportunity" | "action";
  title: string;
  description: string;
  leadId?: string;
};

export function generateDailyInsights(leads: Lead[]): AiInsight[] {
  const insights: AiInsight[] = [];

  // Leady bez kontaktu 5+ dní
  const coldLeads = leads.filter(
    (l) => daysSince(l.last_contact_at) >= 5 && l.status !== "Uzatvorený"
  );
  if (coldLeads.length > 0) {
    insights.push({
      type: "warning",
      title: `Strácaš ${coldLeads.length} ${coldLeads.length === 1 ? "klienta" : "klientov"}`,
      description: `${coldLeads.length} príležitostí nemá kontakt 5+ dní. Rýchla správa môže zachrániť obchod.`,
    });
  }

  // Horúce leady bez akcie dnes
  const hotLeads = leads.filter(
    (l) => (l.status === "Horúci" || l.status === "Ponuka") &&
            daysSince(l.last_contact_at) >= 1
  );
  if (hotLeads.length > 0) {
    insights.push({
      type: "opportunity",
      title: `${hotLeads.length} horúcich príležitostí čaká na akciu`,
      description: "Tieto príležitosti majú vysokú šancu kúpy. Zavolaj ešte dnes.",
      leadId: hotLeads[0]?.id,
    });
  }

  // Nové leady bez kontaktu
  const newLeads = leads.filter(
    (l) => l.status === "Nový" && daysSince(l.last_contact_at) >= 1
  );
  if (newLeads.length > 0) {
    insights.push({
      type: "action",
      title: `${newLeads.length} nových príležitostí bez prvého kontaktu`,
      description: "Prvý kontakt do 2 hodín zvyšuje konverziu o 60%.",
    });
  }

  return insights;
}
export function generateAIInsights(leads: Lead[]) {
  return leads
    .map((lead) => {
      const score = getLeadScore(lead); // výpočet skóre

      return {
        lead,
        score,
        temperature: getLeadTemperature(score), // typ leadu
        action: getNextBestAction(lead), // odporúčanie
        explanation: getExplanation(lead), // dôvody
        confidence: Math.min(95, 50 + score / 2), // fake confidence %
      };
    })
    .sort((a, b) => b.score - a.score) // zoradenie podľa priority
    .slice(0, 5); // top 5
}
