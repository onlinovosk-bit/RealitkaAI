/**
 * Distributed rate limiter — sliding window cez Supabase `rate_limit_buckets`.
 * Edge-safe: žiadna in-process Map, funguje v serverless/edge prostredí.
 *
 * DDL (spusti v Supabase SQL editor):
 * ─────────────────────────────────────────────────────────────────
 * create table if not exists rate_limit_buckets (
 *   key        text        not null,
 *   window_end timestamptz not null,
 *   count      int         not null default 1,
 *   primary key (key, window_end)
 * );
 * create index if not exists idx_rlb_window on rate_limit_buckets (window_end);
 * ─────────────────────────────────────────────────────────────────
 *
 * Automatické čistenie — spusti v Supabase pg_cron (voliteľné):
 *   select cron.schedule('rl-cleanup','0 * * * *',
 *     $$delete from rate_limit_buckets where window_end < now()$$);
 */

import { createServiceRoleClient } from "@/lib/supabase/admin";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Sliding-window rate limit.
 * @param key   Identifikátor (napr. "ip:1.2.3.4" alebo "lead-capture:email@x.com")
 * @param max   Maximálny počet requestov za okno
 * @param windowMs Dĺžka okna v ms (default 60 000 = 1 min)
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs = 60_000,
): Promise<RateLimitResult> {
  const sb = createServiceRoleClient();

  if (!sb) {
    // Supabase nie je nakonfigurovaný — graceful fallback, log warning
    console.warn("[rate-limit] Supabase nedostupný — rate limit vynechaný pre kľúč:", key);
    return { allowed: true, remaining: max };
  }

  const now = Date.now();
  const windowEnd = new Date(Math.ceil(now / windowMs) * windowMs).toISOString();

  // Upsert: ak riadok existuje, inkrementuj count; inak vlož count=1
  const { data, error } = await sb.rpc("rate_limit_increment", {
    p_key: key,
    p_window_end: windowEnd,
    p_max: max,
  });

  if (error) {
    // DB chyba — graceful fallback, neblokuj request
    console.error("[rate-limit] DB chyba:", error.message);
    return { allowed: true, remaining: max };
  }

  const currentCount: number = (data as number) ?? 1;
  const allowed = currentCount <= max;
  const remaining = Math.max(0, max - currentCount);

  return { allowed, remaining };
}
