#!/usr/bin/env node
// Pracovný protokol „steny, nie skrutky" — re-injekcia do kontextu, aby nezávisel od pamäte modelu.
//
//   start  → SessionStart:      celý `.claude/working-protocol.md`
//   turn   → UserPromptSubmit:  skrátená verzia pri KAŽDEJ správe foundera
//
// stdout týchto hookov sa pridáva do kontextu. Skript nikdy nepadá (exit 0 vždy) — hook nesmie
// zablokovať prácu kvôli vlastnej chybe.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const COMPACT = [
  '[PROTOKOL: steny, nie skrutky] 1 GO = 1 celá stena + dôkaz (nikdy rad mikro-GO). Pred ručným krokom foundera prečítaj celú cestu kódu.',
  'Upozornenie bez zmeny = ticho (max 1 riadok). 1 push + 1 memory commit na stenu (hook blokuje 2. `git push` do 20 min; výnimka `WALL_PUSH_OK=1` + dôvod).',
  'Blok končí riadkom `Postup: X % → Y %`. Číslo = merané alebo „nemerané". Plný text: .claude/working-protocol.md',
].join('\n')

const mode = process.argv[2] ?? 'turn'
try {
  if (mode === 'start') {
    const here = dirname(fileURLToPath(import.meta.url))
    process.stdout.write(readFileSync(join(here, '..', 'working-protocol.md'), 'utf8'))
  } else {
    process.stdout.write(`${COMPACT}\n`)
  }
} catch {
  process.stdout.write(`${COMPACT}\n`)
}
process.exit(0)
