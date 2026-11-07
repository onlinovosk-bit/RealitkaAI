#!/usr/bin/env node
// sql-readonly-guard — PreToolUse(mcp__Supabase__execute_sql): všetko, čo nie je čisté čítanie, ide na potvrdenie foundera.
//
// Prečo: `apply_migration` je v deny liste, ale `execute_sql` bol povolený bez obmedzenia, takže DDL/zápis do PROD
// obišiel deny (audit 2026-11-07). Statický deny vzor nerozlíši SELECT od DROP, preto hook.
//
// FAIL-CLOSED: neplatný vstup, prázdny dotaz, viac príkazov, neznáme kľúčové slovo = permissionDecision "ask"
// (nie "allow"). Hook nikdy sám nepovolí zápis; len nechá bežať čisté čítanie bez promptu.
// Poznámka: je to rýchla poistka, nie SQL parser. Funkcie s vedľajším efektom volané cez SELECT sa nezachytia
// všetky — preto ostáva aj RLS/rola na strane DB ako hlavná hranica.
import { readFileSync } from 'node:fs'

function ask(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: `sql-readonly-guard: ${reason}`,
      },
    }),
  )
  process.exit(0)
}

/** Odstráni komentáre a texty v úvodzovkách, aby kľúčové slová v nich nezmiatli kontrolu. */
export function strip(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, "''")
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"(?:[^"]|"")*"/g, '""')
}

const WRITE_WORDS =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|merge|copy|call|do|vacuum|reindex|cluster|refresh|comment|lock|set|reset|begin|commit|rollback|savepoint|prepare|execute|listen|notify|security|into|pg_terminate_backend|pg_cancel_backend|pg_sleep|set_config|lo_import|lo_export|dblink|http)\b/i

/** Vráti null, ak je dotaz čisté čítanie; inak dôvod. */
export function classify(sql) {
  if (typeof sql !== 'string' || !sql.trim()) return 'prázdny alebo neplatný dotaz'
  const s = strip(sql).trim().replace(/;+\s*$/, '')
  if (s.includes(';')) return 'viac príkazov v jednom volaní'
  if (!/^(select|with|show|explain|values|table)\b/i.test(s)) return 'nezačína ako čisté čítanie (SELECT/WITH/SHOW/EXPLAIN)'
  if (/^explain\b[^]*\banalyze\b/i.test(s)) return 'EXPLAIN ANALYZE vykoná dotaz'
  const m = s.match(WRITE_WORDS)
  if (m) return `obsahuje „${m[1].toLowerCase()}" (zápis/DDL/riadenie transakcie)`
  return null
}

function main() {
  let input
  try {
    input = JSON.parse(readFileSync(0, 'utf8'))
  } catch {
    return ask('neplatný vstup hooku — pre istotu potvrdenie')
  }
  const reason = classify(input?.tool_input?.query)
  if (reason) return ask(`${reason} — potvrď, že ide o zámerný zásah do DB`)
  return process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main()
  } catch {
    ask('chyba hooku — pre istotu potvrdenie')
  }
}
