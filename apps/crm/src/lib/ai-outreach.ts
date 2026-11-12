import { sanitizeText, rehydrate } from "@/lib/ai/sanitize";
import {
  completeOutreachLlm,
  OutreachCostBlockedError,
} from "@/lib/ai/outreach-cost-governance";

type LeadLike = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  budget: string;
  propertyType: string;
  rooms: string;
  financing: string;
  timeline: string;
  status: string;
  score: number;
  note: string;
};

function getNumberFromEnv(value: string | undefined, fallbackValue: number) {
  if (!value) return fallbackValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}

function clampText(value: string, maxChars: number) {
  if (!value || value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1)).trimEnd()}...`;
}

function getOutreachModel(score: number) {
  const defaultModel = process.env.OUTREACH_MODEL || "gpt-4.1-mini";
  const highQualityModel = process.env.OUTREACH_HIGH_QUALITY_MODEL || "gpt-4.1";
  const minScore = getNumberFromEnv(process.env.OUTREACH_HIGH_QUALITY_MIN_SCORE, 80);

  return score >= minScore ? highQualityModel : defaultModel;
}

function fallbackSubject(lead: LeadLike) {
  return `Ponuka nehnuteľnosti pre ${lead.name}`;
}

function fallbackBody(lead: LeadLike) {
  return `Dobrý deň ${lead.name},

na základe Vášho dopytu na ${lead.propertyType.toLowerCase()} v lokalite ${lead.location} sme pre Vás pripravili vhodné možnosti.

Zhrnutie Vášho dopytu:
- lokalita: ${lead.location}
- rozpočet: ${lead.budget}
- typ nehnuteľnosti: ${lead.propertyType}
- izby: ${lead.rooms}
- financovanie: ${lead.financing}
- časový horizont: ${lead.timeline}

Ak máte záujem, radi Vám pošleme konkrétne ponuky alebo navrhneme termín krátkeho hovoru.

S pozdravom
Realitka AI`;
}

export type OutreachGenerateOptions = {
  variant?: "A" | "B";
};

export type OutreachEmailResult = {
  subject: string;
  body: string;
  provider: string;
  variant?: "A" | "B";
  totalTokens?: number;
  costEur?: number;
  latencyMs?: number;
  model?: string;
  gatewayTaskId?: string;
};

export { OutreachCostBlockedError };

function buildOutreachPrompt(lead: LeadLike, variant: "A" | "B") {
  const variantHint =
    variant === "B"
      ? "\nVariant B: výrazne kratší text, priamy tón, výzva na 10-minútový telefonát tento týždeň."
      : "\nVariant A: štandardný odborný tón ako vyššie.";

  return `
Napíš stručný profesionálny email v slovenčine pre realitného klienta.
${variantHint}

Klient:
- meno: ${lead.name}
- lokalita: ${lead.location}
- rozpočet: ${lead.budget}
- typ: ${lead.propertyType}
- izby: ${lead.rooms}
- financovanie: ${lead.financing}
- timeline: ${lead.timeline}
- stav: ${lead.status}
- score: ${lead.score}
- poznámka: ${lead.note || "bez poznámky"}

Požiadavky:
- potvrď pochopenie dopytu
- navrhni 1 konkrétny ďalší krok
- bez emoji, bez spamu

Vráť iba JSON:
{"subject":"...","body":"..."}
`;
}

export async function generateOutreachEmail(
  lead: LeadLike,
  options?: OutreachGenerateOptions,
): Promise<OutreachEmailResult> {
  const maxBodyChars = getNumberFromEnv(process.env.OUTREACH_MAX_BODY_CHARS, 900);
  const variant = options?.variant ?? "A";
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    const fallback = fallbackBody(lead);
    return {
      subject: fallbackSubject(lead),
      body: clampText(fallback, maxBodyChars),
      provider: "fallback",
      variant,
      totalTokens: 0,
      costEur: 0,
    };
  }

  const model = getOutreachModel(lead.score);
  const prompt = buildOutreachPrompt(lead, variant);
  const { sanitized: sanitizedPrompt, vault } = sanitizeText(prompt);
  const taskId = `outreach-email-${lead.id}-${Date.now()}`;

  let completion;
  try {
    completion = await completeOutreachLlm({
      taskId,
      prompt: sanitizedPrompt,
      model,
    });
  } catch (err) {
    if (err instanceof OutreachCostBlockedError) {
      throw err;
    }
    const fallback = fallbackBody(lead);
    return {
      subject: fallbackSubject(lead),
      body: clampText(fallback, maxBodyChars),
      provider: "fallback:openai-error",
      variant,
      totalTokens: 0,
      costEur: 0,
    };
  }

  const outputText = rehydrate(completion.text, vault);
  const totalTokens = completion.tokensIn + completion.tokensOut;

  try {
    const parsed = JSON.parse(outputText) as { subject?: string; body?: string };
    const body = String(parsed.body || fallbackBody(lead));
    return {
      subject: parsed.subject || fallbackSubject(lead),
      body: clampText(body, maxBodyChars),
      provider: `openai:${completion.model}`,
      variant,
      totalTokens,
      costEur: completion.costEur,
      latencyMs: completion.ms,
      model: completion.model,
      gatewayTaskId: taskId,
    };
  } catch {
    const fallback = fallbackBody(lead);
    return {
      subject: fallbackSubject(lead),
      body: clampText(fallback, maxBodyChars),
      provider: "fallback:parse",
      variant,
      totalTokens,
      costEur: completion.costEur,
      latencyMs: completion.ms,
      model: completion.model,
      gatewayTaskId: taskId,
    };
  }
}
