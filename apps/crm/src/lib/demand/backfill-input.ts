/**
 * DEMAND-BACKFILL — historical portal e-mails as experiment input (`--input`).
 *
 * The 61 usable notes on PROD cannot reach the gate's support of 10 per field,
 * so the gold set is topped up with inquiry e-mails the agency already
 * received. They go through the SAME path as production: `parseEmail` over
 * subject + text + html, then `ev.inquiryText` and the parsed contact name —
 * exactly what `acquire/email` hands to `scheduleDemandExtraction`. A mail
 * production would not turn into a lead is skipped, not measured.
 *
 * Accepted files: .eml (one message), .mbox (Google Takeout), .txt (pasted
 * body). No new dependency: a small MIME reader covers multipart, base64,
 * quoted-printable, RFC 2047 subjects and the Central European charsets.
 */

import { createHash } from "crypto";
import { notLeadReason, parseEmail } from "@/lib/acquire/email-adapter";

export type EmailMessage = { subject: string; from: string; to: string; date: string | null; text: string; html: string };

export type EmailInquiry =
  | { ok: true; id: string; inquiryText: string; leadName: string | null }
  | { ok: false; id: string; reason: string };

// ---------------------------------------------------------------- MIME reader

function decodeBytes(bytes: Buffer, charset: string | undefined): string {
  const cs = (charset ?? "utf-8").trim().replace(/^"|"$/g, "").toLowerCase();
  try {
    return new TextDecoder(cs).decode(bytes);
  } catch {
    return bytes.toString("utf8");
  }
}

function qpToBytes(s: string): Buffer {
  const out: number[] = [];
  const src = s.replace(/=\r?\n/g, "");
  for (let i = 0; i < src.length; i++) {
    if (src[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(src.slice(i + 1, i + 3))) {
      out.push(parseInt(src.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      out.push(...Buffer.from(src[i], "utf8"));
    }
  }
  return Buffer.from(out);
}

/** RFC 2047: =?charset?B|Q?text?= — adjacent encoded words join without the space. */
export function decodeHeader(v: string): string {
  return v
    .replace(/\?=\s+=\?/g, "?==?")
    .replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, cs: string, enc: string, txt: string) =>
      decodeBytes(
        enc.toUpperCase() === "B" ? Buffer.from(txt, "base64") : qpToBytes(txt.replace(/_/g, " ")),
        cs,
      ),
    );
}

function splitHeaders(raw: string): { headers: Map<string, string>; body: string } {
  const sep = raw.search(/\r?\n\r?\n/);
  const head = sep < 0 ? raw : raw.slice(0, sep);
  const body = sep < 0 ? "" : raw.slice(sep).replace(/^\r?\n\r?\n/, "");
  const headers = new Map<string, string>();
  for (const line of head.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) {
      const k = line.slice(0, i).trim().toLowerCase();
      if (!headers.has(k)) headers.set(k, line.slice(i + 1).trim());
    }
  }
  return { headers, body };
}

function param(header: string | undefined, name: string): string | undefined {
  const m = (header ?? "").match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|[^;\\s]+)`, "i"));
  return m ? (m[2] ?? m[1]) : undefined;
}

function collectParts(raw: string, acc: { text: string[]; html: string[] }): void {
  const { headers, body } = splitHeaders(raw);
  const ctype = headers.get("content-type") ?? "text/plain";
  const mime = ctype.split(";")[0].trim().toLowerCase();
  if (mime.startsWith("multipart/")) {
    const boundary = param(ctype, "boundary");
    if (!boundary) return;
    const parts = body.split(new RegExp(`^--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:--)?\\s*$`, "m"));
    for (const p of parts.slice(1)) if (p.trim()) collectParts(p.replace(/^\r?\n/, ""), acc);
    return;
  }
  if (mime !== "text/plain" && mime !== "text/html") return;
  if (/attachment/i.test(headers.get("content-disposition") ?? "")) return;
  const cte = (headers.get("content-transfer-encoding") ?? "").toLowerCase();
  // 7bit/8bit bodies are already text (the file is read as UTF-8).
  const decoded =
    cte === "base64" ? decodeBytes(Buffer.from(body.replace(/\s+/g, ""), "base64"), param(ctype, "charset"))
      : cte === "quoted-printable" ? decodeBytes(qpToBytes(body), param(ctype, "charset"))
        : body;
  (mime === "text/html" ? acc.html : acc.text).push(decoded);
}

export function parseEml(raw: string): EmailMessage {
  const { headers } = splitHeaders(raw);
  const acc = { text: [] as string[], html: [] as string[] };
  collectParts(raw, acc);
  return {
    subject: decodeHeader(headers.get("subject") ?? ""),
    from: decodeHeader(headers.get("from") ?? ""),
    to: decodeHeader(headers.get("to") ?? ""),
    date: headers.get("date") ?? null,
    text: acc.text.join("\n"),
    html: acc.html.join("\n"),
  };
}

/** Google Takeout mbox: messages start at a line `From <sender> <date>`. */
export function splitMbox(raw: string): string[] {
  return raw
    .split(/^From [^\r\n]*\r?\n/m)
    .map((m) => m.replace(/^>(>*From )/gm, "$1"))
    .filter((m) => m.trim().length > 0);
}

export function messagesFromFile(name: string, content: string): EmailMessage[] {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "mbox") return splitMbox(content).map(parseEml);
  if (ext === "eml") return [parseEml(content)];
  if (ext === "txt") return [{ subject: "", from: "", to: "", date: null, text: content, html: "" }];
  return [];
}

// ------------------------------------------------- the production parse path

function isoDate(d: string | null): string | undefined {
  const t = d ? Date.parse(d) : NaN;
  return Number.isNaN(t) ? undefined : new Date(t).toISOString().slice(0, 10);
}

/**
 * Id derived from the message content, never from a file name or address,
 * so the labeling sheet carries no identity and re-runs stay stable.
 */
export function emailInquiry(msg: EmailMessage): EmailInquiry {
  const raw = [msg.subject, msg.text, msg.html].join("\n");
  const id = `email:${createHash("sha256").update(raw).digest("hex").slice(0, 12)}`;
  const ev = parseEmail(raw, isoDate(msg.date), {
    recipient: msg.to || null,
    subject: msg.subject || null,
    from: msg.from || null,
    addresses: [],
    domains: [],
  });
  const notLead = notLeadReason(ev, false);
  if (notLead) return { ok: false, id, reason: notLead };
  if (!ev.inquiryText) return { ok: false, id, reason: "no_inquiry_text" };
  return { ok: true, id, inquiryText: ev.inquiryText, leadName: ev.contactName ?? null };
}
