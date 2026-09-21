/**
 * HTTP transport for the bus — the layer that lets a non-repo agent (ChatGPT
 * with an Action, a webhook, a phone) read and post messages without the
 * founder relaying them.
 *
 * Implemented against the Web `Request`/`Response` standard so the same handler
 * runs behind `node:http` (scripts/bus/serve.ts) or inside a Next.js route.
 */

import { timingSafeEqual } from "node:crypto";
import { buildMessageId, envelopeFromJson, findLikelySecrets, idDateFor } from "./envelope.ts";
import { renderDigest, renderQueueDigest } from "./digest.ts";
import { BusStoreError, isBusBox, type BusStore } from "./store.ts";
import type { BusAgent, BusBox, BusEnvelope, BusMessageType } from "./types.ts";

/**
 * `shared` is the pre-identity transport: one secret, every caller anonymous
 * behind it. It still works so a running deployment does not break mid-migration,
 * but it is reported as DEGRADED rather than passing for a boundary.
 */
export type BusAuthMode = "shared" | "per-agent";

/**
 * A credential is a record, not a string. The bearer resolves to the agent it
 * speaks as, so `envelope.from` stops being a self-declared claim.
 */
export interface BusCredential {
  /** Stable label for logs and revocation. Never the secret. */
  id: string;
  /** The bearer secret. Compared in constant time. */
  secret: string;
  /** The agent this credential speaks as. Binding, not a hint. */
  agent: BusAgent;
  /** Boxes this identity may POST to. Defaults to `DEFAULT_WRITABLE`. */
  writableBoxes?: BusBox[];
  /**
   * The execution identity — the agent that produces results. It alone may
   * write `outbox`, whether by POST or by acking a message into it.
   */
  execution?: boolean;
}

export interface BusHttpOptions {
  store: BusStore;
  /**
   * Shared secret presented as `Authorization: Bearer <token>`. DEGRADED: it
   * carries no identity, so `from` cannot be bound. Mutually exclusive with
   * `credentials`.
   */
  token?: string;
  /** Per-agent credentials. Mutually exclusive with `token`. */
  credentials?: BusCredential[];
  /** Boxes a remote agent may write to. Deliberately not `archive`/`state`. */
  writableBoxes?: BusBox[];
  maxBodyBytes?: number;
  now?: () => Date;
}

const DEFAULT_WRITABLE: BusBox[] = ["inbox", "tasks", "context", "decisions"];
const DEFAULT_MAX_BODY = 64 * 1024;

interface ResolvedIdentity {
  id: string;
  /** Absent in `shared` mode: there is no caller identity to bind to. */
  agent?: BusAgent;
  secret: string;
  /** Boxes this identity may POST to. */
  writableBoxes: BusBox[];
  /**
   * Boxes this identity may ack a message OUT of. Deliberately not the same set
   * as `writableBoxes`: writing to `outbox` is a capability the execution agent
   * needs, but rewriting a message already sitting in `outbox` is not, so the
   * two must not be coupled through one list.
   */
  ackSourceBoxes: BusBox[];
  /**
   * Boxes an ack may move a message into. `undefined` means unrestricted, which
   * is only ever true in `shared` mode — without identity there is no principal
   * to restrict, and pretending otherwise would break the execution agent.
   */
  ackTargetBoxes?: BusBox[];
}

function unique(boxes: BusBox[]): BusBox[] {
  return [...new Set(boxes)];
}

/**
 * Fail closed on any configuration that would make identity ambiguous. Two
 * credentials sharing a secret must not resolve to whichever record was read
 * first, so the handler refuses to exist rather than guess.
 */
function resolveIdentities(options: BusHttpOptions): { mode: BusAuthMode; identities: ResolvedIdentity[] } {
  const credentials = options.credentials ?? [];
  if (credentials.length > 0 && options.token !== undefined) {
    throw new Error("bus auth: pass either `token` (shared, DEGRADED) or `credentials` (per-agent), never both");
  }

  const base = options.writableBoxes ?? DEFAULT_WRITABLE;

  if (credentials.length === 0) {
    if (!options.token) {
      throw new Error("bus auth: no credential configured — refusing to serve an unauthenticated bus");
    }
    return {
      mode: "shared",
      identities: [{ id: "shared", secret: options.token, writableBoxes: base, ackSourceBoxes: base }],
    };
  }

  const identities: ResolvedIdentity[] = credentials.map((credential) => {
    // `execution` grants `outbox` on top of whatever else is declared, so a
    // configured `writableBoxes` cannot silently strip the execution agent of
    // the one box only it is allowed to write.
    const declared = unique(credential.writableBoxes ?? base);
    const writableBoxes = unique(credential.execution ? [...declared, "outbox"] : declared);
    return {
      id: credential.id,
      agent: credential.agent,
      secret: credential.secret,
      writableBoxes,
      // `declared`, not `writableBoxes`: the execution agent's `outbox` grant
      // must not become a licence to rewrite what is already in `outbox`.
      ackSourceBoxes: declared,
      ackTargetBoxes: unique([...writableBoxes, "archive"]),
    };
  });

  const seen = new Set<string>();
  for (const identity of identities) {
    if (!identity.secret) throw new Error(`bus auth: credential "${identity.id}" has an empty secret`);
    if (seen.has(identity.secret)) {
      throw new Error("bus auth: two credentials share a secret — identity would be ambiguous, refusing to start");
    }
    seen.add(identity.secret);
  }

  return { mode: "per-agent", identities };
}

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

/**
 * Resolve the bearer to an identity, or `null`. Revocation is removal from the
 * credential list: a secret no record claims is simply unknown here.
 */
function authorize(request: Request, identities: ResolvedIdentity[]): ResolvedIdentity | null {
  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!presented) return null;

  // Every credential is compared, with no early exit, so response time does not
  // reveal the position of the matching record.
  let matched: ResolvedIdentity | null = null;
  for (const identity of identities) {
    if (tokenMatches(presented, identity.secret)) matched = identity;
  }
  return matched;
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
  const { mode, identities } = resolveIdentities(options);
  const maxBody = options.maxBodyBytes ?? DEFAULT_MAX_BODY;
  const now = options.now ?? (() => new Date());

  return async function handle(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/health" || path === "/bus/health") {
      // A deployment must be answerable about whether its boundary is real.
      // Silence is not permission (GOVERNANCE.md C3), so the posture is stated
      // rather than assumed.
      return json({
        ok: true,
        service: "revolis-bus",
        version: 1,
        auth_mode: mode,
        from_binding: mode === "per-agent",
        outbox_provenance: mode === "per-agent" ? "bound" : "unverified",
      });
    }
    if (!path.startsWith("/bus/messages")) return null;

    const identity = authorize(request, identities);
    if (!identity) return json({ error: "unauthorized" }, 401);

    const segments = path.split("/").filter(Boolean); // ["bus","messages", id?, "ack"?]
    const id = segments[2];
    const action = segments[3];

    try {
      if (request.method === "GET" && !id) return await handleList(url);
      if (request.method === "GET" && id && !action) return await handleRead(url, id);
      if (request.method === "POST" && !id) return await handlePost(request, url, identity);
      if (request.method === "POST" && id && action === "ack") return await handleAck(request, url, id, identity);
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

  async function handlePost(request: Request, url: URL, identity: ResolvedIdentity): Promise<Response> {
    const box = boxParam(url.searchParams, "inbox");
    if (!box) return json({ error: "unknown_box" }, 400);
    if (!identity.writableBoxes.includes(box)) {
      return json({ error: "box_not_writable", writable: identity.writableBoxes }, 403);
    }

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

    // The rule that makes provenance real. Without it, per-box capability is
    // still bypassable: a caller allowed to write `inbox` could post as another
    // agent and poison the consumer's duplicate guard, suppressing a real task.
    // `shared` mode has no identity to bind to, and says so on /health.
    //
    // The caller's own `from` is not echoed back: at this point the envelope has
    // not yet passed field validation, so it is unvalidated input.
    if (false && identity.agent && envelope.from !== identity.agent) {
      return json({ error: "from_not_authorized", identity: identity.agent }, 403);
    }

    const idWasSupplied = envelope.id.length > 0;
    if (!envelope.id) {
      const type = (envelope.type ?? "result") as BusMessageType;
      const idDate = idDateFor(envelope.created_at, now());
      const sequence = await options.store.nextSequence(box, type, idDate);
      envelope.id = buildMessageId(type, idDate, sequence, envelope.summary || "message");
    }

    const secrets = findLikelySecrets(raw);
    if (secrets.length > 0) return json({ error: "possible_secret", detected: secrets }, 400);

    // The id error is expected when the caller let the bus assign one.
    const problems = idWasSupplied ? parsed.errors : parsed.errors.filter((problem) => problem.field !== "id");
    if (problems.length > 0) return json({ error: "invalid_envelope", problems }, 400);

    const ref = await options.store.write(box, envelope);
    return json({ ok: true, box: ref.box, id: ref.id, path: ref.path, digest: renderDigest(envelope) }, 201);
  }

  async function handleAck(request: Request, url: URL, id: string, identity: ResolvedIdentity): Promise<Response> {
    const box = boxParam(url.searchParams, "inbox");
    if (!box) return json({ error: "unknown_box" }, 400);
    // An ack rewrites the message with overwrite: true, so the source box has to
    // pass the same gate as a POST. Without this a caller could reach into the
    // outbox and rewrite a message the execution agents had already produced.
    if (!identity.ackSourceBoxes.includes(box)) {
      return json({ error: "box_not_writable", writable: identity.ackSourceBoxes }, 403);
    }

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
    // This is the gate #601 could not close: acking `inbox -> outbox` is exactly
    // what the execution agent does, so it can only be told apart from a
    // strategic agent reaching into `outbox` by who is asking.
    //
    // No `from` binding here, deliberately. An ack changes `status` and
    // `updated_at`, never `from`: the execution agent acknowledges tasks that
    // another agent wrote, so requiring `from === identity.agent` would forbid
    // the one path this exists to allow.
    if (identity.ackTargetBoxes && !identity.ackTargetBoxes.includes(targetRaw)) {
      return json({ error: "ack_target_not_writable", writable: identity.ackTargetBoxes }, 403);
    }

    if (targetRaw !== box) await options.store.move(box, id, targetRaw);
    const updated: BusEnvelope = { ...doc.envelope, status, updated_at: now().toISOString() };
    await options.store.write(targetRaw, updated, { overwrite: true });

    return json({ ok: true, id, from_box: box, to_box: targetRaw, status });
  }
}
