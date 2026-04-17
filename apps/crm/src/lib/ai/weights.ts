import fs from "fs";
import path from "path";

/** Startovacie váhy pre jednotlivé signály (0–2); auto-tune ich upravuje a ukladá na disk. */
export const WEIGHTS: Record<string, number> = {
  email_open: 1,
  link_click: 1.1,
  page_view: 0.6,
  reply: 1.3,
  call_answered: 1.5,
  viewing_booked: 1.8,
};

const DATA_DIR = path.join(process.cwd(), ".data");
const WEIGHTS_FILE = path.join(DATA_DIR, "signal-weights.json");

export function getWeights(): Record<string, number> {
  return WEIGHTS;
}

export function loadWeightsFromDisk(): void {
  try {
    if (!fs.existsSync(WEIGHTS_FILE)) return;
    const raw = fs.readFileSync(WEIGHTS_FILE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, number>;
    for (const key of Object.keys(WEIGHTS)) {
      if (typeof parsed[key] === "number" && Number.isFinite(parsed[key])) {
        WEIGHTS[key] = Math.min(2, Math.max(0, parsed[key]));
      }
    }
  } catch {
    /* ignore corrupt file */
  }
}

export function saveWeightsToDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(WEIGHTS_FILE, JSON.stringify(WEIGHTS, null, 2), "utf8");
  } catch {
    /* non-fatal */
  }
}
