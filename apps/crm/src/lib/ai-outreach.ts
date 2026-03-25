import OpenAI from "openai";

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

export async function generateOutreachEmail(lead: LeadLike) {
  const client = getOpenAIClient();
  const maxBodyChars = getNumberFromEnv(process.env.OUTREACH_MAX_BODY_CHARS, 900);

  if (!client) {
    const fallback = fallbackBody(lead);
    return {
      subject: fallbackSubject(lead),
      body: clampText(fallback, maxBodyChars),
      provider: "fallback",
    };
  }

  const prompt = `
Napíš stručný profesionálny email v slovenčine pre realitného klienta.

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

  let response: OpenAI.Responses.Response | null = null;

  try {
    response = await client.responses.create({
      model,
      input: prompt,
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
    };
  }

  const outputText =
    response?.output_text ||
    '{"subject":"Ponuka nehnuteľnosti","body":"Dobrý deň, radi Vám pomôžeme s výberom nehnuteľnosti."}';

  try {
    const parsed = JSON.parse(outputText);
    const body = String(parsed.body || fallbackBody(lead));
    return {
      subject: parsed.subject || fallbackSubject(lead),
      body: clampText(body, maxBodyChars),
      provider: `openai:${model}`,
    };
  } catch {
    const fallback = fallbackBody(lead);
    return {
      subject: fallbackSubject(lead),
      body: clampText(fallback, maxBodyChars),
      provider: "fallback",
    };
  }
}
