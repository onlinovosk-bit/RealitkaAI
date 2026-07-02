import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(SCRIPT_DIR, "..", "..", "..");

export const DATA_DIR = path.join(REPO_ROOT, "data");
export const FINSTAT_CSV = path.join(DATA_DIR, "finstat-export.csv");
export const ENRICHED_JSON = path.join(DATA_DIR, "enriched.json");
export const SCORED_JSON = path.join(DATA_DIR, "scored.json");
export const PROSPECTS_CSV = path.join(DATA_DIR, "prospects-scored.csv");
export const REPORT_MD = path.join(DATA_DIR, "prospects-report.md");
export const CACHE_DIR = path.join(DATA_DIR, "prospecting-cache");
