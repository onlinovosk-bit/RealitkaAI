import type { SupabaseClient } from "@supabase/supabase-js";

export type HeartbeatSeverity = "ok" | "warning" | "critical";

export type HeartbeatSignal = {
  id: string;
  severity: HeartbeatSeverity;
  title: string;
  detail: string;
  evidence: Record<string, string | number | null>;
};

export type HeartbeatMetrics = {
  agencyScope: string | null;
  untriagedLeads24h: number;
  untriagedLeads7d: number;
  maxAiTriageAt: string | null;
  realviaLastWebhookAt: string | null;
  realviaWebhookTotal: number;
  inboundMailboxCount: number;
  sellerRescueLastNotifAt: string | null;
  sellerRescueLastTaskAt: string | null;
};

export type PlatformHeartbeatResult = {
  ok: boolean;
  checkedAt: string;
  metrics: HeartbeatMetrics;
  signals: HeartbeatSignal[];
  notificationsCreated: number;
};

const MS_24H = 24 * 60 * 60 * 1000;
const MS_7D = 7 * 24 * 60 * 60 * 1000;
const MS_48H = 48 * 60 * 60 * 1000;

function isoHoursAgo(hours: number, now = Date.now()): string {
  return new Date(now - hours * 60 * 60 * 1000).toISOString();
}

function ageMs(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return now - t;
}

/** Pure evaluation — unit-testable without DB. */
export function evaluateHeartbeatSignals(
  metrics: HeartbeatMetrics,
  now = Date.now(),
): HeartbeatSignal[] {
  const signals: HeartbeatSignal[] = [];

  if (metrics.untriagedLeads24h > 0) {
    signals.push({
      id: "triage_untriaged_24h",
      severity: "critical",
      title: "Triage: nové leady bez AI triage (24h)",
      detail: `${metrics.untriagedLeads24h} lead(ov) vytvorených za 24h nemá ai_triage_at — inline triage alebo cron môže byť mŕtvy.`,
      evidence: {
        untriagedLeads24h: metrics.untriagedLeads24h,
        maxAiTriageAt: metrics.maxAiTriageAt,
      },
    });
  } else if (metrics.untriagedLeads7d > 0) {
    signals.push({
      id: "triage_backlog_7d",
      severity: "warning",
      title: "Triage: backlog do 7 dní",
      detail: `${metrics.untriagedLeads7d} lead(ov) starších ako 24h stále bez ai_triage_at.`,
      evidence: {
        untriagedLeads7d: metrics.untriagedLeads7d,
        maxAiTriageAt: metrics.maxAiTriageAt,
      },
    });
  }

  if (
    metrics.inboundMailboxCount > 0 &&
    metrics.realviaWebhookTotal > 0
  ) {
    const webhookAge = ageMs(metrics.realviaLastWebhookAt, now);
    if (webhookAge === null || webhookAge > MS_7D) {
      signals.push({
        id: "realvia_webhook_stale_7d",
        severity: "warning",
        title: "Realvia/webhook: žiadna stopa 7+ dní",
        detail:
          "Aktívna inbound schránka existuje a webhooky už kedysi prišli, ale posledná stopa je staršia ako 7 dní.",
        evidence: {
          inboundMailboxCount: metrics.inboundMailboxCount,
          realviaLastWebhookAt: metrics.realviaLastWebhookAt,
          realviaWebhookTotal: metrics.realviaWebhookTotal,
        },
      });
    }
  }

  const rescueNotifAge = ageMs(metrics.sellerRescueLastNotifAt, now);
  const rescueTaskAge = ageMs(metrics.sellerRescueLastTaskAt, now);
  const rescueSilent =
    (rescueNotifAge === null || rescueNotifAge > MS_48H) &&
    (rescueTaskAge === null || rescueTaskAge > MS_48H);

  if (rescueSilent && metrics.untriagedLeads7d === 0) {
    // Len ak triage beží — inak je seller-rescue sekundárny signál.
    signals.push({
      id: "seller_rescue_silent_48h",
      severity: "warning",
      title: "Seller-rescue: ticho 48h+",
      detail:
        "Žiadna seller_rescue notifikácia ani úloha za 48h — cron môže byť mŕtvy alebo nie sú kandidáti (over Vercel cron logy).",
      evidence: {
        sellerRescueLastNotifAt: metrics.sellerRescueLastNotifAt,
        sellerRescueLastTaskAt: metrics.sellerRescueLastTaskAt,
      },
    });
  }

  return signals;
}

async function safeCount(
  supabase: SupabaseClient,
  table: string,
  apply?: (q: ReturnType<SupabaseClient["from"]>) => ReturnType<SupabaseClient["from"]>,
): Promise<number> {
  try {
    let query = supabase.from(table).select("*", { count: "exact", head: true });
    if (apply) query = apply(query);
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function latestIso(
  supabase: SupabaseClient,
  table: string,
  column: string,
  apply?: (q: ReturnType<SupabaseClient["from"]>) => ReturnType<SupabaseClient["from"]>,
): Promise<string | null> {
  try {
    let query = supabase.from(table).select(column).order(column, { ascending: false }).limit(1);
    if (apply) query = apply(query);
    const { data, error } = await query;
    if (error || !data?.[0]) return null;
    const row = data[0] as Record<string, string | null>;
    return row[column] ?? null;
  } catch {
    return null;
  }
}

export async function collectHeartbeatMetrics(
  supabase: SupabaseClient,
  agencyId?: string | null,
): Promise<HeartbeatMetrics> {
  const cutoff24h = isoHoursAgo(24);
  const cutoff7d = isoHoursAgo(24 * 7);

  const agencyFilter = (q: ReturnType<SupabaseClient["from"]>) =>
    agencyId ? q.eq("agency_id", agencyId) : q;

  const [untriagedLeads24h, untriagedLeads7d, maxAiTriageAt, realviaLastWebhookAt, realviaWebhookTotal, inboundMailboxCount, sellerRescueLastNotifAt, sellerRescueLastTaskAt] =
    await Promise.all([
      safeCount(supabase, "leads", (q) =>
        agencyFilter(q).is("ai_triage_at", null).gte("created_at", cutoff24h),
      ),
      safeCount(supabase, "leads", (q) =>
        agencyFilter(q).is("ai_triage_at", null).gte("created_at", cutoff7d),
      ),
      latestIso(supabase, "leads", "ai_triage_at", (q) => {
        let query = q.not("ai_triage_at", "is", null);
        if (agencyId) query = query.eq("agency_id", agencyId);
        return query;
      }),
      latestIso(supabase, "realvia_webhook_logs", "created_at", (q) =>
        agencyId ? q.eq("agency_id", agencyId) : q,
      ),
      safeCount(supabase, "realvia_webhook_logs", (q) =>
        agencyId ? q.eq("agency_id", agencyId) : q,
      ),
      safeCount(supabase, "inbound_mailboxes", (q) => {
        let query = q.eq("active", true);
        if (agencyId) query = query.eq("agency_id", agencyId);
        return query;
      }),
      latestIso(supabase, "routine_notifications", "created_at", (q) => {
        let query = q.eq("type", "seller_rescue");
        if (agencyId) query = query.eq("agency_id", agencyId);
        return query;
      }),
      latestIso(supabase, "tasks", "created_at", (q) =>
        q.ilike("title", "Seller Rescue%"),
      ),
    ]);

  return {
    agencyScope: agencyId ?? null,
    untriagedLeads24h,
    untriagedLeads7d,
    maxAiTriageAt,
    realviaLastWebhookAt,
    realviaWebhookTotal,
    inboundMailboxCount,
    sellerRescueLastNotifAt,
    sellerRescueLastTaskAt,
  };
}

export async function hasRecentHeartbeatAlert(
  supabase: SupabaseClient,
  agencyId: string,
  signalId: string,
  withinHours = 24,
): Promise<boolean> {
  const since = isoHoursAgo(withinHours);
  const { data, error } = await supabase
    .from("routine_notifications")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("type", "ceo_command")
    .gte("created_at", since)
    .contains("data", { heartbeatId: signalId })
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}

export async function runPlatformHeartbeat(input: {
  supabase: SupabaseClient;
  notifyAgencyId: string;
  agencyScope?: string | null;
  notify?: boolean;
}): Promise<PlatformHeartbeatResult> {
  const metrics = await collectHeartbeatMetrics(input.supabase, input.agencyScope);
  const signals = evaluateHeartbeatSignals(metrics);
  const checkedAt = new Date().toISOString();
  let notificationsCreated = 0;

  if (input.notify !== false) {
    for (const signal of signals.filter((s) => s.severity !== "ok")) {
      const duplicate = await hasRecentHeartbeatAlert(
        input.supabase,
        input.notifyAgencyId,
        signal.id,
      );
      if (duplicate) continue;

      const { error } = await input.supabase.from("routine_notifications").insert({
        agency_id: input.notifyAgencyId,
        profile_id: null,
        type: "ceo_command",
        priority: signal.severity === "critical" ? "critical" : "high",
        title: `Heartbeat: ${signal.title}`,
        body: signal.detail,
        data: {
          heartbeatId: signal.id,
          severity: signal.severity,
          evidence: signal.evidence,
          checkedAt,
        },
      });
      if (!error) notificationsCreated += 1;
    }
  }

  return {
    ok: signals.every((s) => s.severity === "ok"),
    checkedAt,
    metrics,
    signals,
    notificationsCreated,
  };
}
