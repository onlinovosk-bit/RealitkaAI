/**
 * Pošle email notifikáciu adminovi/tímu keď príde nový lead z buyer onboardingu.
 * Používa Resend. Non-blocking — zavolaj fire-and-forget.
 */

type LeadNotifyInput = {
  leadName: string;
  leadEmail: string;
  segment: string;
  readinessScore: number;
  city: string;
  budget: string;
  focusText?: string;
  leadUrl: string;
};

export async function notifyNewBuyerLead(input: LeadNotifyInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.NOTIFY_EMAIL || process.env.OUTREACH_FROM_EMAIL;

  if (!apiKey || !notifyEmail) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm-two-tawny.vercel.app";

  const scoreColor = input.readinessScore >= 70 ? "#16a34a" : input.readinessScore >= 40 ? "#d97706" : "#6b7280";

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#f9fafb;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="margin:0 0 4px;font-size:20px;color:#111827;">Nový buyer lead</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Práve vyplnil formulár na buyer onboardingu</p>

    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#6b7280;width:130px;">Meno</td><td style="padding:8px 0;font-weight:600;color:#111827;">${input.leadName}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Email</td><td style="padding:8px 0;color:#111827;">${input.leadEmail}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Segment</td><td style="padding:8px 0;color:#111827;">${input.segment}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Lokalita</td><td style="padding:8px 0;color:#111827;">${input.city || "—"}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Rozpočet</td><td style="padding:8px 0;color:#111827;">${input.budget || "—"}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">AI skóre</td><td style="padding:8px 0;font-weight:700;color:${scoreColor};">${input.readinessScore}/100</td></tr>
      ${input.focusText ? `<tr><td style="padding:8px 0;color:#6b7280;vertical-align:top;">Fokus</td><td style="padding:8px 0;color:#111827;">${input.focusText}</td></tr>` : ""}
    </table>

    <a href="${appUrl}${input.leadUrl}"
       style="display:inline-block;margin-top:24px;background:#111827;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;">
      Otvoriť lead v CRM →
    </a>

    <p style="margin-top:24px;font-size:12px;color:#9ca3af;">Revolis.AI · automatická notifikácia</p>
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
        from: process.env.OUTREACH_FROM_EMAIL ?? "noreply@revolis.ai",
        to: notifyEmail,
        subject: `Nový lead: ${input.leadName} · skóre ${input.readinessScore}/100`,
        html,
      }),
    });
  } catch {
    // never throw — notification is non-critical
  }
}
