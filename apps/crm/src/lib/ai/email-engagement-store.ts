/**
 * Agregované open/click udalosti z Resend webhookov (per lead).
 * Persistencia: .data/email-engagement.json (server-side).
 */
import fs from "fs";
import path from "path";

export type EmailEngagement = {
  opens: number;
  clicks: number;
  lastOpenAt?: string;
  lastClickAt?: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "email-engagement.json");

const cache: Record<string, EmailEngagement> = {};
let hydrated = false;

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  try {
    if (!fs.existsSync(FILE)) return;
    const raw = fs.readFileSync(FILE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, EmailEngagement>;
    for (const [k, v] of Object.entries(parsed)) {
      if (v && typeof v.opens === "number") {
        cache[k] = {
          opens: Math.max(0, v.opens),
          clicks: Math.max(0, v.clicks ?? 0),
          lastOpenAt: v.lastOpenAt,
          lastClickAt: v.lastClickAt,
        };
      }
    }
  } catch {
    /* ignore */
  }
}

function persist() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch {
    /* non-fatal */
  }
}

export function getEmailEngagementForLead(leadId: string): EmailEngagement {
  ensureHydrated();
  const row = cache[leadId];
  return row ?? { opens: 0, clicks: 0 };
}

export function recordEmailOpen(leadId: string, at?: string): EmailEngagement {
  ensureHydrated();
  const prev = cache[leadId] ?? { opens: 0, clicks: 0 };
  const next: EmailEngagement = {
    ...prev,
    opens: prev.opens + 1,
    lastOpenAt: at ?? new Date().toISOString(),
  };
  cache[leadId] = next;
  persist();
  return next;
}

export function recordEmailClick(leadId: string, at?: string): EmailEngagement {
  ensureHydrated();
  const prev = cache[leadId] ?? { opens: 0, clicks: 0 };
  const next: EmailEngagement = {
    ...prev,
    clicks: prev.clicks + 1,
    lastClickAt: at ?? new Date().toISOString(),
  };
  cache[leadId] = next;
  persist();
  return next;
}
