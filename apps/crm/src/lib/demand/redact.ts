/**
 * What the model is allowed to see of a lead.
 *
 * Demand extraction needs the words about the property, never who wrote them.
 * E-mails, phones, IBANs and birth numbers go through the shared sanitizer;
 * the lead's own name is masked on top of that, because the sanitizer cannot
 * know it. The redacted text is also the text evidence is verified against, so
 * nothing masked here can come back through an evidence quote.
 */

import { sanitizeText } from "@/lib/ai/sanitize";

export const MAX_INQUIRY_CHARS = 4000;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function redactForModel(text: string, leadName?: string | null): string {
  let out = sanitizeText(text).sanitized;
  const parts = (leadName ?? "")
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}'-]/gu, ""))
    .filter((p) => p.length >= 3);
  for (const p of parts) {
    out = out.replace(new RegExp(`(?<![\\p{L}])${escapeRegExp(p)}(?![\\p{L}])`, "giu"), "[MENO]");
  }
  return out.slice(0, MAX_INQUIRY_CHARS);
}

/**
 * `acquire/email` stores the note as
 *   "[<source>] <inquiry text> | inzerát: <ref> | intent: <label> (<reason>)".
 * Only the inquiry text is the lead's own words; the rest is ours and must not
 * be mistaken for evidence. Notes in any other shape are returned whole.
 */
export function inquiryTextFromNote(note: string | null | undefined): string {
  const s = (note ?? "").trim();
  const m = s.match(/^\[[^\]]*\]\s?([\s\S]*?)\s\|\sinzerát:\s[\s\S]*$/);
  return (m ? m[1] : s).trim();
}
