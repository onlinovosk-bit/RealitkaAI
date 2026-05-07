// ================================================================
// Revolis.AI — Pulse Check Utility
// Runs internal health checks: healthz, Supabase, Claude API env
// ================================================================
import { createAdminClient } from '@/lib/supabase/server'
import { logWarn, logError } from '@/lib/logger'

const SLOW_THRESHOLD_MS = 2000

export interface CheckResult {
  ok: boolean
  ms: number
}

export interface ClaudeCheckResult {
  ok: boolean
}

export interface PulseChecks {
  healthz: CheckResult
  supabase: CheckResult
  claude: ClaudeCheckResult
}

export interface PulseResult {
  ok: boolean
  ts: string
  checks: PulseChecks
  summary: string
}

async function checkHealthz(baseUrl: string): Promise<CheckResult> {
  const start = Date.now()
  try {
    const res = await fetch(`${baseUrl}/api/healthz`, {
      method: 'GET',
      cache: 'no-store',
    })
    const ms = Date.now() - start
    const ok = res.ok
    return { ok, ms }
  } catch {
    return { ok: false, ms: Date.now() - start }
  }
}

async function checkSupabase(): Promise<CheckResult> {
  const start = Date.now()
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })
    const ms = Date.now() - start
    return { ok: !error, ms }
  } catch {
    return { ok: false, ms: Date.now() - start }
  }
}

function checkClaude(): ClaudeCheckResult {
  return { ok: Boolean(process.env.ANTHROPIC_API_KEY) }
}

function buildSummary(checks: PulseChecks): string {
  const issues: string[] = []

  if (!checks.healthz.ok) {
    issues.push('down: healthz failed')
  } else if (checks.healthz.ms > SLOW_THRESHOLD_MS) {
    issues.push(`degraded: healthz slow (${checks.healthz.ms}ms)`)
  }

  if (!checks.supabase.ok) {
    issues.push('down: supabase failed')
  } else if (checks.supabase.ms > SLOW_THRESHOLD_MS) {
    issues.push(`degraded: supabase slow (${checks.supabase.ms}ms)`)
  }

  if (!checks.claude.ok) {
    issues.push('down: claude api key missing')
  }

  if (issues.length === 0) return 'All systems operational'
  return issues.join(', ')
}

export async function runPulseCheck(): Promise<PulseResult> {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

  const [healthz, supabase] = await Promise.all([
    checkHealthz(appUrl),
    checkSupabase(),
  ])
  const claude = checkClaude()

  const checks: PulseChecks = { healthz, supabase, claude }
  const summary = buildSummary(checks)
  const ok = healthz.ok && supabase.ok && claude.ok

  if (!healthz.ok) {
    logError('[pulse] healthz check failed', { ms: healthz.ms })
  } else if (healthz.ms > SLOW_THRESHOLD_MS) {
    logWarn('[pulse] healthz is slow', { ms: healthz.ms })
  }

  if (!supabase.ok) {
    logError('[pulse] supabase check failed', { ms: supabase.ms })
  } else if (supabase.ms > SLOW_THRESHOLD_MS) {
    logWarn('[pulse] supabase is slow', { ms: supabase.ms })
  }

  if (!claude.ok) {
    logError('[pulse] ANTHROPIC_API_KEY is not set')
  }

  return {
    ok,
    ts: new Date().toISOString(),
    checks,
    summary,
  }
}
