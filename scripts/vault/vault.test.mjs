import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assignFileNames,
  buildTokenMap,
  classify,
  collectPrs,
  frontmatter,
  isOverwritable,
  linkify,
  nextStep,
  renderDecision,
  splitDecisions,
  splitSessions,
  tokenOf,
} from './lib.mjs';

const ctx = { exportedOn: '2026-10-01' };

test('splitDecisions: všetky tri tvary hlavičky + približný dátum', () => {
  const md = [
    '# Log',
    '## [2026-10-01] AAA-BBB — prvé (BUILD)',
    'telo 1',
    '## 2026-09-29 — CCC-DDD: druhé',
    'telo 2',
    '## D-2026-08-06-01 — Tretie',
    'telo 3',
    '## [2026-06-XX] - AP-019 Schema — BUILD',
    'telo 4',
  ].join('\n');
  const d = splitDecisions(md);
  assert.equal(d.length, 4);
  assert.deepEqual(d.map((x) => x.date), ['2026-10-01', '2026-09-29', '2026-08-06', '2026-06-01']);
  assert.equal(d[3].approx, true);
  assert.equal(d[2].id, 'D-2026-08-06-01');
  assert.equal(d[0].body, 'telo 1');
});

test('splitDecisions: `## ` v code fence nie je hlavička', () => {
  const md = '## [2026-10-01] X-YZ — a\n```\n## [2026-01-01] FAKE — b\n```\n';
  assert.equal(splitDecisions(md).length, 1);
});

test('splitSessions: netypické formáty hlavičky sa nestratia', () => {
  const md = [
    '## Session 2026-10-01 (LEAD-PIPELINE-AFTER)',
    'a',
    '## Session 2026-09-18c (critical bug hunt)',
    'b',
    '## Session 2026-09-28/29 (PR-BACKLOG-TRIAGE, škoda)',
    'c',
    '## Session 2026-09-19 → 2026-09-21 (Control Plane)',
    'd',
  ].join('\n');
  const s = splitSessions(md);
  assert.equal(s.length, 4);
  assert.equal(s[0].title, 'LEAD-PIPELINE-AFTER');
  assert.equal(s[1].title, 'critical bug hunt');
  assert.equal(s[3].date, '2026-09-19');
});

test('assignFileNames: kolízie dostanú príponu, nič sa neprepíše', () => {
  const e = assignFileNames(
    [{ date: '2026-10-01', t: 'ABC-DEF' }, { date: '2026-10-01', t: 'ABC-DEF' }],
    (x) => x.t,
  );
  assert.deepEqual(e.map((x) => x.file), ['2026-10-01-abc-def', '2026-10-01-abc-def-2']);
});

test('tokenOf: rozpozná ID, nie voľný text', () => {
  assert.equal(tokenOf('LEAD-PIPELINE-AFTER — popis'), 'LEAD-PIPELINE-AFTER');
  assert.equal(tokenOf('AP-019 Schema allowlist'), null); // medzera → nie token (nehádame)
  assert.equal(tokenOf('Príjem leadov: dva výpadky'), null);
});

test('linkify: token → wikilink, ale nie v kóde, nadpise, vlastnom súbore, existujúcom linku', () => {
  const map = new Map([['LEAD-PIPELINE-AFTER', 'f-lpa'], ['SELF-TOKEN', 'f-self']]);
  const body = [
    '## LEAD-PIPELINE-AFTER v nadpise',
    'Viď LEAD-PIPELINE-AFTER a `LEAD-PIPELINE-AFTER` a [[x|LEAD-PIPELINE-AFTER]] a SELF-TOKEN.',
    '```',
    'LEAD-PIPELINE-AFTER',
    '```',
    'XLEAD-PIPELINE-AFTER-2 nie je token',
  ].join('\n');
  const out = linkify(body, map, 'f-self').split('\n');
  assert.equal(out[0], '## LEAD-PIPELINE-AFTER v nadpise');
  assert.equal(out[1], 'Viď [[f-lpa|LEAD-PIPELINE-AFTER]] a `LEAD-PIPELINE-AFTER` a [[x|LEAD-PIPELINE-AFTER]] a SELF-TOKEN.');
  assert.equal(out[3], 'LEAD-PIPELINE-AFTER');
  assert.equal(out[5], 'XLEAD-PIPELINE-AFTER-2 nie je token');
});

test('linkify: #PR → odkaz na GitHub, ale nie v kóde ani v URL', () => {
  const out = linkify('PR #780 zlúčil; `#781`; https://x.y/#782', new Map(), 'f', 'https://gh/r');
  assert.equal(out, 'PR [#780](https://gh/r/pull/780) zlúčil; `#781`; https://x.y/#782');
  assert.deepEqual(collectPrs('#780 a #12 a #780'), [12, 780]);
});

test('frontmatter: ISO dátum bez úvodzoviek (Dataview), text s dvojbodkou v úvodzovkách', () => {
  const fm = frontmatter({ date: '2026-10-01', title: 'a: b', tags: ['x'], skip: null, empty: [] });
  assert.equal(fm, '---\ndate: 2026-10-01\ntitle: "a: b"\ntags:\n  - x\n---');
});

test('classify: verdikt podľa priority, REJECT prebije VALIDATE', () => {
  assert.equal(classify('PROON — REJECT ako celok, 1 vzor na VALIDATE', '').verdict, 'reject');
  assert.equal(classify('X (BUILD, GO foundera; NEnasadené)', '').tags.includes('status/pending'), true);
  assert.equal(classify('nič', 'telo').verdict, null);
});

test('isOverwritable: nový alebo vlastný súbor áno, ručná poznámka nie', () => {
  assert.equal(isOverwritable(null), true);
  assert.equal(isOverwritable('---\ngenerated: true\n---\nx'), true);
  assert.equal(isOverwritable('# Moja ručná poznámka'), false);
});

test('nextStep: vytiahne sekciu Ďalší krok', () => {
  assert.equal(nextStep('### Dokončené\n- a\n### Ďalší krok\nUrob X.\n\n### Iné\n'), 'Urob X.');
});

test('renderDecision: telo ostáva doslovné okrem liniek, frontmatter nesie marker generated', () => {
  const d = { date: '2026-10-01', approx: false, title: 'AAA-BBB — t (BUILD)', id: null, body: 'Text #780', file: 'f', token: 'AAA-BBB' };
  const out = renderDecision(d, new Map(), ctx);
  assert.match(out, /generated: true/);
  assert.match(out, /decision_id: AAA-BBB/);
  assert.match(out, /Text \[#780\]/);
  assert.match(out, /prs:\n {2}- 780/);
});

test('buildTokenMap: pri duplicite vyhrá najnovší záznam (vstup je od najnovšieho)', () => {
  const m = buildTokenMap([
    { id: null, title: 'SAME-TOK — nové', file: 'new' },
    { id: null, title: 'SAME-TOK — staré', file: 'old' },
  ]);
  assert.equal(m.get('SAME-TOK'), 'new');
});
