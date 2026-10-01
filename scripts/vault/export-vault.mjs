#!/usr/bin/env node
/**
 * export-vault.mjs — jednosmerný export `memory/` → Obsidian vault.
 *
 * Spúšťa FOUNDER ručne (swarm do RealitkaAI-Memory nezapisuje — rozhodnutie 2026-09-04).
 * Skript sieť nevolá a nič nemaže. Prepíše len súbory, ktoré sám vytvoril
 * (`generated: true` vo frontmatteri); ručne písané poznámky a súbory bez markera
 * nechá nedotknuté a vypíše ich.
 *
 * Použitie:
 *   npm run vault:export -- --out "C:\RealitkaAI-Memory" [--dry-run]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TEMPLATES,
  assignFileNames,
  buildTokenMap,
  frontmatter,
  isOverwritable,
  renderDashboard,
  renderDecision,
  renderDecisionIndex,
  renderHome,
  renderSession,
  renderSessionIndex,
  splitDecisions,
  splitSessions,
} from './lib.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OPS_LABELS = {
  'open-tasks': 'prioritizovaná fronta úloh',
  people: 'agenti, tím, stakeholderi',
  integrations: 'integrácie',
  offer: 'ponuka',
  personality: 'persona',
  preferences: 'preferencie',
  skills: 'skills',
  user: 'founder',
};

function parseArgs(argv) {
  const args = { out: null, dry: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--dry-run') args.dry = true;
  }
  return args;
}

const { out, dry } = parseArgs(process.argv.slice(2));
if (!out) {
  console.error('Chýba --out <cesta k vaultu>, napr. --out "C:\\RealitkaAI-Memory". Nič sa nezapísalo.');
  process.exit(2);
}
const vault = resolve(out);
const ctx = { exportedOn: new Date().toISOString().slice(0, 10) };
const stats = { written: 0, unchanged: 0, preserved: [] };

function put(rel, text, { onlyIfAbsent = false } = {}) {
  const path = join(vault, rel);
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (existing !== null && (onlyIfAbsent || !isOverwritable(existing))) {
    stats.preserved.push(rel);
    return;
  }
  if (existing === text) {
    stats.unchanged++;
    return;
  }
  stats.written++;
  if (dry) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, 'utf8');
}

const read = (name) => readFileSync(join(ROOT, 'memory', name), 'utf8');

const decisions = assignFileNames(splitDecisions(read('decisions.md')), (d) => d.id ?? d.title.split(/\s[—–-]\s|:\s/)[0]);
const sessions = assignFileNames(splitSessions(read('session-summary.md')), (s) => s.title.split(/\s+[—–]\s+/)[0]);
decisions.sort((a, b) => b.date.localeCompare(a.date)); // stabilné: v rámci dňa ostáva poradie zo súboru
sessions.sort((a, b) => b.date.localeCompare(a.date));
decisions.forEach((d, i) => {
  d.next = decisions[i - 1]?.file ?? null; // novšie
  d.prev = decisions[i + 1]?.file ?? null; // staršie
});
const tokenMap = buildTokenMap(decisions);

for (const d of decisions) put(`01-DECISIONS/${d.file}.md`, renderDecision(d, tokenMap, ctx));
for (const s of sessions) put(`02-SESSIONS/${s.file}.md`, renderSession(s, tokenMap, ctx));
put('01-DECISIONS/Decision-Index.md', renderDecisionIndex(decisions, ctx));
put('02-SESSIONS/Session-Index.md', renderSessionIndex(sessions, ctx));

const opsFiles = [];
for (const f of readdirSync(join(ROOT, 'memory')).filter((n) => n.endsWith('.md')).sort()) {
  const name = f.replace(/\.md$/, '');
  if (name === 'decisions' || name === 'session-summary') continue;
  opsFiles.push({ name, label: OPS_LABELS[name] ?? 'operačná pamäť' });
  const title = name.replace(/(^|-)(\w)/g, (_, a, b) => (a ? ' ' : '') + b.toUpperCase());
  const fm = frontmatter({ type: 'ops', title, tags: ['ops'], source: `memory/${f}`, exported: ctx.exportedOn, generated: true });
  put(`03-OPS/${name}.md`, `${fm}\n\n↑ [[HOME]]\n\n${read(f)}`);
}

put('HOME.md', renderHome({ decisions, sessions, opsFiles }, ctx));
put('Dashboard.md', renderDashboard(ctx));
for (const [name, text] of Object.entries(TEMPLATES)) put(`99-TEMPLATES/${name}`, text, { onlyIfAbsent: true });

const mode = dry ? 'DRY-RUN (nič nezapísané)' : 'zapísané';
console.log(`vault: ${vault} — ${mode}`);
console.log(`rozhodnutia ${decisions.length} · sessions ${sessions.length} · ops ${opsFiles.length}`);
console.log(`nové/zmenené ${stats.written} · bezo zmeny ${stats.unchanged} · zachované (ručné/bez markera) ${stats.preserved.length}`);
for (const p of stats.preserved.slice(0, 10)) console.log(`  zachované: ${p}`);
