import {
  COLUMN_PATTERNS,
  type DetectedColumn,
  type ImportTargetField,
} from "@/lib/universal-import/types";

const CONFIDENCE_THRESHOLD = 0.8;

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function looksLikePhone(values: string[]): boolean {
  const sample = values.filter(Boolean).slice(0, 5).join(" ");
  if (!sample) return false;
  const digits = sample.replace(/\D/g, "");
  return digits.length >= 7 && /[\d+\s]/.test(sample);
}

function looksLikeEmail(values: string[]): boolean {
  return values.some((v) => /@/.test(v));
}

function looksLikeBudget(values: string[]): boolean {
  return values.some((v) => {
    const digits = v.replace(/[^\d]/g, "");
    return digits.length >= 4 && Number(digits) >= 1000;
  });
}

function hintFromSamples(values: string[]): ImportTargetField | null {
  if (looksLikeEmail(values)) return "email";
  if (looksLikePhone(values)) return "phone";
  if (looksLikeBudget(values)) return "budget";
  return null;
}

function scorePatternMatch(header: string, pattern: string): number {
  if (header === pattern) return 0.98;
  if (header.includes(pattern) || pattern.includes(header)) return 0.92;
  const sim = similarity(header, pattern);
  return sim >= CONFIDENCE_THRESHOLD ? sim : 0;
}

export function detectTargetField(
  header: string,
  sampleValues: string[],
): { target: ImportTargetField; confidence: number } {
  const normalized = normalizeHeader(header);
  if (!normalized) {
    return { target: "skip", confidence: 0 };
  }

  let bestTarget: ImportTargetField = "skip";
  let bestConfidence = 0;

  for (const [target, patterns] of Object.entries(COLUMN_PATTERNS) as Array<
    [ImportTargetField, string[]]
  >) {
    if (target === "skip") continue;

    for (const pattern of patterns) {
      const score = scorePatternMatch(normalized, normalizeHeader(pattern));
      if (score > bestConfidence) {
        bestConfidence = score;
        bestTarget = target;
      }
    }
  }

  const sampleHint = hintFromSamples(sampleValues);
  if (sampleHint && bestConfidence < 0.9) {
    const hintScore = 0.85;
    if (hintScore > bestConfidence) {
      bestConfidence = hintScore;
      bestTarget = sampleHint;
    }
  }

  if (bestConfidence < CONFIDENCE_THRESHOLD) {
    return { target: "skip", confidence: 0 };
  }

  return { target: bestTarget, confidence: Math.min(1, bestConfidence) };
}

export function detectColumnsFromHeaders(
  headers: string[],
  sampleRows: Record<string, string>[],
): DetectedColumn[] {
  return headers.map((originalHeader) => {
    const sampleValues = sampleRows
      .map((row) => row[originalHeader] ?? "")
      .filter((v) => v.trim().length > 0)
      .slice(0, 3);

    const { target, confidence } = detectTargetField(originalHeader, sampleValues);
    return {
      originalHeader,
      target,
      confidence,
      source: "auto",
      sampleValues,
    };
  });
}
