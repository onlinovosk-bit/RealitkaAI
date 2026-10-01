import { createServiceRoleClient } from "@/lib/supabase/admin";
import { generateStarterPackRedemptionCode } from "@/lib/starter-pack/code-generator";
import {
  starterPackDownloadUrl,
  starterPackProductLabel,
} from "@/lib/starter-pack/download-token";
import { STARTER_PACK } from "@/lib/starter-pack/constants";

export type StarterPackFulfillmentInput = {
  stripeSessionId: string;
  customerEmail?: string | null;
};

export type StarterPackFulfillmentResult = {
  code: string;
  downloadUrl: string;
  skipped: boolean;
};

/** Idempotent: webhook → kód + email s download linkom. */
export async function fulfillStarterPackPurchase(
  input: StarterPackFulfillmentInput,
): Promise<StarterPackFulfillmentResult | null> {
  const supabase = createServiceRoleClient();
  if (!supabase || !input.stripeSessionId) return null;

  const { data: existing } = await supabase
    .from("credit_redemption_codes")
    .select("code")
    .eq("stripe_session_id", input.stripeSessionId)
    .maybeSingle();

  if (existing?.code) {
    return {
      code: existing.code,
      downloadUrl: starterPackDownloadUrl(input.stripeSessionId),
      skipped: true,
    };
  }

  const code = generateStarterPackRedemptionCode();
  const { error } = await supabase.from("credit_redemption_codes").insert({
    code,
    value: STARTER_PACK.creditValue,
    stripe_session_id: input.stripeSessionId,
    purchaser_email: input.customerEmail ?? null,
  });

  if (error) {
    console.warn("[starter-pack] code insert:", error.message);
    return null;
  }

  const downloadUrl = starterPackDownloadUrl(input.stripeSessionId);
  await sendStarterPackDeliveryEmail({
    customerEmail: input.customerEmail,
    code,
    downloadUrl,
  });

  return { code, downloadUrl, skipped: false };
}

async function sendStarterPackDeliveryEmail(input: {
  customerEmail?: string | null;
  code: string;
  downloadUrl: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SUPPORT_FROM_EMAIL ?? process.env.OUTREACH_FROM_EMAIL;
  if (!apiKey || !from || !input.customerEmail) return;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#f9fafb;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">${starterPackProductLabel()} — tvoj obsah</h2>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
      Ďakujeme za nákup. Nižšie nájdeš odkaz na stiahnutie balíka (šablóny, checklisty, návod)
      a kreditový kód na Revolis.
    </p>
    <p style="margin:0 0 8px;color:#111827;font-size:14px;font-weight:600;">Stiahnuť balík:</p>
    <a href="${input.downloadUrl}"
       style="display:inline-block;margin-bottom:20px;background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;">
      Otvoriť balík (HTML / tlač do PDF)
    </a>
    <p style="margin:0 0 8px;color:#111827;font-size:14px;font-weight:600;">Kreditový kód (${STARTER_PACK.creditValue} € na Revolis):</p>
    <p style="margin:0 0 16px;font-family:monospace;font-size:18px;font-weight:700;color:#0284c7;">${input.code}</p>
    <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;">
      Po registrácii v Revolise zadaj kód v sekcii Upgrade alebo počas onboardingu
      (pole „Mám kód z balíka"). Kredity neexpirujú.
    </p>
    <p style="margin-top:24px;font-size:12px;color:#9ca3af;">DRAFT — text vyžaduje schválenie Andy pred finálnym release.</p>
  </div>
</body>
</html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: input.customerEmail,
        subject: "Revolis — štartovací balík: stiahnutie a kreditový kód",
        html,
      }),
    });
  } catch {
    // non-critical
  }
}
