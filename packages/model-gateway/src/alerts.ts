import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildMessageId } from "../../bus-core/src/envelope.ts";
import type { BusStore } from "../../bus-core/src/store.ts";
import type { BusEnvelope } from "../../bus-core/src/types.ts";
import { BUS_ENVELOPE_VERSION } from "../../bus-core/src/types.ts";
import type { AlertDedup, PoolAlert } from "./usage.ts";

function slug(alert: PoolAlert): string {
  return alert.kind === "burn_critical" ? `burn-${alert.poolId}` : `pct-${alert.threshold}-${alert.poolId}`;
}

export function alertEnvelope(alert: PoolAlert, now: Date, sequence: number): BusEnvelope {
  const summary =
    alert.kind === "burn_critical"
      ? `AI pool ${alert.poolId} ide k vyčerpaniu pred resetom (${alert.period})`
      : `AI pool ${alert.poolId} dosiahol ${alert.threshold} % stropu (${alert.period})`;
  return {
    v: BUS_ENVELOPE_VERSION,
    id: buildMessageId("state", now, sequence, slug(alert)),
    type: "state",
    status: "open",
    from: "runner",
    to: "founder",
    created_at: now.toISOString(),
    task_id: alert.key,
    summary: summary.slice(0, 280),
    counters: {
      threshold: alert.threshold ?? 0,
      consumed_eur_micros: Math.round(alert.consumedEur * 1_000_000),
      limit_eur_micros: Math.round(alert.limitEur * 1_000_000),
    },
    next_action: {
      gate: "AUTO-SAFE",
      description: "Skontrolovať AI Control Tower a nespúšťať neurgentnú prácu nad rezervou.",
    },
    body: [
      `Kľúč: ${alert.key}`,
      `Pool: ${alert.poolId}`,
      `Obdobie: ${alert.period}`,
      `Spotreba: ${alert.consumedEur} EUR`,
      `Strop: ${alert.limitEur} EUR`,
      "Zdroj: governor + prečítaná spotreba. Nie je to vendor faktúra.",
    ].join("\n"),
  };
}

export async function publishUsageAlerts(
  store: BusStore,
  alerts: readonly PoolAlert[],
  now: Date,
): Promise<string[]> {
  const ids: string[] = [];
  for (let index = 0; index < alerts.length; index += 1) {
    const alert = alerts[index];
    if (!alert) continue;
    const envelope = alertEnvelope(alert, now, index + 1);
    const ref = await store.write("state", envelope);
    ids.push(ref.id);
  }
  return ids;
}

/** Same keys as `ai_pool_alert_firings`. A missing file is an empty set, not a failure. */
export class FileAlertDedup implements AlertDedup {
  private readonly file: string;

  constructor(file: string) {
    this.file = file;
  }

  private async read(): Promise<Set<string>> {
    try {
      const raw = await readFile(this.file, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) throw new Error("alert dedup file is not an array");
      return new Set(parsed.filter((item): item is string => typeof item === "string"));
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        return new Set();
      }
      throw err;
    }
  }

  async has(key: string): Promise<boolean> {
    return (await this.read()).has(key);
  }

  async mark(key: string): Promise<void> {
    const keys = await this.read();
    keys.add(key);
    await mkdir(path.dirname(this.file), { recursive: true });
    await writeFile(this.file, JSON.stringify([...keys]), "utf8");
  }
}

export function deferEnvelope(input: {
  taskId: string;
  reason: string;
  now: Date;
  sequence?: number;
}): BusEnvelope {
  return {
    v: BUS_ENVELOPE_VERSION,
    id: buildMessageId("task", input.now, input.sequence ?? 1, `defer-${input.taskId}`),
    type: "task",
    status: "open",
    from: "runner",
    to: "cursor",
    created_at: input.now.toISOString(),
    task_id: input.taskId,
    mode: "PLAN",
    summary: `Odložená AI úloha ${input.taskId}`.slice(0, 280),
    next_action: {
      gate: "AUTO-SAFE",
      description: "Zopakovať úlohu, keď spoločný pool uvoľní kapacitu nad urgentnú rezervu.",
    },
    body: input.reason,
  };
}
