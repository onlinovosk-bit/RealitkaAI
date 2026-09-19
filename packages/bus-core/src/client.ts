/**
 * HTTP client for the bus — the mirror image of `createBusHandler`.
 *
 * An execution agent that is not the server (a laptop running Claude Code, a
 * runner in CI) reaches the bus the same way ChatGPT does: over HTTP with a
 * bearer token. That keeps one transport, whether the server stores messages in
 * a checkout or commits them straight to GitHub.
 *
 * The token lives only in this object and only in the Authorization header. It
 * is never part of a URL, a log line or an error message.
 */

import type { FetchLike } from "./github-store.ts";
import type { BusListFilter } from "./store.ts";
import type { BusBox, BusEnvelope, BusValidationError } from "./types.ts";

export interface BusClientOptions {
  baseUrl: string;
  token: string;
  fetchImpl?: FetchLike;
}

export class BusClientError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "BusClientError";
    this.status = status;
    this.payload = payload;
  }
}

export interface BusPostResult {
  id: string;
  box: BusBox;
  path: string;
}

export interface BusAckResult {
  id: string;
  from_box: BusBox;
  to_box: BusBox;
  status: string;
}

export interface BusReadResult {
  box: BusBox;
  message: BusEnvelope;
  pre_v1?: boolean;
  warnings?: BusValidationError[];
}

export class BusHttpClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: BusClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? ((url, init) => fetch(url, init));
  }

  private async call(method: string, path: string, body?: unknown): Promise<Response> {
    return this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.token}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  private async expectJson<T>(response: Response, what: string): Promise<T> {
    const raw = await response.text();
    let payload: unknown;
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = raw;
    }
    if (!response.ok) {
      throw new BusClientError(`${what} failed (${response.status})`, response.status, payload);
    }
    return payload as T;
  }

  async health(): Promise<{ ok: boolean; service?: string; version?: number }> {
    const response = await this.fetchImpl(`${this.baseUrl}/health`);
    return this.expectJson(response, "health");
  }

  async list(box: BusBox, filter: BusListFilter & { limit?: number } = {}): Promise<BusEnvelope[]> {
    const query = new URLSearchParams({ box });
    if (filter.to) query.set("to", filter.to);
    if (filter.from) query.set("from", filter.from);
    if (filter.status) query.set("status", filter.status);
    if (filter.type) query.set("type", filter.type);
    if (filter.taskId) query.set("task", filter.taskId);
    if (filter.limit) query.set("limit", String(filter.limit));

    const response = await this.call("GET", `/bus/messages?${query.toString()}`);
    const payload = await this.expectJson<{ messages?: BusEnvelope[] }>(response, `list ${box}`);
    return payload.messages ?? [];
  }

  /**
   * Read one message with its parse warnings. `list` returns envelopes only, so
   * a caller that must know whether the file lost text has to ask per message.
   */
  async read(box: BusBox, id: string): Promise<BusReadResult> {
    const response = await this.call("GET", `/bus/messages/${encodeURIComponent(id)}?box=${box}`);
    return this.expectJson<BusReadResult>(response, `read ${id}`);
  }

  async post(box: BusBox, envelope: BusEnvelope): Promise<BusPostResult> {
    // An empty id asks the bus to assign one; sending it would fail validation.
    const { id, ...rest } = envelope;
    const body = id ? envelope : rest;
    const response = await this.call("POST", `/bus/messages?box=${box}`, body);
    const payload = await this.expectJson<BusPostResult>(response, `post to ${box}`);
    return payload;
  }

  async ack(box: BusBox, id: string, options: { status?: BusEnvelope["status"]; toBox?: BusBox } = {}): Promise<BusAckResult> {
    const response = await this.call("POST", `/bus/messages/${encodeURIComponent(id)}/ack?box=${box}`, {
      status: options.status ?? "done",
      to_box: options.toBox ?? "outbox",
    });
    return this.expectJson<BusAckResult>(response, `ack ${id}`);
  }
}
