/**
 * GitHub-backed bus store.
 *
 * Serverless runtimes have no writable checkout, so the HTTP transport talks to
 * the same `.ai/bus` files through the GitHub Contents API. Git stays the single
 * source of truth: a message posted over HTTP is a commit, reviewable like any
 * other change.
 */

import { buildMessageId, idPrefixFor, parseBusDocument, serializeEnvelope, validateEnvelope } from "./envelope.ts";
import { BusStoreError, matchesFilter, type BusDocument, type BusListFilter, type BusStore } from "./store.ts";
import type { BusBox, BusEnvelope, BusMessageType, BusRef } from "./types.ts";

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface GitHubBusStoreOptions {
  owner: string;
  repo: string;
  token: string;
  /** Branch the bus commits land on. Never the production branch by default. */
  branch: string;
  /** Repo-relative bus root, e.g. `.ai/bus`. */
  root?: string;
  fetchImpl?: FetchLike;
  apiBase?: string;
  committer?: { name: string; email: string };
}

interface ContentsEntry {
  name: string;
  path: string;
  type: "file" | "dir" | string;
  sha: string;
}

export class GitHubBusStore implements BusStore {
  private readonly fetchImpl: FetchLike;
  private readonly root: string;
  private readonly apiBase: string;
  private readonly options: GitHubBusStoreOptions;

  constructor(options: GitHubBusStoreOptions) {
    this.options = options;
    this.fetchImpl = options.fetchImpl ?? ((url, init) => fetch(url, init));
    this.root = (options.root ?? ".ai/bus").replace(/\/+$/, "");
    this.apiBase = (options.apiBase ?? "https://api.github.com").replace(/\/+$/, "");
  }

  private url(repoPath: string, query?: Record<string, string>): string {
    const search = query ? `?${new URLSearchParams(query).toString()}` : "";
    return `${this.apiBase}/repos/${this.options.owner}/${this.options.repo}/contents/${repoPath}${search}`;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.options.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "revolis-bus/1",
    };
  }

  private filePath(box: BusBox, id: string): string {
    if (id.includes("/") || id.includes("..")) throw new BusStoreError(`Illegal message id: ${id}`, "invalid");
    return `${this.root}/${box}/${id}.md`;
  }

  private async request(url: string, init?: RequestInit): Promise<Response> {
    const response = await this.fetchImpl(url, {
      ...init,
      headers: { ...this.headers(), ...(init?.headers as Record<string, string> | undefined) },
    });
    return response;
  }

  async list(box: BusBox): Promise<BusRef[]> {
    const response = await this.request(this.url(`${this.root}/${box}`, { ref: this.options.branch }));
    if (response.status === 404) return [];
    if (!response.ok) throw new BusStoreError(`GitHub list failed (${response.status})`, "invalid");
    const entries = (await response.json()) as ContentsEntry[];
    if (!Array.isArray(entries)) return [];
    return entries
      .filter((entry) => entry.type === "file" && entry.name.endsWith(".md"))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((entry) => ({ box, id: entry.name.slice(0, -3), path: entry.path }));
  }

  private async getFile(repoPath: string): Promise<{ raw: string; sha: string } | null> {
    const response = await this.request(this.url(repoPath, { ref: this.options.branch }));
    if (response.status === 404) return null;
    if (!response.ok) throw new BusStoreError(`GitHub read failed (${response.status})`, "invalid");
    const payload = (await response.json()) as { content?: string; encoding?: string; sha: string };
    const raw = payload.content ? Buffer.from(payload.content, (payload.encoding as BufferEncoding) ?? "base64").toString("utf8") : "";
    return { raw, sha: payload.sha };
  }

  async read(box: BusBox, id: string): Promise<BusDocument> {
    const repoPath = this.filePath(box, id);
    const file = await this.getFile(repoPath);
    if (!file) throw new BusStoreError(`Message ${id} not found in ${box}`, "not_found");
    return { ...parseBusDocument(file.raw, repoPath), ref: { box, id, path: repoPath } };
  }

  async readBox(box: BusBox, filter: BusListFilter = {}): Promise<BusDocument[]> {
    const refs = await this.list(box);
    const docs: BusDocument[] = [];
    for (const ref of refs) {
      docs.push(await this.read(box, ref.id));
    }
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
    const repoPath = this.filePath(box, envelope.id);
    const existing = await this.getFile(repoPath);
    if (existing && !options.overwrite) {
      throw new BusStoreError(`Message ${envelope.id} already exists in ${box}`, "conflict");
    }
    const response = await this.request(this.url(repoPath), {
      method: "PUT",
      body: JSON.stringify({
        message: `bus(${box}): ${envelope.id}`,
        content: Buffer.from(serializeEnvelope(envelope), "utf8").toString("base64"),
        branch: this.options.branch,
        sha: existing?.sha,
        committer: this.options.committer,
      }),
    });
    if (!response.ok) {
      throw new BusStoreError(`GitHub write failed (${response.status})`, response.status === 409 ? "conflict" : "invalid");
    }
    return { box, id: envelope.id, path: repoPath };
  }

  async move(from: BusBox, id: string, to: BusBox): Promise<BusRef> {
    const sourcePath = this.filePath(from, id);
    const file = await this.getFile(sourcePath);
    if (!file) throw new BusStoreError(`Message ${id} not found in ${from}`, "not_found");
    const targetPath = this.filePath(to, id);

    const put = await this.request(this.url(targetPath), {
      method: "PUT",
      body: JSON.stringify({
        message: `bus(move): ${id} ${from} -> ${to}`,
        content: Buffer.from(file.raw, "utf8").toString("base64"),
        branch: this.options.branch,
        committer: this.options.committer,
      }),
    });
    if (!put.ok) throw new BusStoreError(`GitHub move (write) failed (${put.status})`, "invalid");

    const del = await this.request(this.url(sourcePath), {
      method: "DELETE",
      body: JSON.stringify({
        message: `bus(move): remove ${id} from ${from}`,
        sha: file.sha,
        branch: this.options.branch,
        committer: this.options.committer,
      }),
    });
    if (!del.ok) throw new BusStoreError(`GitHub move (delete) failed (${del.status})`, "invalid");

    return { box: to, id, path: targetPath };
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
