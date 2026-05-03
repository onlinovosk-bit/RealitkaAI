import { sendOnboardingEmail } from "@/lib/send-onboarding-email";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type MessageDay = "d1" | "d3" | "d7";

const DAY_TO_TEMPLATE: Record<MessageDay, "welcome" | "crm" | "ai"> = {
  d1: "welcome",
  d3: "crm",
  d7: "ai",
};

export interface DispatchResult {
  processed: number;
  sent: number;
  failed: number;
}

type DueRow = {
  id: string;
  message_day: MessageDay;
  attempts: number;
  client_onboarding_progress: Array<{ contact_email: string; contact_name: string | null }> | null;
};

export async function runOnboardingDispatch(): Promise<DispatchResult> {
  const supabase = createServiceRoleClient();
  if (!supabase) throw new Error("Service role nie je nakonfigurovaný.");

  const nowIso = new Date().toISOString();

  const { data: pendingRows, error: pendingError } = await supabase
    .from("client_onboarding_messages")
    .select("id, progress_id, message_day, attempts, client_onboarding_progress(contact_email, contact_name)")
    .eq("status", "pending")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (pendingError) throw new Error(pendingError.message);

  const { data: failedRows, error: failedError } = await supabase
    .from("client_onboarding_messages")
    .select("id, progress_id, message_day, attempts, client_onboarding_progress(contact_email, contact_name)")
    .eq("status", "failed")
    .lt("attempts", 3)
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (failedError) throw new Error(failedError.message);

  const dueRows: DueRow[] = [
    ...((pendingRows ?? []) as DueRow[]),
    ...((failedRows ?? []) as DueRow[]),
  ];

  if (dueRows.length === 0) return { processed: 0, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const row of dueRows) {
    const profile = Array.isArray(row.client_onboarding_progress)
      ? row.client_onboarding_progress[0]
      : null;
    const email = profile?.contact_email?.trim();
    const name = profile?.contact_name?.trim() || "Partner";

    if (!email) {
      failed += 1;
      await supabase
        .from("client_onboarding_messages")
        .update({
          status: "failed",
          attempts: (row.attempts ?? 0) + 1,
          last_error: "missing_contact_email",
        })
        .eq("id", row.id);
      continue;
    }

    const result = await sendOnboardingEmail(DAY_TO_TEMPLATE[row.message_day], email, name, "/dashboard");
    if (result.ok) {
      sent += 1;
      await supabase
        .from("client_onboarding_messages")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          attempts: (row.attempts ?? 0) + 1,
          last_error: null,
        })
        .eq("id", row.id);
    } else {
      failed += 1;
      await supabase
        .from("client_onboarding_messages")
        .update({
          status: "failed",
          attempts: (row.attempts ?? 0) + 1,
          last_error: result.error instanceof Error ? result.error.message : "dispatch_failed",
        })
        .eq("id", row.id);
    }
  }

  return { processed: dueRows.length, sent, failed };
}
