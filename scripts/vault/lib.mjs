/**
 * lib.mjs — čisté funkcie exportéra Obsidian vaultu (žiadne I/O, žiadna sieť).
 *
 * Vstup: `memory/decisions.md`, `memory/session-summary.md` (chronologické logy).
 * Výstup: samostatné poznámky s frontmatterom + wikilinkami, aby Obsidian vedel
 * graf, backlinky, Dataview a Tasks. Telo záznamov sa NEPREPISUJE — len sa
 * linkujú tokeny rozhodnutí a čísla PR.
 */

export const REPO_URL = 'https://github.com/onlinovosk-bit/RealitkaAI';

const DATE = String.raw`\d{4}-\d{2}-(?:\d{2}|XX)`;
const DECISION_HEAD = new RegExp(
  String.raw`^## (?:\[(${DATE})\]|(${DATE})|(D-(\d{4}-\d{2}-\d{2})-\d{2}))\s*(?:[—–-]\s*)?(.*)$`,
  'i',
);
// Toleruje `2026-09-18c`, `2026-09-28/29`, `2026-09-19 → 2026-09-21 (…)`: dátum = prvý ISO dátum, zvyšok = názov.
const SESSION_HEAD = new RegExp(String.raw`^## Session (${DATE})(\S*)\s*(.*)$`, 'i');

export function slugify(text, max = 60) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
}

/** `2026-06-XX` → `2026-06-01` (+ approx=true), aby sa dalo triediť. */
export function normalizeDate(raw) {
  const approx = /XX$/i.test(raw);
  return { date: approx ? raw.slice(0, 8) + '01' : raw, approx };
}

/** Úvodný token „LEAD-PIPELINE-AFTER" / „AP-019" / „D-2026-08-06-01" z titulku, ak existuje. */
export function tokenOf(title) {
  const head = title.split(/\s[—–-]\s|:\s/)[0].trim().replace(/^[\s*`]+|[\s*`]+$/g, '');
  return /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/.test(head) ? head : null;
}

export function classify(title, body) {
  const text = `${title}\n${body.slice(0, 300)}`;
  const tags = new Set();
  let verdict = null;
  for (const [re, v] of [
    [/\bREJECT\b/, 'reject'],
    [/\bBACKLOG\b/, 'backlog'],
    [/\bVALIDATE\b/, 'validate'],
    [/\bBUILD\b/, 'build'],
  ]) {
    if (re.test(text)) {
      verdict = v;
      tags.add(`verdict/${v}`);
      break;
    }
  }
  if (/PROD (?:zápis|SELECT)/i.test(text)) tags.add('kind/prod');
  if (/read-only/i.test(text)) tags.add('kind/read-only');
  if (/NEnasaden|NEMERG|čaká na GO/i.test(text)) tags.add('status/pending');
  return { verdict, tags: [...tags] };
}

/** Rozdelí log na záznamy podľa `## ` hlavičiek; nedatované `##` zostanú v tele predchádzajúceho. */
function splitByHeads(md, matchHead) {
  const lines = md.split('\n');
  const entries = [];
  let cur = null;
  let fence = false;
  for (const line of lines) {
    if (/^```/.test(line)) fence = !fence;
    const m = !fence && line.startsWith('## ') ? matchHead(line) : null;
    if (m) {
      cur = { ...m, bodyLines: [] };
      entries.push(cur);
    } else if (cur) {
      cur.bodyLines.push(line);
    }
  }
  for (const e of entries) {
    e.body = e.bodyLines.join('\n').replace(/^\n+|\s+$/g, '');
    delete e.bodyLines;
  }
  return entries;
}

export function splitDecisions(md) {
  return splitByHeads(md, (line) => {
    const m = DECISION_HEAD.exec(line);
    if (!m) return null;
    const dId = m[3];
    const rawDate = m[1] ?? m[2] ?? m[4];
    const { date, approx } = normalizeDate(rawDate);
    const title = (m[5] ?? '').trim() || dId || rawDate;
    return { date, approx, title, id: dId ?? null };
  });
}

export function splitSessions(md) {
  return splitByHeads(md, (line) => {
    const m = SESSION_HEAD.exec(line);
    if (!m) return null;
    const { date, approx } = normalizeDate(m[1]);
    let rest = (m[3] ?? '').trim();
    if (rest.startsWith('(') && rest.endsWith(')')) rest = rest.slice(1, -1).trim();
    const suffix = (m[2] ?? '').replace(/^[^a-z]+/i, '');
    return { date, approx, title: rest || suffix || 'bez-názvu' };
  });
}

/** Unikátne názvy súborov: `YYYY-MM-DD-slug`, kolízia → `-2`, `-3`. */
export function assignFileNames(entries, slugSource) {
  const used = new Map();
  for (const e of entries) {
    const base = `${e.date}-${slugify(slugSource(e)) || 'zaznam'}`;
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    e.file = n === 1 ? base : `${base}-${n}`;
  }
  return entries;
}

/** token → súbor najnovšieho záznamu (vstup je zoradený od najnovšieho). */
export function buildTokenMap(decisions) {
  const map = new Map();
  for (const d of decisions) {
    const t = d.id ?? tokenOf(d.title);
    d.token = t;
    if (t && t.length >= 6 && !map.has(t)) map.set(t, d.file);
  }
  return map;
}

const PROTECT = /(`[^`\n]*`|\[\[[^\]]*\]\]|\[[^\]]*\]\([^)]*\)|https?:\/\/\S+)/;

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Linkuje tokeny rozhodnutí a #PR mimo kódu, existujúcich liniek a nadpisov. */
export function linkify(body, tokenMap, selfFile, repoUrl = REPO_URL) {
  const tokens = [...tokenMap.keys()].sort((a, b) => b.length - a.length);
  const tokenRe = tokens.length
    ? new RegExp(`(?<![A-Za-z0-9_-])(${tokens.map(escapeRe).join('|')})(?![A-Za-z0-9_-])`, 'g')
    : null;
  const prRe = /(?<![\w&/#])#(\d{2,5})\b/g;
  let fence = false;
  return body
    .split('\n')
    .map((line) => {
      if (/^\s*```/.test(line)) {
        fence = !fence;
        return line;
      }
      if (fence || /^#{1,6}\s/.test(line)) return line;
      return line
        .split(PROTECT)
        .map((seg, i) => {
          if (i % 2 === 1) return seg;
          let out = seg;
          if (tokenRe) {
            out = out.replace(tokenRe, (tok) => {
              const target = tokenMap.get(tok);
              return target === selfFile ? tok : `[[${target}|${tok}]]`;
            });
          }
          // PR odkazy len mimo už vložených wikilinkov (tie sú v `out`, preto kontrola cez split)
          return out
            .split(/(\[\[[^\]]*\]\])/)
            .map((s, j) => (j % 2 === 1 ? s : s.replace(prRe, (_, n) => `[#${n}](${repoUrl}/pull/${n})`)))
            .join('');
        })
        .join('');
    })
    .join('\n');
}

export function collectPrs(body) {
  return [...new Set([...body.matchAll(/(?<![\w&/#])#(\d{2,5})\b/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
}

function yamlScalar(v) {
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // ISO dátum bez úvodzoviek — Dataview ho vtedy číta ako dátum
  return /^[A-Za-z0-9_./-]+$/.test(s) && !/^(true|false|null|yes|no|\d.*)$/i.test(s) ? s : JSON.stringify(s);
}

export function frontmatter(obj) {
  const out = ['---'];
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      out.push(`${k}:`, ...v.map((x) => `  - ${yamlScalar(x)}`));
    } else {
      out.push(`${k}: ${yamlScalar(v)}`);
    }
  }
  out.push('---');
  return out.join('\n');
}

export const GENERATED_MARK = 'generated: true';

/** Prepísať smieme len súbor, ktorý exportér sám vytvoril (marker vo frontmatteri). */
export function isOverwritable(existingText) {
  return existingText === null || existingText.slice(0, 600).includes(GENERATED_MARK);
}

export function nextStep(sessionBody) {
  const m = /###\s*Ďalší krok\s*\n+([\s\S]*?)(?=\n###\s|\n##\s|$)/.exec(sessionBody);
  return m ? m[1].trim() : null;
}

export function renderDecision(d, tokenMap, ctx) {
  const { verdict, tags } = classify(d.title, d.body);
  const body = linkify(d.body, tokenMap, d.file);
  const fm = frontmatter({
    type: 'decision',
    title: d.title,
    date: d.date,
    date_approx: d.approx || null,
    month: d.date.slice(0, 7),
    decision_id: d.token,
    verdict,
    tags: ['decision', ...tags],
    prs: collectPrs(d.body),
    source: 'memory/decisions.md',
    exported: ctx.exportedOn,
    generated: true,
  });
  const nav = [
    `↑ [[Decision-Index]] · [[HOME]]`,
    d.prev ? `← [[${d.prev}]]` : null,
    d.next ? `→ [[${d.next}]]` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return `${fm}\n\n# ${d.title}\n\n${nav}\n\n${body}\n`;
}

export function renderSession(s, tokenMap, ctx) {
  const body = linkify(s.body, tokenMap, s.file);
  const tok = tokenOf(s.title.split(/\s+[—–]\s+/)[0]);
  const linked = tok && tokenMap.get(tok) ? `Rozhodnutie: [[${tokenMap.get(tok)}|${tok}]]\n\n` : '';
  const fm = frontmatter({
    type: 'session',
    title: s.title,
    date: s.date,
    date_approx: s.approx || null,
    month: s.date.slice(0, 7),
    decision_id: tok,
    tags: ['session'],
    prs: collectPrs(s.body),
    source: 'memory/session-summary.md',
    exported: ctx.exportedOn,
    generated: true,
  });
  return `${fm}\n\n# Session ${s.date} — ${s.title}\n\n↑ [[Session-Index]] · [[HOME]]\n\n${linked}${body}\n`;
}

function byMonth(entries) {
  const groups = new Map();
  for (const e of entries) {
    const m = e.date.slice(0, 7);
    if (!groups.has(m)) groups.set(m, []);
    groups.get(m).push(e);
  }
  return groups;
}

export function renderDecisionIndex(decisions, ctx) {
  const lines = [
    frontmatter({ type: 'index', tags: ['index', 'decision'], exported: ctx.exportedOn, generated: true }),
    '',
    '# Decision Index',
    '',
    `Každé strategické rozhodnutie s kontextom prečo. **${decisions.length} záznamov**, najnovšie hore.`,
    'Zdroj pravdy: `memory/decisions.md` (generované, needituj — ručné poznámky patria do `Decision-Log`).',
    '',
  ];
  for (const [month, items] of byMonth(decisions)) {
    lines.push(`## ${month}`, '');
    for (const d of items) {
      const v = classify(d.title, d.body).verdict;
      lines.push(`- ${d.date} — [[${d.file}|${d.title.length > 110 ? d.title.slice(0, 107) + '…' : d.title}]]${v ? ` · \`${v}\`` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function renderSessionIndex(sessions, ctx) {
  const lines = [
    frontmatter({ type: 'index', tags: ['index', 'session'], exported: ctx.exportedOn, generated: true }),
    '',
    '# Session Index',
    '',
    `Chronologický log sessions. **${sessions.length} záznamov**, najnovšie hore.`,
    '',
  ];
  for (const [month, items] of byMonth(sessions)) {
    lines.push(`## ${month}`, '');
    for (const s of items) lines.push(`- ${s.date} — [[${s.file}|${s.title}]]`);
    lines.push('');
  }
  return lines.join('\n');
}

const short = (t, n = 100) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

export function renderHome({ decisions, sessions, opsFiles }, ctx) {
  const last = sessions[0];
  const step = last ? nextStep(last.body) : null;
  const lines = [
    frontmatter({ type: 'home', tags: ['home'], exported: ctx.exportedOn, generated: true }),
    '',
    '# Revolis.AI — Memory Vault',
    '',
    `> Export z \`memory/\` · ${ctx.exportedOn} · ${decisions.length} rozhodnutí · ${sessions.length} sessions.`,
    '> Čítať, hľadať, prepájať. Zdroj pravdy je repo — export je jednosmerný (repo → vault).',
    '',
    '## Teraz',
    '',
    last ? `- Posledná session: [[${last.file}|${last.date} — ${last.title}]]` : '- (žiadna session)',
    step ? `- Ďalší krok:\n  > ${step.split('\n').join('\n  > ')}` : null,
    decisions[0] ? `- Posledné rozhodnutie: [[${decisions[0].file}|${short(decisions[0].title)}]]` : null,
    '',
    '## Mapy',
    '',
    '- [[Decision-Index]] — všetky rozhodnutia',
    '- [[Session-Index]] — všetky sessions',
    '- [[Dashboard]] — Dataview/Tasks pohľady',
    ...opsFiles.map((f) => `- [[${f.name}]] — ${f.label}`),
    '',
    '## Repo (mimo vaultu)',
    '',
    `- [Constitution v2](${REPO_URL}/blob/main/docs/architecture/revolis-constitution-v2.md) — brána pred každým featurom`,
    `- [Data sourcing map](${REPO_URL}/blob/main/docs/architecture/master-data-sourcing-map.md)`,
    `- [Mapa poznania](${REPO_URL}/blob/main/docs/architecture/MAPA.md)`,
    '',
  ];
  return lines.filter((l) => l !== null).join('\n');
}

export function renderDashboard(ctx) {
  return `${frontmatter({ type: 'dashboard', tags: ['dashboard'], exported: ctx.exportedOn, generated: true })}

# Dashboard

> Vyžaduje komunitné pluginy **Dataview** a **Tasks**. Bez nich ostávajú [[Decision-Index]] a [[Session-Index]] plne funkčné.

## Posledných 15 rozhodnutí

\`\`\`dataview
TABLE date AS Dátum, verdict AS Verdikt, prs AS PR
FROM "01-DECISIONS"
WHERE type = "decision"
SORT date DESC
LIMIT 15
\`\`\`

## Rozhodnutia podľa verdiktu

\`\`\`dataview
TABLE length(rows) AS Počet
FROM "01-DECISIONS"
WHERE type = "decision" AND verdict
GROUP BY verdict
\`\`\`

## Čaká na GO / nenasadené

\`\`\`dataview
LIST
FROM "01-DECISIONS"
WHERE type = "decision" AND contains(tags, "status/pending")
SORT date DESC
LIMIT 20
\`\`\`

## Otvorené úlohy

\`\`\`tasks
not done
path includes 03-OPS
limit 25
\`\`\`
`;
}

export const TEMPLATES = {
  'Decision-Template.md': `---
type: decision
title: "{{title}}"
date: {{date:YYYY-MM-DD}}
verdict:
tags:
  - decision
---

# {{title}}

**Rozhodnutie (BUILD / BACKLOG / VALIDATE / REJECT):**

**Prečo (Ústava v2 — 12 otázok):**

**Dôkaz:**

**Súvisiace:** [[Decision-Index]]
`,
  'Session-Template.md': `---
type: session
title: "{{title}}"
date: {{date:YYYY-MM-DD}}
tags:
  - session
---

# Session {{date:YYYY-MM-DD}} — {{title}}

### Dokončené
-

### Rozpracované / Pending
-

### Kľúčové súbory zmenené
-

### Ďalší krok

`,
};
