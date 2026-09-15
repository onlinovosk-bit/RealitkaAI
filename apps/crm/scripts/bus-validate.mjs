#!/usr/bin/env node
/**
 * Bus envelope ratchet — validates YAML frontmatter under .ai/bus/ (all .md).
 * New violations fail --ci; existing ones live in bus-validate-baseline.json.
 *
 * Usage:
 *   node apps/crm/scripts/bus-validate.mjs
 *   node apps/crm/scripts/bus-validate.mjs --write-baseline
 *   node apps/crm/scripts/bus-validate.mjs --ci
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const CRM_ROOT = join(__dirname, "..");
const REPO_ROOT = join(CRM_ROOT, "..", "..");
const BUS_ROOT = join(REPO_ROOT, ".ai", "bus");
const BASELINE = join(CRM_ROOT, "scripts", "bus-validate-baseline.json");

const CANONICAL_STATUS = new Set([
  "CREATED", "PLANNED", "ASSIGNED", "IN_PROGRESS", "WAITING",
  "RESULT_READY", "VERIFYING", "VERIFIED", "CLOSED",
  "BLOCKED", "RETRY", "NEEDS_INPUT", "ESCALATED",
]);
const LEGACY_STATUS = new Set([
  "done", "blocked", "open", "draft", "archived", "in_progress", "pending",
]);
const ALLOWED_STATUS = new Set([...CANONICAL_STATUS, ...LEGACY_STATUS]);

const MESSAGE_TYPES = new Set([
  "TASK", "QUESTION", "PROPOSAL", "CRITIQUE", "RESULT", "DECISION", "BLOCKED", "VERIFICATION",
]);
const DOC_TYPES = new Set(["task", "context", "result", "decision", "state"]);

const ENVELOPE_KEYS = [
  "trace_id", "parent_task_id", "context_refs", "memory_refs", "constraints",
  "budget", "deadline", "required_capabilities", "approval_required", "idempotency_key",
];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

function parseFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end < 0) return null;
  const raw = text.slice(3, end).replace(/^\r?\n/, "");
  const fields = {};
  let currentKey = null;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (m && !line.startsWith(" ") && !line.startsWith("\t")) {
      currentKey = m[1];
      const val = m[2].trim();
      if (val === "" || val === "|" || val === ">") {
        fields[currentKey] = val === "" ? null : val;
      } else if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        fields[currentKey] = val.slice(1, -1);
      } else if (val === "[]") {
        fields[currentKey] = [];
      } else if (val === "true" || val === "false") {
        fields[currentKey] = val === "true";
      } else if (/^-?\d+(\.\d+)?$/.test(val)) {
        fields[currentKey] = Number(val);
      } else {
        fields[currentKey] = val;
      }
      continue;
    }
    const list = line.match(/^\s*-\s+(.*)$/);
    if (list && currentKey) {
      if (!Array.isArray(fields[currentKey])) fields[currentKey] = [];
      fields[currentKey].push(list[1].trim());
    }
  }
  return fields;
}

function relBus(p) {
  return relative(REPO_ROOT, p).split(sep).join("/");
}

function checkFile(path, fields) {
  const findings = [];
  const id = (check) => `${relBus(path)}#${check}`;

  if (!fields) {
    findings.push(id("no_frontmatter"));
    return findings;
  }

  if (!fields.id) findings.push(id("missing_id"));
  if (!fields.type) findings.push(id("missing_type"));
  else if (!DOC_TYPES.has(String(fields.type))) findings.push(id("invalid_type"));

  if (!fields.status) findings.push(id("missing_status"));
  else if (!ALLOWED_STATUS.has(String(fields.status))) findings.push(id("invalid_status"));

  if (!fields.owner) findings.push(id("missing_owner"));
  if (!fields.created_at) findings.push(id("missing_created_at"));

  for (const key of ENVELOPE_KEYS) {
    if (!(key in fields)) findings.push(id(`missing_${key}`));
  }

  if (fields.message_type != null && !MESSAGE_TYPES.has(String(fields.message_type))) {
    findings.push(id("invalid_message_type"));
  }

  const risk = fields.risk != null ? String(fields.risk).toLowerCase() : null;
  if (risk === "high" || risk === "critical") {
    if (fields.approval_required !== true && fields.approval_required !== "true") {
      findings.push(id("approval_required_for_high_risk"));
    }
  }

  return findings;
}

function monthKey(createdAt) {
  if (!createdAt || typeof createdAt !== "string") return null;
  const m = String(createdAt).match(/^(\d{4}-\d{2})/);
  return m ? m[1] : null;
}

const files = walk(BUS_ROOT);
const findings = [];
/** @type {Map<string, string[]>} month|key -> paths */
const idempo = new Map();

for (const f of files) {
  const text = readFileSync(f, "utf8");
  const fields = parseFrontmatter(text);
  findings.push(...checkFile(f, fields));

  if (fields && fields.trace_id != null && String(fields.trace_id).trim() === "") {
    findings.push(`${relBus(f)}#empty_trace_id`);
  }
  if (fields && fields.idempotency_key != null && String(fields.idempotency_key).trim() !== "") {
    const month = monthKey(fields.created_at) || "unknown";
    const key = `${month}|${String(fields.idempotency_key)}`;
    if (!idempo.has(key)) idempo.set(key, []);
    idempo.get(key).push(relBus(f));
  }
}

for (const [, paths] of idempo) {
  if (paths.length > 1) {
    for (const p of paths) findings.push(`${p}#duplicate_idempotency_key`);
  }
}
findings.sort();

const args = process.argv.slice(2);
if (args.includes("--write-baseline")) {
  writeFileSync(BASELINE, JSON.stringify({ entries: findings }, null, 2) + "\n");
  console.log(`Baseline zapisana: ${findings.length} poloziek -> ${BASELINE}`);
  process.exit(0);
}

const base = existsSync(BASELINE)
  ? new Set(JSON.parse(readFileSync(BASELINE, "utf8")).entries)
  : new Set();
const nove = findings.filter((f) => !base.has(f));
const opravene = [...base].filter((f) => !findings.includes(f));

console.log(`Bus markdown files:         ${files.length}`);
console.log(`Porusenia spolu:            ${findings.length}`);
console.log(`V baseline (tolerovane):    ${findings.length - nove.length}`);
console.log(`NOVE porusenia:             ${nove.length}`);
if (opravene.length) console.log(`Opravene od baseline:       ${opravene.length}  (spusti --write-baseline)`);

if (nove.length) {
  console.log("\nNove porusenia bus envelope:");
  for (const f of nove.slice(0, 40)) console.log(`  ${f}`);
  if (nove.length > 40) console.log(`  ... +${nove.length - 40} further`);
}

if (args.includes("--ci") && nove.length) process.exit(1);
