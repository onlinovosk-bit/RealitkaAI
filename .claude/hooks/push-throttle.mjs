#!/usr/bin/env node
// push-throttle — mechanická poistka proti „skrutkám": druhý `git push` do 20 min je zablokovaný.
//
// Prečo: každý push = CI beh (~9 min) + nasadenie na Vercel; denný limit nasadení (100) je spoločný pre všetky
// session. 1. 10. 2026 sa vyčerpal a 12 z 99 nasadení bolo z jednej vetvy (viď memory/decisions.md).
//
//   pre   → PreToolUse(Bash):   zablokuje (exit 2) `git push`, ak od posledného ÚSPEŠNÉHO pushu uplynulo < limit.
//   post  → PostToolUse(Bash):  po úspešnom `git push` zapíše čas (retry po zlyhaní, napr. sieť, sa tak neblokuje).
//
// Výnimka: `WALL_PUSH_OK=1 git push …` (oprava červeného CI / výslovná požiadavka foundera) + dôvod v odpovedi.
// Hook je fail-open: neplatný vstup alebo chyba = povoliť (blokovať prácu kvôli chybe hooku je horšie).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const MODE = process.argv[2] ?? 'pre'
const LIMIT_MIN = Number(process.env.WALL_PUSH_MIN ?? 20)

/** Odstráni heredoc telá a texty v úvodzovkách — „git push" v správe commitu nie je push. */
function stripNonCommand(cmd) {
  return cmd
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\s|$)/g, ' ')
    .replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""')
}
/** `git push` ako samostatný príkaz (aj `git -C dir push`), nie `git pushd` ani text v argumente/správe. */
function isGitPush(cmd) {
  return /(?:^|[\s;&|(])git\s+(?:-C\s+\S+\s+|-c\s+\S+\s+)*push(?:\s|$)/.test(stripNonCommand(cmd))
}
function isDryRun(cmd) {
  return /(?:^|\s)(?:--dry-run|-n)(?:\s|$)/.test(stripNonCommand(cmd))
}
function hasBypass(cmd) {
  return /(?:^|\s)WALL_PUSH_OK=1(?:\s|$)/.test(stripNonCommand(cmd))
}
/**
 * Úspešný push vypíše riadok s aktualizáciou refu (`a..b`, `a...b`, `[new branch]`). Odmietnutý (`! [rejected]`),
 * `fatal:` ani `Everything up-to-date` ho nemajú. Ak push viacerých refov aspoň jeden prešiel, nasadenie/CI sa
 * spustilo, takže to platí ako úspech.
 */
function pushSucceeded(output) {
  return /^\s*(?:[+*]\s+)?(?:[0-9a-f]{7,40}\.{2,3}[0-9a-f]{7,40}|\[new (?:branch|tag)\])/m.test(output)
}

function stateFile(cwd) {
  if (process.env.WALL_STATE_FILE) return process.env.WALL_STATE_FILE
  try {
    const gitDir = execFileSync('git', ['rev-parse', '--git-dir'], { cwd, encoding: 'utf8' }).trim()
    return join(cwd, gitDir, 'wall-push-state.json')
  } catch {
    return join(tmpdir(), 'wall-push-state.json')
  }
}
function readLastPush(file) {
  try {
    return Number(JSON.parse(readFileSync(file, 'utf8')).lastPushAt) || 0
  } catch {
    return 0
  }
}

function outputOf(response) {
  if (typeof response === 'string') return response
  if (!response || typeof response !== 'object') return ''
  return [response.stdout, response.stderr, response.output].filter((x) => typeof x === 'string').join('\n')
}

function main() {
  let input
  try {
    input = JSON.parse(readFileSync(0, 'utf8'))
  } catch {
    return 0
  }
  if (input?.tool_name !== 'Bash') return 0
  const cmd = String(input?.tool_input?.command ?? '')
  if (!isGitPush(cmd) || isDryRun(cmd)) return 0

  const cwd = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd()
  const file = stateFile(cwd)

  if (MODE === 'post') {
    if (pushSucceeded(outputOf(input.tool_response))) {
      try {
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(file, JSON.stringify({ lastPushAt: Date.now() }))
      } catch {
        /* best-effort */
      }
    }
    return 0
  }

  // pre
  if (hasBypass(cmd)) return 0
  const last = readLastPush(file)
  const ageMin = (Date.now() - last) / 60000
  if (last > 0 && ageMin < LIMIT_MIN) {
    process.stderr.write(
      `BLOKOVANÉ hookom push-throttle: posledný úspešný push bol pred ${Math.max(1, Math.round(ageMin))} min (limit ${LIMIT_MIN} min). ` +
        'Jedna stena = jeden push — každý push = CI beh (~9 min) + nasadenie (denný limit nasadení je spoločný pre všetky session). ' +
        'Spoj zmeny a pushni raz. Ak ide o opravu červeného CI alebo výslovnú požiadavku foundera, zopakuj ako ' +
        '`WALL_PUSH_OK=1 git push …` a v odpovedi uveď dôvod.\n',
    )
    return 2
  }
  return 0
}

let code = 0
try {
  code = main()
} catch {
  code = 0
}
process.exit(code)
