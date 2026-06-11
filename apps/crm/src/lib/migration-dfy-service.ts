import { createServiceRoleClient } from "@/lib/supabase/admin";
import { MIGRATION_DFY } from "@/lib/program-tier-pricing";

export type MigrationDfyOrderInput = {
  agencyId: string;
  stripeSessionId: string;
  customerEmail?: string | null;
};

/** Idempotent zápis service_orders po úspešnom seat checkoute s migration bump. */
export async function recordMigrationDfyServiceOrder(
  input: MigrationDfyOrderInput,
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase || !input.agencyId || !input.stripeSessionId) return false;

  const { data: existing } = await supabase
    .from("service_orders")
    .select("id")
    .eq("stripe_session_id", input.stripeSessionId)
    .maybeSingle();

  if (existing) return true;

  const paidAt = new Date().toISOString();
  const { error } = await supabase.from("service_orders").insert({
    agency_id: input.agencyId,
    type: MIGRATION_DFY.type,
    status: "requested",
    paid_at: paidAt,
    stripe_session_id: input.stripeSessionId,
  });

  if (error) {
    console.warn("[migration-dfy] service_order insert:", error.message);
    return false;
  }

  await Promise.all([
    notifyAndyMigrationDfy({ ...input, paidAt }),
    sendMigrationDfyCustomerConfirmation(input.customerEmail),
  ]);

  return true;
}

async function notifyAndyMigrationDfy(input: {
  agencyId: string;
  stripeSessionId: string;
  customerEmail?: string | null;
  paidAt: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.NOTIFY_EMAIL || process.env.OUTREACH_FROM_EMAIL;
  if (!apiKey || !notifyEmail) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm-two-tawny.vercel.app";
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#f9fafb;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Nová DFY migrácia — kontaktuj zákazníka</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Zákazník si pri seat checkoute dokúpil migráciu dát (${MIGRATION_DFY.priceEur} €).</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Agency ID</td><td style="padding:8px 0;color:#111827;">${input.agencyId}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Email zákazníka</td><td style="padding:8px 0;color:#111827;">${input.customerEmail ?? "—"}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Stripe session</td><td style="padding:8px 0;color:#111827;font-size:12px;">${input.stripeSessionId}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Zaplatené</td><td style="padding:8px 0;color:#111827;">${input.paidAt}</td></tr>
    </table>
    <a href="${appUrl}/billing"
       style="display:inline-block;margin-top:24px;background:#111827;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;">
      Otvoriť CRM →
    </a>
    <p style="margin-top:24px;font-size:12px;color:#9ca3af;">Revolis.AI · DFY migrácia (Andy review)</p>
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
        subject: "Nová DFY migrácia — kontaktuj zákazníka",
        html,
      }),
    });
  } catch {
    // non-critical
  }
}

/** Draft potvrdenie zákazníkovi — text na Andy review pred produkciou. */
async function sendMigrationDfyCustomerConfirmation(
  customerEmail?: string | null,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SUPPORT_FROM_EMAIL ?? process.env.OUTREACH_FROM_EMAIL;
  if (!apiKey || !from || !customerEmail) return;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#f9fafb;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Migrácia dát — ďalší krok</h2>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
      Ďakujeme za objednávku služby „Prenesieme vaše dáta za vás“. Do 48 hodín od doručenia exportu
      budú vaše kontakty v Revolise skontrolované a zoradené.
    </p>
    <p style="margin:0 0 8px;color:#111827;font-size:14px;font-weight:600;">Čo nám pošlete:</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#374151;font-size:14px;line-height:1.6;">
      <li>Export kontaktov z vášho portálu alebo CRM (CSV alebo JSON)</li>
      <li>Krátku poznámku, odkiaľ dáta pochádzajú (napr. Nehnutelnosti.sk, Realsoft…)</li>
    </ul>
    <p style="margin:0 0 8px;color:#111827;font-size:14px;font-weight:600;">Kam poslať:</p>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;">
      Odpovedzte na tento email alebo pošlite export na
      <a href="mailto:support@revolis.ai" style="color:#2563eb;">support@revolis.ai</a>
      s predmetom „Migrácia dát — [názov kancelárie]“.
    </p>
    <p style="margin:0;font-size:12px;color:#9ca3af;">DRAFT — text vyžaduje schválenie Andy pred finálnym release.</p>
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
        to: customerEmail,
        subject: "Revolis — migrácia dát: čo nám poslať",
        html,
      }),
    });
  } catch {
    // non-critical
  }
}
