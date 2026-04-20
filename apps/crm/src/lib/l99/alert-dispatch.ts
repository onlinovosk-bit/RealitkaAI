import { createClient } from "@/lib/supabase/server";

export async function dispatchPriorityAlert(
  leadId: string,
  briScore: number,
  reasoningString: string
): Promise<void> {
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("name, profile_id, profiles(phone, full_name)")
    .eq("id", leadId)
    .single();

  if (!lead) return;

  const agentPhone = (lead.profiles as { phone?: string } | null)?.phone;
  const alertType = briScore >= 90 ? "critical" : "high";

  const message =
    alertType === "critical"
      ? `🔥 REVOLIS.AI CRITICAL: ${lead.name} dosiahol BRI ${briScore}/100. ${reasoningString} Zavolaj IHNEĎ.`
      : `⚡ REVOLIS.AI: ${lead.name} má BRI ${briScore}/100 – vysoká priorita. ${reasoningString}`;

  // SMS cez Twilio (ak je nakonfigurovaný a agent má telefón)
  if (
    agentPhone &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  ) {
    try {
      const twilio = (await import("twilio")).default;
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_FROM_NUMBER,
        to: agentPhone,
      });
    } catch (err) {
      console.error("SMS dispatch failed:", err);
    }
  }

  await supabase.from("priority_alerts").insert({
    lead_id: leadId,
    bri_score: briScore,
    alert_type: agentPhone ? "sms" : "in_app",
    message,
    delivered: Boolean(agentPhone),
  });
}
