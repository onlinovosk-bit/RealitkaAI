import { createHmac, timingSafeEqual } from "crypto";
import { STARTER_PACK } from "@/lib/starter-pack/constants";

function signingSecret(): string {
  return (
    process.env.STARTER_PACK_DOWNLOAD_SECRET ??
    process.env.STRIPE_WEBHOOK_SECRET ??
    "dev-starter-pack-download"
  );
}

/** Podpísaný token pre download link v emaile (stripe session id). */
export function createStarterPackDownloadToken(stripeSessionId: string): string {
  const sig = createHmac("sha256", signingSecret())
    .update(stripeSessionId)
    .digest("hex")
    .slice(0, 32);
  const payload = Buffer.from(stripeSessionId, "utf8").toString("base64url");
  return `${payload}.${sig}`;
}

export function verifyStarterPackDownloadToken(token: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  let sessionId: string;
  try {
    sessionId = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = createHmac("sha256", signingSecret())
    .update(sessionId)
    .digest("hex")
    .slice(0, 32);

  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  return sessionId;
}

export function starterPackDownloadUrl(stripeSessionId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const token = createStarterPackDownloadToken(stripeSessionId);
  return `${appUrl}/api/starter-pack/download?token=${encodeURIComponent(token)}`;
}

export function starterPackProductLabel(): string {
  return STARTER_PACK.label;
}
