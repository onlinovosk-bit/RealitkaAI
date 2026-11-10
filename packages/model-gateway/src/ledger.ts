import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { GatewayLedgerRecord } from "./types.ts";

export interface SpendSummary {
  dailyEur: number;
  monthlyEur: number;
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
        return { dailyEur: 0, monthlyEur: 0 };
      }
      throw err;
    }
    const dayKey = utcDateKey(now);
    const monthKey = utcMonthKey(now);
    let dailyEur = 0;
    let monthlyEur = 0;
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let row: GatewayLedgerRecord;
      try {
        row = JSON.parse(trimmed) as GatewayLedgerRecord;
      } catch {
        continue;
      }
      if (row.status !== "ok") continue;
      if (!Number.isFinite(row.costEur)) continue;
      const keyDay = utcDateKey(new Date(row.ts));
      const keyMonth = utcMonthKey(new Date(row.ts));
      if (keyDay === dayKey) dailyEur += row.costEur;
      if (keyMonth === monthKey) monthlyEur += row.costEur;
    }
    return {
      dailyEur: round6(dailyEur),
      monthlyEur: round6(monthlyEur),
    };
  }
}

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcMonthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}
