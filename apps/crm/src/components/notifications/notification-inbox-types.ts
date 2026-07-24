export type InboxNotification = {
  id: string;
  type: string;
  priority: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

export type InboxFilter = "all" | "unread" | "read";

export type InboxScope = "owner" | "agent";

export function filterInboxNotifications(
  items: InboxNotification[],
  filter: InboxFilter,
): InboxNotification[] {
  if (filter === "unread") return items.filter((n) => !n.read_at);
  if (filter === "read") return items.filter((n) => Boolean(n.read_at));
  return items;
}

export function countUnread(items: InboxNotification[]): number {
  return items.filter((n) => !n.read_at).length;
}

export function typeLabel(type: string): string {
  if (type === "ceo_command") return "CEO Command";
  if (type === "seller_rescue") return "Seller Rescue";
  if (type === "deal_risk") return "Riziko obchodu";
  if (type === "weekly_performance") return "Týždenný výkon";
  return type;
}

export function priorityLabel(priority: string): string {
  if (priority === "critical") return "Kritické";
  if (priority === "high") return "Vysoká";
  return "Normálna";
}

export function formatInboxWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("sk-SK", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
