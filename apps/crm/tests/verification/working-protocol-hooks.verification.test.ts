// ================================================================
// Revolis.AI — WORKING-PROTOCOL-HOOKS: pravidlo „steny, nie skrutky" nesmie závisieť od pamäte modelu
//
// Pravidlo bolo v CLAUDE.md a v memory od 2026-09-22 a 1. 10. 2026 sa napriek tomu porušilo (4 GO na jednu
// stenu, 12 zo 99 nasadení z jednej vetvy, sedem „bez zmeny" správ). Pamäť sa dá zabudnúť; hook nie:
//   - SessionStart / UserPromptSubmit vracajú protokol do kontextu pri štarte a pri KAŽDEJ správe foundera,
//   - PreToolUse/PostToolUse (push-throttle) blokuje druhý `git push` do 20 min.
//
// Tento test stráži (1) že hooky sú zapojené a skripty existujú, (2) čo injektujú, (3) každé rozhodnutie throttle.
// ================================================================
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const REPO = resolve(__dirname, '../../../..')
const HOOKS = join(REPO, '.claude/hooks')
const PROTOCOL = join(REPO, '.claude/working-protocol.md')
const SETTINGS = ['.claude/settings.json', 'apps/crm/.claude/settings.json']

type Run = { code: number | null; stdout: string; stderr: string }

function run(script: string, mode: string, stdin: unknown, env: Record<string, string> = {}): Run {
  const r = spawnSync('node', [join(HOOKS, script), mode], {
    input: typeof stdin === 'string' ? stdin : JSON.stringify(stdin),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })
  return { code: r.status, stdout: r.stdout, stderr: r.stderr }
}

describe('[verification] hooky sú zapojené v oboch nastaveniach', () => {
  it.each(SETTINGS)('%s: štyri hooky, skripty existujú, oprávnenia zostali', (rel) => {
    const j = JSON.parse(readFileSync(join(REPO, rel), 'utf8'))
    const cmds = (event: string, matcher?: string) =>
      (j.hooks?.[event] ?? [])
        .filter((g: { matcher?: string }) => g.matcher === matcher)
        .flatMap((g: { hooks: Array<{ command: string }> }) => g.hooks.map((h) => h.command))

    expect(cmds('SessionStart').join()).toContain('working-protocol.mjs" start')
    expect(cmds('UserPromptSubmit').join()).toContain('working-protocol.mjs" turn')
    expect(cmds('PreToolUse', 'Bash').join()).toContain('push-throttle.mjs" pre')
    expect(cmds('PostToolUse', 'Bash').join()).toContain('push-throttle.mjs" post')

    // Koreň repa sa hľadá cez git, takže hook funguje aj keď session štartuje v apps/crm.
    expect(JSON.stringify(j.hooks)).toContain('git rev-parse --show-toplevel')
    // Pridanie hookov nesmie zmazať oprávnenia.
    expect(j.permissions.allow.length).toBeGreaterThan(5)
  })

  it('skripty a protokol existujú', () => {
    for (const f of [PROTOCOL, join(HOOKS, 'working-protocol.mjs'), join(HOOKS, 'push-throttle.mjs')]) {
      expect(existsSync(f), f).toBe(true)
    }
  })
})

describe('[verification] working-protocol: čo sa injektuje', () => {
  it('start: celý protokol so všetkými ôsmimi pravidlami', () => {
    const r = run('working-protocol.mjs', 'start', '')
    expect(r.code).toBe(0)
    expect(r.stdout).toBe(readFileSync(PROTOCOL, 'utf8'))
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) expect(r.stdout).toContain(`${n}. **`)
    expect(r.stdout).toContain('Steny, nie skrutky'.toLowerCase().replace('steny', 'steny'))
  })

  it('turn: skrátená verzia s kľúčovými pravidlami (pri každej správe)', () => {
    const r = run('working-protocol.mjs', 'turn', '')
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('steny, nie skrutky')
    expect(r.stdout).toContain('1 GO = 1 celá stena')
    expect(r.stdout).toContain('Upozornenie bez zmeny = ticho')
    expect(r.stdout).toContain('WALL_PUSH_OK=1')
    expect(r.stdout).toContain('Postup: X % → Y %')
    expect(r.stdout.split('\n').length).toBeLessThanOrEqual(6) // krátke, aby to neničilo kontext
  })

  it('nikdy nepadá: neznámy režim aj chýbajúci vstup → exit 0 a výstup', () => {
    expect(run('working-protocol.mjs', 'nonsense', '').code).toBe(0)
    expect(run('working-protocol.mjs', 'turn', 'not json').stdout.length).toBeGreaterThan(20)
  })
})

describe('[verification] push-throttle: rozhodnutia', () => {
  let dir: string
  let state: string
  const env = () => ({ WALL_STATE_FILE: state })
  const bash = (command: string, extra: Record<string, unknown> = {}) => ({ tool_name: 'Bash', tool_input: { command }, ...extra })
  const OK_PUSH = '   4915be0..2db58c3  claude/branch -> claude/branch\n'

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'wall-'))
    state = join(dir, 'state.json')
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  const recordPush = (output = OK_PUSH, cmd = 'git push -u origin b') =>
    run('push-throttle.mjs', 'post', bash(cmd, { tool_response: { stdout: output } }), env())
  const ageState = (minutes: number) => writeFileSync(state, JSON.stringify({ lastPushAt: Date.now() - minutes * 60000 }))

  it('prvý push (bez stavu) prejde', () => {
    expect(run('push-throttle.mjs', 'pre', bash('git push -u origin b'), env()).code).toBe(0)
  })

  it('po úspešnom pushi je druhý push do 20 min zablokovaný (exit 2) so správou a výnimkou', () => {
    recordPush()
    const r = run('push-throttle.mjs', 'pre', bash('git push -u origin b'), env())
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('BLOKOVANÉ')
    expect(r.stderr).toContain('WALL_PUSH_OK=1')
    expect(r.stderr).toMatch(/pred \d+ min/)
  })

  it('výnimka WALL_PUSH_OK=1 prejde', () => {
    recordPush()
    expect(run('push-throttle.mjs', 'pre', bash('WALL_PUSH_OK=1 git push -u origin b'), env()).code).toBe(0)
  })

  it('po uplynutí okna (25 min) prejde, tesne pred koncom (19 min) ešte nie', () => {
    ageState(25)
    expect(run('push-throttle.mjs', 'pre', bash('git push'), env()).code).toBe(0)
    ageState(19)
    expect(run('push-throttle.mjs', 'pre', bash('git push'), env()).code).toBe(2)
  })

  it('limit sa dá zmeniť cez WALL_PUSH_MIN', () => {
    ageState(5)
    expect(run('push-throttle.mjs', 'pre', bash('git push'), { ...env(), WALL_PUSH_MIN: '3' }).code).toBe(0)
  })

  it('dry-run, iný nástroj a iný príkaz sa neblokujú', () => {
    recordPush()
    expect(run('push-throttle.mjs', 'pre', bash('git push --dry-run origin b'), env()).code).toBe(0)
    expect(run('push-throttle.mjs', 'pre', bash('git status'), env()).code).toBe(0)
    expect(run('push-throttle.mjs', 'pre', bash('git pushd'), env()).code).toBe(0)
    expect(run('push-throttle.mjs', 'pre', bash('echo "git push" > note.txt'), env()).code).toBe(0)
    expect(run('push-throttle.mjs', 'pre', { tool_name: 'Read', tool_input: { file_path: 'x' } }, env()).code).toBe(0)
  })

  it('„git push" v správe commitu (úvodzovky aj heredoc) nie je push; skutočný push za ním áno', () => {
    recordPush()
    expect(run('push-throttle.mjs', 'pre', bash('git commit -m "oprava: git push throttle"'), env()).code).toBe(0)
    expect(run('push-throttle.mjs', 'pre', bash("git commit -m 'git push je zablokovaný'"), env()).code).toBe(0)
    const heredoc = "git commit -F - <<'EOF'\nmemory: poznámka\ngit push do 20 min\nEOF"
    expect(run('push-throttle.mjs', 'pre', bash(heredoc), env()).code).toBe(0)
    expect(run('push-throttle.mjs', 'pre', bash(`${heredoc}\ngit push -u origin b`), env()).code).toBe(2)
    // WALL_PUSH_OK uvedené len v texte správy nie je výnimka
    expect(run('push-throttle.mjs', 'pre', bash('git commit -m "WALL_PUSH_OK=1" && git push'), env()).code).toBe(2)
  })

  it('rozpozná aj `git -C dir push` a push v reťazci príkazov', () => {
    recordPush()
    expect(run('push-throttle.mjs', 'pre', bash('git -C /tmp/x push origin b'), env()).code).toBe(2)
    expect(run('push-throttle.mjs', 'pre', bash('git add -A && git commit -m x && git push -u origin b'), env()).code).toBe(2)
  })

  it('zlyhaný push (rejected / fatal) čas NEzapíše — retry po zlyhaní sa neblokuje', () => {
    recordPush(' ! [rejected]        b -> b (fetch first)\nerror: failed to push some refs\n')
    expect(existsSync(state)).toBe(false)
    recordPush('fatal: unable to access https://github.com/x/y.git/: Could not resolve host\n')
    expect(existsSync(state)).toBe(false)
    expect(run('push-throttle.mjs', 'pre', bash('git push -u origin b'), env()).code).toBe(0)
  })

  it('push viacerých refov: jeden prešiel, druhý odmietnutý → platí ako úspech (CI sa spustilo)', () => {
    recordPush('   4915be0..2db58c3  a -> a\n ! [rejected]        b -> b (fetch first)\nerror: failed to push some refs\n')
    expect(existsSync(state)).toBe(true)
  })

  it('„Everything up-to-date" čas nezapíše (nič sa nenasadilo)', () => {
    recordPush('Everything up-to-date\n')
    expect(existsSync(state)).toBe(false)
  })

  it.each([
    ['fast-forward', '   4915be0..2db58c3  b -> b\n'],
    ['forced update', ' + 6de2a5a...ec2b5fa b -> b (forced update)\n'],
    ['nová vetva', ' * [new branch]      b -> b\n'],
  ])('úspešný push (%s) čas zapíše', (_n, out) => {
    recordPush(out)
    expect(existsSync(state)).toBe(true)
    expect(run('push-throttle.mjs', 'pre', bash('git push'), env()).code).toBe(2)
  })

  it('odpoveď ako holý reťazec (nie objekt) sa tiež vyhodnotí', () => {
    run('push-throttle.mjs', 'post', bash('git push', { tool_response: OK_PUSH }), env())
    expect(existsSync(state)).toBe(true)
  })

  it('push cez WALL_PUSH_OK sa zapíše, takže nasledujúci bežný push je zasa throttlovaný', () => {
    recordPush(OK_PUSH, 'WALL_PUSH_OK=1 git push -u origin b')
    expect(run('push-throttle.mjs', 'pre', bash('git push'), env()).code).toBe(2)
  })

  it('fail-open: neplatný vstup alebo prázdny stdin nikdy neblokuje', () => {
    expect(run('push-throttle.mjs', 'pre', 'not json', env()).code).toBe(0)
    expect(run('push-throttle.mjs', 'pre', '', env()).code).toBe(0)
    writeFileSync(state, 'rozbitý súbor')
    expect(run('push-throttle.mjs', 'pre', bash('git push'), env()).code).toBe(0)
  })
})
