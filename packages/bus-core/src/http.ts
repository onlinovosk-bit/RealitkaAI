/**
 * HTTP transport for the bus — the layer that lets a non-repo agent (ChatGPT
 * with an Action, a webhook, a phone) read and post messages without the
 * founder relaying them.
 *
 * Implemented against the Web `Request`/`Response` standard so the same handler
 * runs behind `node:http` (scripts/bus/serve.ts) or inside a Next.js route.
 */

import { timingSafeEqual } from "node:crypto";
import { buildMessageId, envelopeFromJson, findLikelySecrets } from "./envelope.ts";
import { renderDigest, renderQueueDigest } from "./digest.ts";
import { BusStoreError, isBusBox, type BusStore } from "./store.ts";
import type { BusBox, BusEnvelope, BusMessageType } from "./types.ts";

export interface BusHttpOptions {
  store: BusStore;
  /** Shared secret presented as `Authorization: Bearer <token>`. */
  token: string;
  /** Boxes a remote agent may write to. Deliberately not `archive`/`state`. */
  writableBoxes?: BusBox[];
  maxBodyBytes?: number;
  now?: () => Date;
}

const DEFAULT_WRITABLE: BusBox[] = ["inbox", "tasks", "context", "decisions"];
const DEFAULT_MAX_BODY = 64 * 1024;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function text(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

/** Constant-time comparison so the token cannot be discovered byte by byte. */
export function tokenMatches(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function authorize(request: Request, token: string): Response | null {
  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!presented || !tokenMatches(presented, token)) {
    return json({ error: "unauthorized" }, 401);
  }
  return null;
}

function boxParam(params: URLSearchParams, fallback: BusBox): BusBox | null {
  const raw = params.get("box");
  if (!raw) return fallback;
  return isBusBox(raw) ? raw : null;
}

function storeErrorResponse(error: unknown): Response {
  if (error instanceof BusStoreError) {
    const status = error.code === "not_found" ? 404 : error.code === "conflict" ? 409 : 400;
    return json({ error: error.code, message: error.message }, status);
  }
  throw error;
}

/**
 * One handler for every bus route. Returns `null` for paths it does not own so
 * a host application can fall through to its own routing.
 */
export function createBusHandler(options: BusHttpOptions): (request: Request) => Promise<Response | null> {
  const writable = options.writableBoxes ?? DEFAULT_WRITABLE;
  const maxBody = options.maxBodyBytes ?? DEFAULT_MAX_BODY;
  const now = options.now ?? (() => new Date());

  return async function handle(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/health" || path === "/bus/health") {
      return json({ ok: true, service: "revolis-bus", version: 1 });
    }
    if (!path.startsWith("/bus/messages")) return null;

    const unauthorized = authorize(request, options.token);
    if (unauthorized) return unauthorized;

    const segments = path.split("/").filter(Boolean); // ["bus","messages", id?, "ack"?]
    const id = segments[2];
    const action = segments[3];

    try {
      if (request.method === "GET" && !id) return await handleList(url);
      if (request.method === "GET" && id && !action) return await handleRead(url, id);
      if (request.method === "POST" && !id) return await handlePost(request, url);
      if (request.method === "POST" && id && action === "ack") return await handleAck(request, url, id);
      return json({ error: "method_not_allowed" }, 405);
    } catch (error) {
      return storeErrorResponse(error);
    }
  };

  async function handleList(url: URL): Promise<Response> {
    const box = boxParam(url.searchParams, "outbox");
    if (!box) return json({ error: "unknown_box" }, 400);

    const docs = await options.store.readBox(box, {
      to: url.searchParams.get("to") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      taskId: url.searchParams.get("task") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
    });
    const envelopes = docs.map((doc) => doc.envelope).filter((envelope): envelope is BusEnvelope => Boolean(envelope));
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
    const recent = envelopes.slice(-Math.max(1, Math.min(100, Number.isFinite(limit) ? limit : 20)));

    if (url.searchParams.get("format") === "digest") return text(renderQueueDigest(recent));
    return json({ box, count: recent.length, messages: recent });
  }

  async function handleRead(url: URL, id: string): Promise<Response> {
    const box = boxParam(url.searchParams, "outbox");
    if (!box) return json({ error: "unknown_box" }, 400);

    const doc = await options.store.read(box, id);
    if (doc.legacy) {
      return url.searchParams.get("format") === "digest"
        ? text(`${id}: pre-v1 message, no digest available`)
        : json({ box, id, legacy: true, raw: doc.legacy.raw });
    }
    if (url.searchParams.get("format") === "digest") return text(renderDigest(doc.envelope!));
    return json({ box, message: doc.envelope, pre_v1: doc.preV1 === true, warnings: doc.warnings ?? [] });
  }

  async function handlePost(request: Request, url: URL): Promise<Response> {
    const box = boxParam(url.searchParams, "inbox");
    if (!box) return json({ error: "unknown_box" }, 400);
    if (!writable.includes(box)) return json({ error: "box_not_writable", writable }, 403);

    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > maxBody) {
      return json({ error: "payload_too_large", max_bytes: maxBody, hint: "link to a repo file instead of pasting logs" }, 413);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    const parsed = envelopeFromJson(payload, now);
    if (!parsed.envelope) return json({ error: "invalid_envelope", problems: parsed.errors }, 400);

    const envelope = parsed.envelope;
    const idWasSupplied = envelope.id.length > 0;
    if (!envelope.id) {
      const type = (envelope.type ?? "result") as BusMessageType;
      const sequence = await options.store.nextSequence(box, type, now());
      envelope.id = buildMessageId(type, now(), sequence, envelope.summary || "message");
    }

    const secrets = findLikelySecrets(raw);
    if (secrets.length > 0) return json({ error: "possible_secret", detected: secrets }, 400);

    // The id error is expected when the caller let the bus assign one.
    const problems = idWasSupplied ? parsed.errors : parsed.errors.filter((problem) => problem.field !== "id");
    if (problems.length > 0) return json({ error: "invalid_envelope", problems }, 400);

    const ref = await options.store.write(box, envelope);
    return json({ ok: true, box: ref.box, id: ref.id, path: ref.path, digest: renderDigest(envelope) }, 201);
  }

  async function handleAck(request: Request, url: URL, id: string): Promise<Response> {
    const box = boxParam(url.searchParams, "inbox");
    if (!box) return json({ error: "unknown_box" }, 400);

    const body = await request.text();
    let payload: { status?: string; to_box?: string } = {};
    if (body.trim()) {
      try {
        payload = JSON.parse(body) as typeof payload;
      } catch {
        return json({ error: "invalid_json" }, 400);
      }
    }

    const doc = await options.store.read(box, id);
    if (!doc.envelope) return json({ error: "legacy_message", message: "pre-v1 message cannot be acknowledged" }, 409);

    const status = (payload.status ?? "done") as BusEnvelope["status"];
    const targetRaw = payload.to_box ?? (status === "archived" ? "archive" : "outbox");
    if (!isBusBox(targetRaw)) return json({ error: "unknown_box" }, 400);

    if (targetRaw !== box) await options.store.move(box, id, targetRaw);
    const updated: BusEnvelope = { ...doc.envelope, status, updated_at: now().toISOString() };
    await options.store.write(targetRaw, updated, { overwrite: true });

    return json({ ok: true, id, from_box: box, to_box: targetRaw, status });
  }
}
