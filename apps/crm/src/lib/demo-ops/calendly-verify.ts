import crypto from "crypto";

/** Calendly-Webhook-Signature: t=<unix>,v1=<hex hmac> */
export function verifyCalendlySignature(
  rawBody: string,
  signatureHeader: string | null,
  signingKey: string,
  toleranceSec = 300,
): boolean {
  if (!signatureHeader?.trim() || !signingKey.trim()) return false;

  const parts: Record<string, string> = {};
  for (const segment of signatureHeader.split(",")) {
    const eq = segment.indexOf("=");
    if (eq <= 0) continue;
    parts[segment.slice(0, eq).trim()] = segment.slice(eq + 1).trim();
  }

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const ageSec = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSec) || ageSec > toleranceSec) return false;

  const expected = crypto
    .createHmac("sha256", signingKey)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    const a = Buffer.from(signature, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
