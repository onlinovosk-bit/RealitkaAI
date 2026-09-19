#!/usr/bin/env node
/**
 * Revolis Bus CLI — the transport an agent uses instead of the founder.
 *
 *   npm run bus -- send --box outbox --file draft.md
 *   npm run bus -- pull --to claude-code
 *   npm run bus -- read MSG-20260918-001-branch-audit --digest
 *   npm run bus -- digest --box outbox --to sol-gpt
 *   npm run bus -- ack MSG-20260918-001-branch-audit --status done
 *   npm run bus -- validate
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BUS_BOXES,
  buildMessageId,
  BusStoreError,
  FileBusStore,
  isBusBox,
  LOST_TEXT_FIELD,
  parseBusDocument,
  renderDigest,
  renderQueueDigest,
  serializeEnvelope,
  validateEnvelope,
  type BusBox,
  type BusDocument,
  type BusEnvelope,
  type BusMessageType,
} from "../../packages/bus-core/src/index.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const busRoot = process.env.REVOLIS_BUS_ROOT ?? path.join(repoRoot, ".ai", "bus");
const store = new FileBusStore(busRoot);

interface Args {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): Args {
  const [command = "help", ...rest] = argv;
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]!;
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = rest[index + 1];
    if (next === undefined || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    index += 1;
  }
  return { command, positional, flags };
}

function flagString(args: Args, key: string): string | undefined {
  const value = args.flags[key];
  return typeof value === "string" ? value : undefined;
}

function boxFlag(args: Args, fallback: BusBox): BusBox {
  const raw = flagString(args, "box");
  if (raw === undefined) return fallback;
  if (!isBusBox(raw)) throw new Error(`Unknown box "${raw}". Valid: ${BUS_BOXES.join(", ")}`);
  return raw;
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

async function findDocument(id: string, preferred?: BusBox): Promise<BusDocument> {
  const order: BusBox[] = preferred ? [preferred] : ["inbox", "outbox", "tasks", "decisions", "context", "state", "archive"];
  for (const box of order) {
    try {
      return await store.read(box, id);
    } catch (error) {
      if (error instanceof BusStoreError && error.code === "not_found") continue;
      throw error;
    }
  }
  fail(`Message ${id} not found in ${order.join(", ")}`);
}

/** `send` accepts a draft markdown file and fills in only the mechanical fields. */
async function commandSend(args: Args): Promise<void> {
  const box = boxFlag(args, "outbox");
  const file = flagString(args, "file");
  if (!file) fail("send requires --file <draft.md> (markdown with YAML frontmatter)");

  const raw = await readFile(path.resolve(process.cwd(), file), "utf8");
  const parsed = parseBusDocument(raw, file);
  if (!parsed.envelope) {
    fail(`Draft ${file} has no YAML frontmatter — see .ai/bus/message.schema.md`);
  }

  // Refuse at write time: a message whose text YAML ate is worse than no message.
  const lostText = (parsed.warnings ?? []).filter((warning) => warning.field === LOST_TEXT_FIELD);
  if (lostText.length > 0) {
    fail(
      `Draft ${file} would lose text to YAML comments:\n` +
        `${lostText.map((warning) => `  - ${warning.message}`).join("\n")}`,
    );
  }

  const draft = parsed.envelope;
  const now = new Date();
  const type = (flagString(args, "type") ?? draft.type) as BusMessageType;
  const envelope: BusEnvelope = {
    ...draft,
    v: 1,
    type,
    created_at: draft.created_at || now.toISOString(),
  };

  if (!envelope.id || flagString(args, "slug")) {
    const slug = flagString(args, "slug") ?? envelope.summary ?? "message";
    const sequence = await store.nextSequence(box, type, now);
    envelope.id = buildMessageId(type, now, sequence, slug);
  }

  const errors = validateEnvelope(envelope);
  if (errors.length > 0) {
    fail(`Envelope rejected:\n${errors.map((error) => `  - ${error.field}: ${error.message}`).join("\n")}`);
  }

  const ref = await store.write(box, envelope, { overwrite: args.flags.force === true });
  process.stdout.write(`${path.relative(repoRoot, ref.path)}\n\n${renderDigest(envelope)}\n`);
}

async function commandPull(args: Args): Promise<void> {
  const box = boxFlag(args, "inbox");
  const docs = await store.readBox(box, {
    to: flagString(args, "to"),
    from: flagString(args, "from"),
    status: flagString(args, "status"),
    taskId: flagString(args, "task"),
    type: flagString(args, "type"),
  });
  const envelopes = docs.map((doc) => doc.envelope).filter((envelope): envelope is BusEnvelope => Boolean(envelope));
  const skipped = docs.length - envelopes.length;

  if (args.flags.json) {
    process.stdout.write(`${JSON.stringify(envelopes, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${renderQueueDigest(envelopes)}\n`);
  if (skipped > 0) process.stdout.write(`\n(${skipped} legacy file(s) in ${box} skipped — no v1 frontmatter)\n`);
}

async function commandRead(args: Args): Promise<void> {
  const id = args.positional[0];
  if (!id) fail("read requires a message id");
  const doc = await findDocument(id, flagString(args, "box") ? boxFlag(args, "inbox") : undefined);

  if (doc.legacy) {
    process.stdout.write(`${doc.legacy.raw}\n`);
    return;
  }
  const envelope = doc.envelope!;
  if (args.flags.json) process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
  else if (args.flags.digest) process.stdout.write(`${renderDigest(envelope)}\n`);
  else process.stdout.write(`${serializeEnvelope(envelope)}\n`);
}

async function commandDigest(args: Args): Promise<void> {
  const box = boxFlag(args, "outbox");
  const docs = await store.readBox(box, {
    to: flagString(args, "to"),
    from: flagString(args, "from"),
    status: flagString(args, "status"),
    taskId: flagString(args, "task"),
  });
  const envelopes = docs.map((doc) => doc.envelope).filter((envelope): envelope is BusEnvelope => Boolean(envelope));
  const limit = Number.parseInt(flagString(args, "limit") ?? "10", 10);
  const recent = envelopes.slice(-limit);

  if (args.positional[0]) {
    const one = envelopes.find((envelope) => envelope.id === args.positional[0]);
    if (!one) fail(`Message ${args.positional[0]} not found in ${box}`);
    process.stdout.write(`${renderDigest(one)}\n`);
    return;
  }
  process.stdout.write(`${renderQueueDigest(recent)}\n`);
}

/** `ack` closes a message: status update + move out of the working box. */
async function commandAck(args: Args): Promise<void> {
  const id = args.positional[0];
  if (!id) fail("ack requires a message id");
  const sourceBox = boxFlag(args, "inbox");
  const doc = await store.read(sourceBox, id);
  if (!doc.envelope) fail(`${id} is a legacy file and cannot be acknowledged automatically`);

  const status = (flagString(args, "status") ?? "done") as BusEnvelope["status"];
  const targetRaw = flagString(args, "to-box") ?? (status === "archived" ? "archive" : "outbox");
  if (!isBusBox(targetRaw)) fail(`Unknown box "${targetRaw}"`);

  // Move first, then write: writing before the move would be clobbered by it.
  if (targetRaw !== sourceBox) await store.move(sourceBox, id, targetRaw);
  const updated: BusEnvelope = { ...doc.envelope, status, updated_at: new Date().toISOString() };
  await store.write(targetRaw, updated, { overwrite: true });

  process.stdout.write(`${id}: ${doc.envelope.status} -> ${status} (${sourceBox} -> ${targetRaw})\n`);
}

/**
 * `validate` is the CI gate. Only v1 envelopes block: messages written before
 * this contract stay in the repo untouched and are reported as warnings.
 */
async function commandValidate(args: Args): Promise<void> {
  let checked = 0;
  let legacy = 0;
  let preV1 = 0;
  const problems: string[] = [];
  const warnings: string[] = [];

  for (const box of BUS_BOXES) {
    for (const ref of await store.list(box)) {
      const doc = await store.read(box, ref.id);
      checked += 1;
      if (doc.legacy) {
        legacy += 1;
        continue;
      }
      if (doc.preV1) preV1 += 1;
      for (const error of doc.errors) problems.push(`${box}/${ref.id}: ${error.field} — ${error.message}`);
      for (const warning of doc.warnings ?? []) warnings.push(`${box}/${ref.id}: ${warning.field} — ${warning.message}`);
    }
  }

  process.stdout.write(
    `bus validate: ${checked} files (${preV1} pre-v1, ${legacy} without frontmatter), ` +
      `${problems.length} errors, ${warnings.length} warnings\n`,
  );
  if (args.flags.warnings && warnings.length > 0) {
    process.stdout.write(`${warnings.map((warning) => `  ~ ${warning}`).join("\n")}\n`);
  }
  if (problems.length > 0) {
    process.stdout.write(`${problems.map((problem) => `  - ${problem}`).join("\n")}\n`);
    process.exit(1);
  }
}

const HELP = `Revolis Bus CLI

  send      --box <box> --file <draft.md> [--slug <slug>] [--force]
  pull      [--box inbox] [--to <agent>] [--status <status>] [--task <id>] [--json]
  read      <id> [--box <box>] [--json|--digest]
  digest    [<id>] [--box outbox] [--to <agent>] [--limit 10]
  ack       <id> [--box inbox] [--status done] [--to-box outbox]
  validate  [--warnings]

Boxes: ${BUS_BOXES.join(", ")}
Bus root: ${busRoot}
`;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  switch (args.command) {
    case "send":
      return commandSend(args);
    case "pull":
      return commandPull(args);
    case "read":
      return commandRead(args);
    case "digest":
      return commandDigest(args);
    case "ack":
      return commandAck(args);
    case "validate":
      return commandValidate(args);
    default:
      process.stdout.write(HELP);
      if (args.command !== "help") process.exit(1);
  }
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
