/**
 * Ukladá posledný odhad € pre trend (server-side .data).
 */
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "monthly-forecast-eur-snapshot.json");

type Snapshot = { valueEur: number; at: string };

export function readForecastEurSnapshot(): Snapshot | null {
  try {
    if (!fs.existsSync(FILE)) return null;
    const raw = fs.readFileSync(FILE, "utf8");
    const p = JSON.parse(raw) as Snapshot;
    if (typeof p.valueEur !== "number" || typeof p.at !== "string") return null;
    return p;
  } catch {
    return null;
  }
}

export function writeForecastEurSnapshot(valueEur: number): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const row: Snapshot = { valueEur, at: new Date().toISOString() };
    fs.writeFileSync(FILE, JSON.stringify(row, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}
