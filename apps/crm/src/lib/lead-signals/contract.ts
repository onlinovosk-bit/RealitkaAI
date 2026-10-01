import {
  CONFIDENCE_LEVELS,
  SIGNAL_NAMES,
  SignalContractError,
  type Confidence,
  type ExtractedSignal,
  type SignalName,
  type SignalPresence,
} from "./types";

/**
 * The contract between the extractor and everything downstream.
 *
 * Nothing here calls a model. That is the point: the rules an extractor must
 * satisfy are testable on their own, and they stay the same when the model,
 * the provider or the prompt changes.
 */

/** Collapse runs of whitespace so a quote survives reformatting. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Is the quote really in the source text?
 *
 * The engine contract forbids the model inventing evidence. A span it merely
 * asserts is worth nothing, so it is checked against the text it claims to
 * come from. Whitespace is normalised — a model re-wrapping a line is not
 * fabrication — but the words must be there, in that order.
 */
export function verifyEvidence(evidenceSpan: string, sourceText: string): boolean {
  const span = normalize(evidenceSpan);
  if (span === "") return false;
  return normalize(sourceText).toLowerCase().includes(span.toLowerCase());
}

/**
 * The rule the whole wall exists for: a value without verifiable evidence is
 * not a finding.
 *
 * Returns `unknown` rather than `absent` in that case, because "the model said
 * something we cannot check" is not the same as "there is nothing there", and
 * scoring must be able to tell them apart.
 */
export function signalPresence(
  signal: Pick<ExtractedSignal, "value" | "evidenceSpan">,
  sourceText?: string,
): SignalPresence {
  const value = signal.value?.trim() ?? "";
  if (value === "") {
    // No value and no evidence is a clean "looked, found nothing".
    return signal.evidenceSpan ? "unknown" : "absent";
  }
  const span = signal.evidenceSpan?.trim() ?? "";
  if (span === "") return "unknown";
  // When the source text is available the quote is verified, not trusted.
  if (sourceText !== undefined && !verifyEvidence(span, sourceText)) return "unknown";
  return "present";
}

interface RawSignal {
  name?: unknown;
  value?: unknown;
  confidence?: unknown;
  evidence_span?: unknown;
  source_field?: unknown;
}

function asOptionalString(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Turn one raw object from an extractor into a typed signal, or throw.
 *
 * Throws rather than returning a default: a malformed extraction is a bug in
 * the prompt or the model, and silently coercing it to `unknown` would hide
 * exactly the regression that should surface.
 */
export function parseSignal(raw: RawSignal): ExtractedSignal {
  const name = asOptionalString(raw.name);
  if (!name || !SIGNAL_NAMES.includes(name as SignalName)) {
    throw new SignalContractError(String(raw.name ?? "?"), `unknown signal name`);
  }

  const confidence = asOptionalString(raw.confidence);
  if (!confidence || !CONFIDENCE_LEVELS.includes(confidence as Confidence)) {
    throw new SignalContractError(name, `confidence must be one of ${CONFIDENCE_LEVELS.join(", ")}`);
  }

  const sourceField = asOptionalString(raw.source_field);
  if (!sourceField) {
    throw new SignalContractError(name, "source_field is required — evidence must say where it came from");
  }

  const value = asOptionalString(raw.value);
  const evidenceSpan = asOptionalString(raw.evidence_span);

  if (value !== null && evidenceSpan === null) {
    throw new SignalContractError(name, "a value without an evidence_span is not a finding");
  }

  // Both casts are safe: the membership checks above are what narrows them,
  // and `Array.includes` does not narrow a `string` on its own.
  return { name: name as SignalName, value, confidence: confidence as Confidence, evidenceSpan, sourceField };
}

export interface ParsedExtraction {
  signals: ExtractedSignal[];
  /** Signals the extractor claimed but that failed verification against the source. */
  rejected: { name: string; reason: string }[];
}

/**
 * Parse a whole extractor response.
 *
 * `sources` maps a field name to the text the extractor was shown. A span that
 * does not appear in its declared source is dropped into `rejected` rather
 * than stored — an unverifiable quote is worse than no quote, because it looks
 * like proof.
 *
 * Duplicate names keep the FIRST occurrence: a model that answers twice for
 * one signal has already contradicted itself, and picking the later answer
 * would make the result depend on ordering.
 */
export function parseExtraction(raw: unknown, sources: Record<string, string>): ParsedExtraction {
  const list = Array.isArray(raw) ? raw : (raw as { signals?: unknown })?.signals;
  if (!Array.isArray(list)) {
    throw new SignalContractError("<response>", "expected an array of signals");
  }

  const signals: ExtractedSignal[] = [];
  const rejected: { name: string; reason: string }[] = [];
  const seen = new Set<SignalName>();

  for (const entry of list) {
    const signal = parseSignal((entry ?? {}) as RawSignal);
    if (seen.has(signal.name)) {
      rejected.push({ name: signal.name, reason: "duplicate — first occurrence kept" });
      continue;
    }
    seen.add(signal.name);

    const sourceText = sources[signal.sourceField];
    if (signal.evidenceSpan !== null) {
      if (sourceText === undefined) {
        rejected.push({ name: signal.name, reason: `source_field "${signal.sourceField}" was not provided` });
        continue;
      }
      if (!verifyEvidence(signal.evidenceSpan, sourceText)) {
        rejected.push({ name: signal.name, reason: "evidence_span does not appear in the source text" });
        continue;
      }
    }
    signals.push(signal);
  }

  return { signals, rejected };
}
