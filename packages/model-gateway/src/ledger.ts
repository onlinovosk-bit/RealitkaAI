import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { GatewayLedgerRecord, GatewayProjectId } from "./types.ts";
import { asProjectId, isBillableLedgerRow, parseLedgerJsonl, round6 } from "./usage.ts";

export interface SpendSummary {
  dailyEur: number;
  monthlyEur: number;
  monthlyByProject: Record<GatewayProjectId, number>;
}

export class AppendOnlyJsonlLedger {
  private tail: Promise<void> = Promise.resolve();
  private readonly file: string;

  constructor(file: string) {
    this.file = file;
  }

  get filePath(): string {
    return this.file;
  }

  async append(record: GatewayLedgerRecord): Promise<void> {
    const line = `${JSON.stringify(record)}\n`;
    const run = this.tail.then(async () => {
      await mkdir(path.dirname(this.file), { recursive: true });
      await appendFile(this.file, line, "utf8");
    });
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async records(): Promise<GatewayLedgerRecord[]> {
    try {
      const raw = await readFile(this.file, "utf8");
      return parseLedgerJsonl(raw);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        return [];
      }
      throw err;
    }
  }

  async summarize(now = new Date()): Promise<SpendSummary> {
    let raw = "";
    try {
      raw = await readFile(this.file, "utf8");
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        return emptySpend();
      }
      throw err;
    }
    return summarizeRecords(parseLedgerJsonl(raw), now);
  }
}

export function emptySpend(): SpendSummary {
  return {
    dailyEur: 0,
    monthlyEur: 0,
    monthlyByProject: { revolis: 0, onlinovo: 0, other: 0 },
  };
}

export function summarizeRecords(records: readonly GatewayLedgerRecord[], now = new Date()): SpendSummary {
  const dayKey = utcDateKey(now);
  const monthKey = utcMonthKey(now);
  let dailyEur = 0;
  let monthlyEur = 0;
  const monthlyByProject: Record<GatewayProjectId, number> = { revolis: 0, onlinovo: 0, other: 0 };
  for (const row of records) {
    if (!isBillableLedgerRow(row)) continue;
    const keyDay = utcDateKey(new Date(row.ts));
    const keyMonth = utcMonthKey(new Date(row.ts));
    if (keyDay === dayKey) dailyEur += row.costEur;
    if (keyMonth === monthKey) {
      monthlyEur += row.costEur;
      const project = asProjectId(row.projectId);
      monthlyByProject[project] += row.costEur;
    }
  }
  return {
    dailyEur: round6(dailyEur),
    monthlyEur: round6(monthlyEur),
    monthlyByProject: {
      revolis: round6(monthlyByProject.revolis),
      onlinovo: round6(monthlyByProject.onlinovo),
      other: round6(monthlyByProject.other),
    },
  };
}

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcMonthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}
