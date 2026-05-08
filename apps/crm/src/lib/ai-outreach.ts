import OpenAI from "openai";
import { sanitizeText, rehydrate } from "@/lib/ai/sanitize";

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

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

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
};

export async function generateOutreachEmail(
  lead: LeadLike,
  options?: OutreachGenerateOptions
): Promise<OutreachEmailResult> {
  const client = getOpenAIClient();
  const maxBodyChars = getNumberFromEnv(process.env.OUTREACH_MAX_BODY_CHARS, 900);
  const variant = options?.variant ?? "A";

  if (!client) {
    const fallback = fallbackBody(lead);
    return {
      subject: fallbackSubject(lead),
      body: clampText(fallback, maxBodyChars),
      provider: "fallback",
      variant,
      totalTokens: 0,
    };
  }

  const variantHint =
    variant === "B"
      ? "\nVariant B: výrazne kratší text, priamy tón, výzva na 10-minútový telefonát tento týždeň."
      : "\nVariant A: štandardný odborný tón ako vyššie.";

  const prompt = `
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

  const model = getOutreachModel(lead.score);
  const maxOutputTokens = getNumberFromEnv(process.env.OUTREACH_MAX_OUTPUT_TOKENS, 220);

  const { sanitized: sanitizedPrompt, vault } = sanitizeText(prompt);
  let response: OpenAI.Responses.Response | null = null;

  try {
    response = await client.responses.create({
      model,
      input: sanitizedPrompt,
      max_output_tokens: maxOutputTokens,
      text: {
        format: {
          type: "json_schema",
          name: "outreach_email",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              subject: { type: "string" },
              body: { type: "string" }
            },
            required: ["subject", "body"]
          }
        }
      }
    });
  } catch (error) {
    const fallback = fallbackBody(lead);
    const isQuotaError =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      Number((error as any).status) === 429;

    return {
      subject: fallbackSubject(lead),
      body: clampText(fallback, maxBodyChars),
      provider: isQuotaError ? "fallback:openai-quota" : "fallback:openai-error",
      variant,
      totalTokens: 0,
    };
  }

  const usage = (response as unknown as { usage?: { total_tokens?: number } })?.usage;
  const totalTokens = usage?.total_tokens;

  const rawOutput =
    response?.output_text ||
    '{"subject":"Ponuka nehnuteľnosti","body":"Dobrý deň, radi Vám pomôžeme s výberom nehnuteľnosti."}';
  const outputText = rehydrate(rawOutput, vault);

  try {
    const parsed = JSON.parse(outputText);
    const body = String(parsed.body || fallbackBody(lead));
    return {
      subject: parsed.subject || fallbackSubject(lead),
      body: clampText(body, maxBodyChars),
      provider: `openai:${model}`,
      variant,
      totalTokens,
    };
  } catch {
    const fallback = fallbackBody(lead);
    return {
      subject: fallbackSubject(lead),
      body: clampText(fallback, maxBodyChars),
      provider: "fallback",
      variant,
      totalTokens,
    };
  }
}
