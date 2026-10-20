import type { SupabaseClient } from "@supabase/supabase-js";
import { GUARDIAN_RUNNER_NOTIFICATION_TYPE } from "@/lib/guardian/config";
import { sendCriticalHeartbeatEmail } from "@/lib/infra/notification-delivery";
import { SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";

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
  /**
   * Front rady a posledný beh workera. `realvia_processing_queue` NEMÁ
   * `agency_id` (viď baseline migráciu), takže tieto tri sú platformové —
   * neriadia sa `agencyScope`. Properties sa naopak scopovať dajú.
   */
  realviaQueuePending: number;
  realviaQueueFailed: number;
  realviaLastWorkerRunAt: string | null;
  realviaPropertiesUpdated24h: number;
  inboundMailboxCount: number;
  sellerRescueLastNotifAt: string | null;
  sellerRescueLastTaskAt: string | null;
  moatCaptureTriage24h: number;
  moatCaptureNba24h: number;
  moatCaptureAiEmail24h: number;
  moatDealOutcomes24h: number;
  guardianLastRunAt: string | null;
  guardianOpenFindings: number;
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
const MS_2H = 2 * 60 * 60 * 1000;

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

  // Realvia silence: independent of inbound mailbox count (Brief 18 V2 / Strážca prítoku).
  // 48h → warning; 7d → critical. Only if this tenant has ever received webhooks.
  if (metrics.realviaWebhookTotal > 0) {
    const webhookAge = ageMs(metrics.realviaLastWebhookAt, now);
    if (webhookAge === null || webhookAge > MS_7D) {
      signals.push({
        id: "realvia_webhook_stale_7d",
        severity: "critical",
        title: "Realvia/webhook: žiadna stopa 7+ dní",
        detail:
          "Webhooky už kedysi prišli, ale posledná stopa je staršia ako 7 dní — prítok môže byť mŕtvy.",
        evidence: {
          realviaLastWebhookAt: metrics.realviaLastWebhookAt,
          realviaWebhookTotal: metrics.realviaWebhookTotal,
        },
      });
    } else if (webhookAge > MS_48H) {
      signals.push({
        id: "realvia_webhook_stale_48h",
        severity: "warning",
        title: "Realvia/webhook: žiadna stopa 48h+",
        detail:
          "Posledný Realvia webhook je starší ako 48 hodín — overiť sync pred eskaláciou na critical.",
        evidence: {
          realviaLastWebhookAt: metrics.realviaLastWebhookAt,
          realviaWebhookTotal: metrics.realviaWebhookTotal,
        },
      });
    }
  }

  // Realvia worker a front rady (REALVIA-SEC-01). Doteraz heartbeat videl len
  // to, či webhooky PRICHÁDZAJÚ — nie to, či ich niekto SPRACÚVA. Prítok môže
  // byť živý a properties sa pritom neaktualizujú celé dni.
  //
  // Rovnaká brána ako pri signáloch vyššie: bez jediného webhooku v histórii
  // tenant Realviu nepoužíva a ticho je správny stav, nie porucha.
  if (metrics.realviaWebhookTotal > 0) {
    // `max_retries` je 3 — čo spadlo do `failed`, vyčerpalo opakovania a samo
    // sa už nepohne. Jediný taký job je strata dát, preto prah 1, nie výmysel.
    if (metrics.realviaQueueFailed > 0) {
      signals.push({
        id: "realvia_queue_failed_jobs",
        severity: "critical",
        title: "Realvia front: joby po vyčerpaní opakovaní",
        detail: `${metrics.realviaQueueFailed} job(ov) v stave failed — payload je uložený, ale nič ho nespracuje. Replay: GET /api/cron/realvia-process?replay_failed=1`,
        evidence: {
          realviaQueueFailed: metrics.realviaQueueFailed,
          realviaQueuePending: metrics.realviaQueuePending,
          realviaLastWorkerRunAt: metrics.realviaLastWorkerRunAt,
        },
      });
    }

    // Worker beží externým cronom každých 5 min a na každú dávku zapíše riadok
    // do `realvia_metrics`. Dve hodiny ticha = cron alebo CRON_SECRET je mimo.
    // Hlási sa len keď front niečo CAKÁ: prázdna rada bez behu nie je porucha.
    const workerAge = ageMs(metrics.realviaLastWorkerRunAt, now);
    const workerStale = workerAge === null || workerAge > MS_2H;
    if (workerStale && metrics.realviaQueuePending > 0) {
      signals.push({
        id: "realvia_worker_stale_2h",
        severity: "critical",
        title: "Realvia worker: front čaká, worker nebeží 2h+",
        detail: `${metrics.realviaQueuePending} job(ov) čaká v stave pending a posledná dávka workera je staršia ako 2h — over externý cron na /api/cron/realvia-process a CRON_SECRET.`,
        evidence: {
          realviaQueuePending: metrics.realviaQueuePending,
          realviaLastWorkerRunAt: metrics.realviaLastWorkerRunAt,
          realviaPropertiesUpdated24h: metrics.realviaPropertiesUpdated24h,
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

  const guardianAge = ageMs(metrics.guardianLastRunAt, now);
  if (guardianAge === null || guardianAge > MS_2H) {
    signals.push({
      id: "guardian_runner_stale_2h",
      severity: "warning",
      title: "Guardian: žiadny beh 2h+",
      detail:
        "Hodinový Guardian cron nezanechal stopu v platform heartbeat — over Vercel cron a CRON_SECRET.",
      evidence: {
        guardianLastRunAt: metrics.guardianLastRunAt,
        guardianOpenFindings: metrics.guardianOpenFindings,
      },
    });
  }

  return signals;
}

async function safeCount(
  supabase: SupabaseClient,
  table: string,
  apply?: (q: any) => any,
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
  apply?: (q: any) => any,
): Promise<string | null> {
  try {
    let query = supabase.from(table).select(column).order(column, { ascending: false }).limit(1);
    if (apply) query = apply(query);
    const { data, error } = await query;
    if (error || !data?.[0]) return null;
    const row = data[0] as unknown as Record<string, string | null>;
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

  const agencyFilter = (q: any) =>
    agencyId ? q.eq("agency_id", agencyId) : q;

  const [untriagedLeads24h, untriagedLeads7d, maxAiTriageAt, realviaLastWebhookAt, realviaWebhookTotal, realviaQueuePending, realviaQueueFailed, realviaLastWorkerRunAt, realviaPropertiesUpdated24h, inboundMailboxCount, sellerRescueLastNotifAt, sellerRescueLastTaskAt, moatCaptureTriage24h, moatCaptureNba24h, moatCaptureAiEmail24h, moatDealOutcomes24h, guardianLastRunAt, guardianOpenFindings] =
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
      latestIso(supabase, "realvia_webhook_logs", "received_at", (q) =>
        agencyId ? q.eq("agency_id", agencyId) : q,
      ),
      safeCount(supabase, "realvia_webhook_logs", (q) =>
        agencyId ? q.eq("agency_id", agencyId) : q,
      ),
      // Rada nemá agency_id → platformový počet (viď komentár v HeartbeatMetrics).
      safeCount(supabase, "realvia_processing_queue", (q) => q.eq("status", "pending")),
      safeCount(supabase, "realvia_processing_queue", (q) => q.eq("status", "failed")),
      latestIso(supabase, "realvia_metrics", "recorded_at", (q) =>
        q.eq("source", "realvia-queue-batch"),
      ),
      // `realvia_updated_at` píše VÝLUČNE realvianá cesta (processQueue.ts pri
      // inserte, update aj delete), takže toto je „čo Realvia naozaj dosiahla",
      // nie „čo sa v properties zhodou okolností zmenilo".
      safeCount(supabase, "properties", (q) => {
        let query = q
          .eq("source_system", "realvia")
          .gte("realvia_updated_at", cutoff24h);
        if (agencyId) query = query.eq("agency_id", agencyId);
        return query;
      }),
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
      safeCount(supabase, "moat_ai_recommendations", (q) =>
        agencyFilter(q).eq("source", "triage").gte("created_at", cutoff24h),
      ),
      safeCount(supabase, "moat_ai_recommendations", (q) =>
        agencyFilter(q).eq("source", "nba").gte("created_at", cutoff24h),
      ),
      safeCount(supabase, "moat_ai_recommendations", (q) =>
        agencyFilter(q).eq("source", "ai_email").gte("created_at", cutoff24h),
      ),
      safeCount(supabase, "deal_outcomes", (q) =>
        agencyFilter(q).gte("closed_at", cutoff24h),
      ),
      latestIso(supabase, "routine_notifications", "created_at", (q) =>
        q
          .eq("type", GUARDIAN_RUNNER_NOTIFICATION_TYPE)
          .eq("agency_id", SYSTEM_USAGE_AGENCY_ID),
      ),
      safeCount(supabase, "guardian_findings", (q) =>
        agencyFilter(q).is("resolved_at", null),
      ),
    ]);

  return {
    agencyScope: agencyId ?? null,
    untriagedLeads24h,
    untriagedLeads7d,
    maxAiTriageAt,
    realviaLastWebhookAt,
    realviaWebhookTotal,
    realviaQueuePending,
    realviaQueueFailed,
    realviaLastWorkerRunAt,
    realviaPropertiesUpdated24h,
    inboundMailboxCount,
    sellerRescueLastNotifAt,
    sellerRescueLastTaskAt,
    moatCaptureTriage24h,
    moatCaptureNba24h,
    moatCaptureAiEmail24h,
    moatDealOutcomes24h,
    guardianLastRunAt,
    guardianOpenFindings,
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
      if (!error) {
        notificationsCreated += 1;
        // Critical → immediate founder email. Dedup = hasRecentHeartbeatAlert (24h, existing rows).
        if (signal.severity === "critical") {
          await sendCriticalHeartbeatEmail({
            signalId: signal.id,
            title: signal.title,
            detail: signal.detail,
          });
        }
      }
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
