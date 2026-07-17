import { createAdminClient } from "@/lib/supabase/server";

export type NotificationType =
  | "seller_rescue"
  | "deal_risk"
  | "ceo_command"
  | "weekly_performance"
  | "new_lead";

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

export type RoutineNotificationRow = {
  id: string;
  agency_id: string;
  profile_id: string | null;
  type: string;
  priority: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
};

export async function getCeoCommandNotifications(
  agencyId: string,
  limit = 30,
): Promise<RoutineNotificationRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("routine_notifications")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("type", "ceo_command")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as RoutineNotificationRow[];
}
