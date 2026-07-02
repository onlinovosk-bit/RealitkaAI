import type { ColumnMapping, DetectedColumn } from "@/lib/universal-import/types";

const CONFIDENCE_THRESHOLD = 0.8;

export function buildAutoColumnMapping(detectedColumns: DetectedColumn[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  for (const column of detectedColumns) {
    if (column.target === "skip" || column.confidence < CONFIDENCE_THRESHOLD) {
      mapping[column.originalHeader] = "skip";
      continue;
    }
    mapping[column.originalHeader] = column.target;
  }

  return mapping;
}

export function mappingConfidenceLevel(
  detectedColumns: DetectedColumn[],
): "high" | "medium" | "low" {
  const mappable = detectedColumns.filter((c) => c.target !== "skip");
  if (mappable.length === 0) return "low";

  const avg =
    mappable.reduce((sum, c) => sum + c.confidence, 0) / Math.max(mappable.length, 1);

  if (avg >= 0.9) return "high";
  if (avg >= 0.8) return "medium";
  return "low";
}
