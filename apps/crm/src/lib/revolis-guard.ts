/**
 * revolisGuard — HMAC-SHA256 autentifikácia pre cron/internal API routes.
 *
 * Volajúci musí poslať tieto headery:
 *   x-revolis-timestamp : Unix timestamp v sekundách (string)
 *   x-revolis-signature : hex(HMAC-SHA256(timestamp + "." + pathname, CRON_SECRET))
 *
 * Ochrana:
 * - Signature je viazaná na path — replay na iný endpoint zlyhá
 * - Timestamp nesmie byť starší ako 5 minút — replay attack okno je malé
 * - Secret nie je nikdy v URL — neobjaví sa v logoch
 *
 * Príklad generovania (Node.js / Vercel cron caller):
 *   const ts = Math.floor(Date.now() / 1000).toString();
 *   const sig = crypto.createHmac('sha256', CRON_SECRET).update(`${ts}.${pathname}`).digest('hex');
 *   headers: { 'x-revolis-timestamp': ts, 'x-revolis-signature': sig }
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const CLOCK_SKEW_S = 300; // 5 minút

function signPayload(timestamp: string, pathname: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${pathname}`)
    .digest("hex");
}

export async function revolisGuard(
  req: NextRequest,
  taskName: string,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    console.error(`[revolisGuard] CRON_SECRET nie je nastavený!`);
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const timestamp = req.headers.get("x-revolis-timestamp");
  const signature = req.headers.get("x-revolis-signature");

  if (!timestamp || !signature) {
    console.error(`[revolisGuard] ${taskName}: chýbajú auth headery`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Kontrola čerstvosti timestampu
  const tsNum = parseInt(timestamp, 10);
  if (Number.isNaN(tsNum)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const nowS = Math.floor(Date.now() / 1000);
  if (Math.abs(nowS - tsNum) > CLOCK_SKEW_S) {
    console.error(`[revolisGuard] ${taskName}: timestamp mimo okna (skew ${nowS - tsNum}s)`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verifikácia podpisu — timing-safe
  const { pathname } = new URL(req.url);
  const expected = signPayload(timestamp, pathname, secret);

  let signatureOk = false;
  try {
    signatureOk = timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    signatureOk = false;
  }

  if (!signatureOk) {
    console.error(`[revolisGuard] ${taskName}: neplatný podpis`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Handler
  try {
    return await handler();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[revolisGuard] Chyba v ${taskName}:`, msg);

    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackUrl) {
      await fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `*ERROR: Revolis Engine*\n*Úloha:* ${taskName}\n*Chyba:* ${msg}`,
          username: "Revolis Guard",
        }),
      }).catch(() => undefined); // nechceme kaskádovú chybu
    }

    return NextResponse.json({ error: "Server Error", msg }, { status: 500 });
  }
}
