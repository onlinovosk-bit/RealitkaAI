import { z } from "zod";
import { errorResponse, okResponse } from "@/lib/api-response";
import { validateBody } from "@/lib/api-validate";
import { rateLimit } from "@/lib/rate-limit";
import { incrementUsageMetric, SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";
import { POST as captureLead } from "../capture-lead/route";

/**
 * Verejný vstup pre HeroEmailCapture a AiOdhadca.
 *
 * Prehliadač sem posiela len údaje formulára. `DEMO_CAPTURE_API_KEY` ostáva
 * v serverovom env a ide do existujúceho capture-lead handlera ako hlavička
 * v tom istom procese — žiadny HTTP hovor von a žiadny kľúč v klientskom JS.
 *
 * Ochrana, ktorá tu naozaj je:
 * - Zod validácia pred akýmkoľvek zápisom.
 * - Honeypot `website` (rovnaký vzor ako registrácia): neprázdne pole vráti
 *   200 a capture-lead sa nezavolá. Nie je to captcha.
 * - `rateLimit` (Supabase RPC). Keď chýba service role alebo RPC vráti chybu,
 *   helper vráti `allowed: true` (fail-open). V tom prípade tu tvrdý strop nie je.
 * - `x-forwarded-for` berieme ako prvý hop. Platforma ho má prepísať; ak nie,
 *   klient si ho vie podvrhnúť.
 */
const SOURCES = [
  "ai_odhadca",
  "neighborhood_watch",
  "digital_twin",
  "hero_email_capture",
] as const;

const IP_LIMIT = 8;
const IP_WINDOW_MS = 60_000;
const EMAIL_LIMIT = 3;
const EMAIL_WINDOW_MS = 3_600_000;

const PublicCaptureSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  address: z.string().trim().max(500).optional(),
  source: z.enum(SOURCES),
  estimatedPrice: z.number().finite().nonnegative().max(1_000_000_000_000).optional(),
  gdprConsent: z.literal(true),
  website: z.string().max(200).optional(),
});

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const raw = forwarded || realIp || "unknown";
  return raw.slice(0, 200) || "unknown";
}

export async function POST(request: Request) {
  const parsed = await validateBody(request, PublicCaptureSchema);
  if (!parsed.ok) return parsed.response;

  const honeypot = (parsed.data.website ?? "").trim();
  if (honeypot.length > 0) {
    return okResponse({ duplicate: false });
  }

  const ip = clientIp(request);
  const ipLimit = await rateLimit(`demo-public-capture:ip:${ip}`, IP_LIMIT, IP_WINDOW_MS);
  if (!ipLimit.allowed) {
    return errorResponse("Too many requests.", 429);
  }

  const emailLimit = await rateLimit(
    `demo-public-capture:email:${parsed.data.email}`,
    EMAIL_LIMIT,
    EMAIL_WINDOW_MS,
  );
  if (!emailLimit.allowed) {
    return errorResponse("Too many requests.", 429);
  }

  const apiKey = process.env.DEMO_CAPTURE_API_KEY;
  if (!apiKey) {
    return errorResponse("Service unavailable", 503);
  }

  const payload: {
    email: string;
    source: (typeof SOURCES)[number];
    gdprConsent: true;
    address?: string;
    estimatedPrice?: number;
  } = {
    email: parsed.data.email,
    source: parsed.data.source,
    gdprConsent: true,
  };
  if (parsed.data.address) payload.address = parsed.data.address;
  if (parsed.data.estimatedPrice !== undefined) {
    payload.estimatedPrice = parsed.data.estimatedPrice;
  }

  const upstream = await captureLead(
    new Request("http://internal/api/demo/capture-lead", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    }),
  );

  if (upstream.ok) {
    await incrementUsageMetric({
      agencyId: SYSTEM_USAGE_AGENCY_ID,
      metric: "demo_public_capture",
    });
  }

  return upstream;
}
