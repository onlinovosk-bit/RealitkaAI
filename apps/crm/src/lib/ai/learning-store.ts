import fs from "fs";
import path from "path";

export type Outcome = {
  signals: Record<string, number>;
  converted: boolean;
  at?: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const OUTCOMES_FILE = path.join(DATA_DIR, "outcomes.jsonl");

/** In-memory mirror + append-only JSONL pre jednoduché učenie bez DB. */
const dataset: Outcome[] = [];

export function storeOutcome(outcome: Outcome): void {
  const row: Outcome = {
    ...outcome,
    at: outcome.at ?? new Date().toISOString(),
  };
  dataset.push(row);
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.appendFileSync(OUTCOMES_FILE, `${JSON.stringify(row)}\n`, "utf8");
  } catch {
    /* ignore disk errors — pamäť stále obsahuje záznam */
  }
}

export function getDataset(): Outcome[] {
  return dataset;
}

/** Načíta historické riadky z disku pri štarte workeru. */
export function hydrateOutcomesFromDisk(): void {
  try {
    if (!fs.existsSync(OUTCOMES_FILE)) return;
    const lines = fs.readFileSync(OUTCOMES_FILE, "utf8").split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const o = JSON.parse(line) as Outcome;
        if (o && typeof o.converted === "boolean" && o.signals) {
          dataset.push(o);
        }
      } catch {
        /* skip bad line */
      }
    }
  } catch {
    /* ignore */
  }
}
