import { createAdminClient } from "@/lib/supabase/server";

export type NotificationType =
  | "seller_rescue"
  | "deal_risk"
  | "ceo_command"
  | "weekly_performance";

export type NotificationPriority = "critical" | "high" | "normal";

export async function createNotification(input: {
  agencyId: string;
  profileId?: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  expiresAt?: Date;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("routine_notifications").insert({
    agency_id: input.agencyId,
    profile_id: input.profileId ?? null,
    type: input.type,
    priority: input.priority,
    title: input.title,
    body: input.body ?? null,
    data: input.data ?? null,
    expires_at: input.expiresAt?.toISOString() ?? null,
  });
  if (error) throw new Error(`Notification insert failed: ${error.message}`);
}

export async function getUnreadNotifications(agencyId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("routine_notifications")
    .select("*")
    .eq("agency_id", agencyId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("routine_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
}
