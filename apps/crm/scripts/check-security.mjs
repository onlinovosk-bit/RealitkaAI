#!/usr/bin/env node
// Security review script — runs on PR, no npm dependencies required.
// Checks: (1) new middleware bypass prefixes without inline comment,
//         (2) new SQL migrations with CREATE TABLE missing RLS,
//         (3) hardcoded secret patterns in changed TS/JS files.
// Writes /tmp/security-review-comment.md and exits 1 if blockers found.

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const BASE_SHA = process.env.BASE_SHA
const HEAD_SHA = process.env.HEAD_SHA ?? 'HEAD'

if (!BASE_SHA) {
  console.error('BASE_SHA env var required')
  process.exit(1)
}

// ── helpers ──────────────────────────────────────────────────────────────────

function changedFiles() {
  const out = execSync(`git diff --name-only ${BASE_SHA}...${HEAD_SHA}`, {
    encoding: 'utf8',
  })
  return out.split('\n').filter(Boolean)
}

function fileContent(relPath) {
  if (!existsSync(relPath)) return null
  return readFileSync(relPath, 'utf8')
}

function baseContent(relPath) {
  try {
    return execSync(`git show ${BASE_SHA}:${relPath}`, { encoding: 'utf8' })
  } catch {
    return null // file is new
  }
}

// ── Check 1: middleware bypass sprawl ────────────────────────────────────────

function checkMiddlewareBypasses(files) {
  const findings = []
  const mwPath = files.find(
    (f) => f === 'apps/crm/middleware.ts' || f.endsWith('/middleware.ts'),
  )
  if (!mwPath) return findings

  const head = fileContent(mwPath)
  const base = baseContent(mwPath)
  if (!head) return findings

  const extractBypasses = (src) => {
    if (!src) return new Set()
    const match = src.match(/BYPASS_PREFIXES\s*=\s*\[([^\]]+)\]/s)
    if (!match) return new Set()
    return new Set(
      match[1]
        .split('\n')
        .map((l) => l.match(/'([^']+)'/)?.[1])
        .filter(Boolean),
    )
  }

  const headBypasses = extractBypasses(head)
  const baseBypasses = extractBypasses(base)

  for (const prefix of headBypasses) {
    if (baseBypasses.has(prefix)) continue // existing — skip
    // New prefix — must have an inline comment on the same or preceding line
    const lineIdx = head.split('\n').findIndex((l) => l.includes(`'${prefix}'`))
    const lines = head.split('\n')
    const hasComment =
      (lines[lineIdx] ?? '').includes('//') ||
      (lines[lineIdx - 1] ?? '').trimStart().startsWith('//')
    if (!hasComment) {
      findings.push({
        severity: 'BLOCKER',
        file: mwPath,
        detail: `New BYPASS_PREFIXES entry \`${prefix}\` has no inline comment explaining why auth is bypassed.`,
      })
    }
  }
  return findings
}

// ── Check 2: new migrations without RLS ──────────────────────────────────────

function checkMigrationRLS(files) {
  const findings = []
  const migrations = files.filter(
    (f) =>
      f.includes('supabase/migrations') &&
      f.endsWith('.sql') &&
      !baseContent(f), // file is new (didn't exist on base)
  )

  for (const mig of migrations) {
    const sql = fileContent(mig)
    if (!sql) continue

    const tables = [...sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\S+)/gi)].map(
      (m) => m[1].replace(/[";]/g, ''),
    )
    if (tables.length === 0) continue

    const hasRLS = sql.match(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i)
    const hasPolicy = sql.match(/CREATE\s+POLICY/i)

    if (!hasRLS || !hasPolicy) {
      findings.push({
        severity: 'BLOCKER',
        file: mig,
        detail: `Creates table(s) \`${tables.join(', ')}\` but is missing ${
          !hasRLS ? 'ENABLE ROW LEVEL SECURITY' : ''
        }${!hasRLS && !hasPolicy ? ' and ' : ''}${!hasPolicy ? 'CREATE POLICY' : ''}.`,
      })
    }
  }
  return findings
}

// ── Check 3: hardcoded secrets ────────────────────────────────────────────────

const SECRET_PATTERNS = [
  { re: /sk_live_[A-Za-z0-9]{20,}/, label: 'Stripe live secret key' },
  { re: /sk_test_[A-Za-z0-9]{20,}/, label: 'Stripe test secret key' },
  { re: /eyJ[A-Za-z0-9_-]{40,}/, label: 'Hardcoded JWT' },
  { re: /service_role[^=\s]*\s*[:=]\s*['"]ey/, label: 'Supabase service role key' },
  { re: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]ey/, label: 'Supabase service role key (env assign)' },
  { re: /Bearer\s+ey[A-Za-z0-9_-]{40,}/, label: 'Bearer token hardcoded' },
  // Exclude files that are obviously test fixtures or type declarations
]

const IGNORE_PATHS = ['node_modules', '.next', 'dist', '__snapshots__', '.d.ts']

function checkSecrets(files) {
  const findings = []
  const candidates = files.filter(
    (f) =>
      /\.(ts|tsx|js|mjs|cjs|json)$/.test(f) &&
      !IGNORE_PATHS.some((p) => f.includes(p)),
  )

  for (const f of candidates) {
    const content = fileContent(f)
    if (!content) continue
    const lines = content.split('\n')
    for (const { re, label } of SECRET_PATTERNS) {
      lines.forEach((line, idx) => {
        if (re.test(line) && !line.trimStart().startsWith('//')) {
          findings.push({
            severity: 'BLOCKER',
            file: f,
            detail: `Line ${idx + 1}: possible ${label} — \`${line.trim().slice(0, 80)}\``,
          })
        }
      })
    }
  }
  return findings
}

// ── Assemble report ───────────────────────────────────────────────────────────

const files = changedFiles()

const allFindings = [
  ...checkMiddlewareBypasses(files),
  ...checkMigrationRLS(files),
  ...checkSecrets(files),
]

const blockers = allFindings.filter((f) => f.severity === 'BLOCKER')
const warnings = allFindings.filter((f) => f.severity === 'WARNING')

const statusEmoji = blockers.length > 0 ? '🔴' : warnings.length > 0 ? '🟡' : '🟢'
const statusText = blockers.length > 0 ? 'Blocked' : warnings.length > 0 ? 'Warnings' : 'Clean'

const lines = [
  `## ${statusEmoji} Security Review — ${statusText}`,
  '',
  `> Scanned ${files.length} changed file(s) against \`${BASE_SHA.slice(0, 7)}\``,
  '',
]

if (blockers.length > 0) {
  lines.push('### Blockers')
  for (const f of blockers) {
    lines.push(`- **${f.file}**: ${f.detail}`)
  }
  lines.push('')
}

if (warnings.length > 0) {
  lines.push('### Warnings')
  for (const f of warnings) {
    lines.push(`- **${f.file}**: ${f.detail}`)
  }
  lines.push('')
}

if (allFindings.length === 0) {
  lines.push('No issues found in middleware bypasses, migration RLS, or secret patterns.')
  lines.push('')
}

lines.push(
  '<sub>Generated by `check-security.mjs` · [workflow](.github/workflows/security-review.yml)</sub>',
)

const report = lines.join('\n')
writeFileSync('/tmp/security-review-comment.md', report)
console.log(report)

if (blockers.length > 0) {
  console.error(`\n${blockers.length} blocker(s) found — failing job.`)
  process.exit(1)
}
