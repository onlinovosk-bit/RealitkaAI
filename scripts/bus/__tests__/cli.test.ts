import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../cli.ts");

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], busRoot: string): Promise<Run> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [cli, ...args],
      { env: { ...process.env, REVOLIS_BUS_ROOT: busRoot } },
      (error, stdout, stderr) => {
        resolve({ code: error && typeof error.code === "number" ? error.code : 0, stdout, stderr });
      },
    );
  });
}

const HEADER = [
  "---",
  "v: 1",
  "type: state",
  "status: open",
  "from: claude-code",
  "to: sol-gpt",
  "created_at: 2026-09-18T09:00:00Z",
];

async function draft(dir: string, summaryLine: string): Promise<string> {
  const file = path.join(dir, "draft.md");
  await writeFile(file, [...HEADER, summaryLine, "---", "", "## Summary", "", "detail"].join("\n"), "utf8");
  return file;
}

test("send refuses a draft whose text YAML would eat", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "bus-cli-"));
  const file = await draft(dir, "summary: PR #593 is open");

  const run = await runCli(["send", "--box", "outbox", "--file", file, "--slug", "pr-593"], dir);

  assert.equal(run.code, 1);
  assert.match(run.stderr, /would lose text to YAML comments/);
  assert.match(run.stderr, /line 8: "#593 is open"/);
  assert.match(run.stderr, /wrap the value in quotes/);

  const listed = await runCli(["pull", "--box", "outbox"], dir);
  assert.match(listed.stdout, /BUS: empty/, "nothing may be written when text would be lost");
});

test("send accepts the same draft once the value is quoted", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "bus-cli-"));
  const file = await draft(dir, 'summary: "PR #593 is open"');

  const run = await runCli(["send", "--box", "outbox", "--file", file, "--slug", "pr-593"], dir);

  assert.equal(run.code, 0);
  assert.match(run.stdout, /SUMMARY: PR #593 is open/);

  const stored = await readFile(path.join(dir, "outbox", "MSG-20260918-001-pr-593.md"), "utf8");
  assert.match(stored, /summary: "PR #593 is open"/);
});

test("a deliberate comment does not block send", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "bus-cli-"));
  const file = await draft(dir, "summary: handshake done   # closed on main");

  const run = await runCli(["send", "--box", "outbox", "--file", file, "--slug", "note"], dir);

  assert.equal(run.code, 0);
  assert.match(run.stdout, /SUMMARY: handshake done/);
});
