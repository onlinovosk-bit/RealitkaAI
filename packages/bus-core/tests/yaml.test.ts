import test from "node:test";
import assert from "node:assert/strict";
import { parseYaml, stringifyYaml, YamlParseError } from "../src/yaml.ts";

test("parses nested maps, sequences and scalars", () => {
  const parsed = parseYaml(
    [
      "id: TASK-0100",
      "status: done   # deliverables on main",
      "count: 12",
      "ratio: 1.5",
      "enabled: true",
      "missing: null",
      "scope:",
      "  repo_paths:",
      "    - apps/crm/scripts/judge.mjs",
      "    - .ai/bus/ledger/**",
      "  external_systems: []",
      "acceptance:",
      "  - id: A1",
      '    desc: "typova chyba nepribudla"',
      "    cmd: node apps/crm/scripts/typecheck-baseline.mjs",
      "  - id: A2",
      "    desc: lint",
    ].join("\n"),
  );

  assert.equal(parsed.id, "TASK-0100");
  assert.equal(parsed.status, "done");
  assert.equal(parsed.count, 12);
  assert.equal(parsed.ratio, 1.5);
  assert.equal(parsed.enabled, true);
  assert.equal(parsed.missing, null);
  assert.deepEqual((parsed.scope as Record<string, unknown>).repo_paths, [
    "apps/crm/scripts/judge.mjs",
    ".ai/bus/ledger/**",
  ]);
  assert.deepEqual((parsed.scope as Record<string, unknown>).external_systems, []);
  assert.deepEqual(parsed.acceptance, [
    { id: "A1", desc: "typova chyba nepribudla", cmd: "node apps/crm/scripts/typecheck-baseline.mjs" },
    { id: "A2", desc: "lint" },
  ]);
});

test("keeps # inside quoted values", () => {
  const parsed = parseYaml('summary: "issue #347 audited"');
  assert.equal(parsed.summary, "issue #347 audited");
});

test("supports block scalars", () => {
  const parsed = parseYaml(["note: |", "  line one", "  line two", "other: x"].join("\n"));
  assert.equal(parsed.note, "line one\nline two");
  assert.equal(parsed.other, "x");
});

test("throws instead of guessing on unsupported syntax", () => {
  assert.throws(() => parseYaml("just a bare line"), YamlParseError);
});

test("round-trips through stringify", () => {
  const value = {
    id: "MSG-20260918-001-x",
    counters: { safe_to_delete: 281, open_pr: 31 },
    evidence: { commands: ["git branch -r"], urls: [] },
    decisions_required: [{ id: "D1", question: "Delete 281 branches?", gate: "GO REQUIRED" }],
    summary: "347 branches: 281 safe, 31 open PR",
  };
  assert.deepEqual(parseYaml(stringifyYaml(value)), value);
});

test("quotes values that would otherwise change type", () => {
  const text = stringifyYaml({ a: "true", b: "12", c: "- dash", d: "has: colon" });
  assert.deepEqual(parseYaml(text), { a: "true", b: "12", c: "- dash", d: "has: colon" });
});

test("supports chomping indicators on block scalars", () => {
  const parsed = parseYaml(["description: >-", "  first line", "  second line", "gate: GO REQUIRED"].join("\n"));
  assert.equal(parsed.description, "first line second line");
  assert.equal(parsed.gate, "GO REQUIRED");
});

test("reports text that YAML drops as a comment, and grades how suspicious it is", () => {
  const seen: Array<{ lineNo: number; kept: string; dropped: string; suspicious: boolean }> = [];
  const parsed = parseYaml(
    [
      "# a whole-line comment is not a loss",
      "summary: PR #593 is open",
      "status: done   # deliverables landed on main",
      'quoted: "issue #347 stays"',
      "plain: nothing to drop",
    ].join("\n"),
    { onComment: (comment) => seen.push(comment) },
  );

  assert.equal(parsed.summary, "PR", "YAML keeps only the text before the #");
  assert.equal(parsed.status, "done");
  assert.equal(parsed.quoted, "issue #347 stays");

  assert.deepEqual(
    seen.map(({ lineNo, kept, suspicious }) => ({ lineNo, kept, suspicious })),
    [
      { lineNo: 2, kept: "summary: PR", suspicious: true },
      { lineNo: 3, kept: "status: done", suspicious: false },
    ],
  );
  assert.equal(seen[0]!.dropped, "#593 is open");
});

test("parsing without a comment collector still works", () => {
  assert.deepEqual(parseYaml("a: 1 # note"), { a: 1 });
});
