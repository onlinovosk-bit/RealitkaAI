/** Bus transport abstraction + git-repo-backed implementation. */

import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildMessageId,
  idPrefixFor,
  parseBusDocument,
  serializeEnvelope,
  validateEnvelope,
  type ParseResult,
} from "./envelope.ts";
import { BUS_BOXES, type BusBox, type BusEnvelope, type BusMessageType, type BusRef } from "./types.ts";

export interface BusListFilter {
  to?: string;
  from?: string;
  status?: string;
  taskId?: string;
  type?: string;
}

export interface BusDocument extends ParseResult {
  ref: BusRef;
}

export interface BusStore {
  list(box: BusBox): Promise<BusRef[]>;
  read(box: BusBox, id: string): Promise<BusDocument>;
  readBox(box: BusBox, filter?: BusListFilter): Promise<BusDocument[]>;
  write(box: BusBox, envelope: BusEnvelope, options?: { overwrite?: boolean }): Promise<BusRef>;
  move(from: BusBox, id: string, to: BusBox): Promise<BusRef>;
  nextSequence(box: BusBox, type: BusMessageType, date: Date): Promise<number>;
}

export class BusStoreError extends Error {
  readonly code: "not_found" | "conflict" | "invalid";

  constructor(message: string, code: "not_found" | "conflict" | "invalid") {
    super(message);
    this.name = "BusStoreError";
    this.code = code;
  }
}

export function matchesFilter(envelope: BusEnvelope, filter: BusListFilter = {}): boolean {
  if (filter.to && envelope.to !== filter.to) return false;
  if (filter.from && envelope.from !== filter.from) return false;
  if (filter.status && envelope.status !== filter.status) return false;
  if (filter.type && envelope.type !== filter.type) return false;
  if (filter.taskId && envelope.task_id !== filter.taskId && envelope.thread !== filter.taskId) return false;
  return true;
}

export function isBusBox(value: string): value is BusBox {
  return (BUS_BOXES as readonly string[]).includes(value);
}

/**
 * The repository itself is the message store: every message is a committed
 * file, so the bus inherits git's audit trail, review and rollback for free.
 */
export class FileBusStore implements BusStore {
  private readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  private boxDir(box: BusBox): string {
    return path.join(this.root, box);
  }

  private filePath(box: BusBox, id: string): string {
    if (id.includes("/") || id.includes("..")) {
      throw new BusStoreError(`Illegal message id: ${id}`, "invalid");
    }
    return path.join(this.boxDir(box), `${id}.md`);
  }

  async list(box: BusBox): Promise<BusRef[]> {
    let entries: string[];
    try {
      entries = await readdir(this.boxDir(box));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    return entries
      .filter((name) => name.endsWith(".md"))
      .sort()
      .map((name) => ({ box, id: name.slice(0, -3), path: path.join(this.boxDir(box), name) }));
  }

  async read(box: BusBox, id: string): Promise<BusDocument> {
    const file = this.filePath(box, id);
    let raw: string;
    try {
      raw = await readFile(file, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new BusStoreError(`Message ${id} not found in ${box}`, "not_found");
      }
      throw error;
    }
    return { ...parseBusDocument(raw, file), ref: { box, id, path: file } };
  }

  async readBox(box: BusBox, filter: BusListFilter = {}): Promise<BusDocument[]> {
    const refs = await this.list(box);
    const docs = await Promise.all(refs.map((ref) => this.read(box, ref.id)));
    return docs.filter((doc) => (doc.envelope ? matchesFilter(doc.envelope, filter) : Object.keys(filter).length === 0));
  }

  async write(box: BusBox, envelope: BusEnvelope, options: { overwrite?: boolean } = {}): Promise<BusRef> {
    const errors = validateEnvelope(envelope);
    if (errors.length > 0) {
      throw new BusStoreError(
        `Envelope rejected:\n${errors.map((e) => `  - ${e.field}: ${e.message}`).join("\n")}`,
        "invalid",
      );
    }
    const file = this.filePath(box, envelope.id);
    await mkdir(this.boxDir(box), { recursive: true });
    if (!options.overwrite) {
      const exists = await readFile(file, "utf8").then(
        () => true,
        () => false,
      );
      if (exists) throw new BusStoreError(`Message ${envelope.id} already exists in ${box}`, "conflict");
    }
    // Write-then-rename keeps a partially written message from ever being read.
    const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(temp, serializeEnvelope(envelope), "utf8");
    await rename(temp, file);
    return { box, id: envelope.id, path: file };
  }

  async move(from: BusBox, id: string, to: BusBox): Promise<BusRef> {
    const source = this.filePath(from, id);
    const target = this.filePath(to, id);
    await mkdir(this.boxDir(to), { recursive: true });
    try {
      await rename(source, target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new BusStoreError(`Message ${id} not found in ${from}`, "not_found");
      }
      throw error;
    }
    return { box: to, id, path: target };
  }

  async nextSequence(box: BusBox, type: BusMessageType, date: Date): Promise<number> {
    const prefix = idPrefixFor(type);
    const day = buildMessageId(type, date, 0, "x").split("-")[1]!;
    const refs = await this.list(box);
    const used = refs
      .map((ref) => new RegExp(`^${prefix}-${day}-(\\d{3})`).exec(ref.id))
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => Number.parseInt(match[1]!, 10));
    return used.length === 0 ? 1 : Math.max(...used) + 1;
  }
}
