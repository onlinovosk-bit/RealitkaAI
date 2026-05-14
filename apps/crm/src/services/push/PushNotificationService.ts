import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/server";

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!pub || !priv) {
    return false;
  }
  if (!vapidConfigured) {
    webpush.setVapidDetails("mailto:admin@revolis.ai", pub, priv);
    vapidConfigured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureVapidConfigured()) {
    return { sent: 0 };
  }

  const supabase = createAdminClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs?.length) return { sent: 0 };

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? "/icons/revolis-192.png",
    badge: payload.badge ?? "/icons/revolis-badge-72.png",
    url: payload.url ?? "/leads",
    tag: payload.tag ?? "revolis-default",
    vibrate: [200, 100, 200],
  });

  let sent = 0;
  const stale: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notification
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) stale.push(sub.endpoint);
      }
    })
  );

  if (stale.length) {
    await supabase.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return { sent };
}

export async function notifyHotLead(userId: string, leadName: string, leadId: string) {
  return sendPushToUser(userId, {
    title: "HOT lead — okamžitá akcia",
    body: `${leadName} je pripravený na ponuku. Konaj teraz.`,
    url: `/leads/${leadId}`,
    tag: `hot-lead-${leadId}`,
  });
}

export async function notifyDailyPlaybook(userId: string, taskCount: number) {
  return sendPushToUser(userId, {
    title: "Tvoj denný plán je pripravený",
    body: `${taskCount} úloh na dnes. Otvor plán a začni.`,
    url: "/playbook",
    tag: "daily-playbook",
  });
}
