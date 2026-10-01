import { appendCapabilityAudit } from "@/lib/capabilities/_shared/audit-log";

const CAPABILITY = "export-diagnostics";

export type WebhookAuditRow = {
  id: string;
  processed: boolean;
  processing_error?: string | null;
  payload_json?: unknown;
};

export type ImportAuditRow = {
  id: string;
  external_id?: string | null;
  result_code?: number | null;
  action?: number | null;
  unmapped?: unknown;
  raw_payload?: unknown;
};

export type FailureReasonRow = {
  source: "webhook" | "import";
  reason: string;
  count: number;
  sampleIds: string[];
};

export type ExportDiagnosticsReport = {
  webhook: {
    total: number;
    success: number;
    failed: number;
    pending: number;
  };
  import: {
    total: number;
    byResultCode: Record<string, number>;
  };
  failureReasons: FailureReasonRow[];
  summary: string;
};

const UNKNOWN_REASON = "dôvod neznámy z audit logu";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function reasonFromUnmapped(unmapped: unknown): string | null {
  const rec = asRecord(unmapped);
  if (!rec) return null;

  const directKeys = ["error", "reason", "failure_reason", "message", "export_error"];
  for (const key of directKeys) {
    const val = rec[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }

  const nested = rec.errors ?? rec.export_errors;
  if (Array.isArray(nested) && nested.length > 0) {
    const first = nested[0];
    if (typeof first === "string" && first.trim()) return first.trim();
    const firstRec = asRecord(first);
    if (firstRec) {
      for (const key of directKeys) {
        const val = firstRec[key];
        if (typeof val === "string" && val.trim()) return val.trim();
      }
    }
  }

  return null;
}

function reasonFromRawPayload(raw: unknown): string | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  for (const key of ["error", "reason", "message", "result_message"]) {
    const val = rec[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return null;
}

function bumpReason(
  map: Map<string, FailureReasonRow>,
  source: "webhook" | "import",
  reason: string,
  id: string,
): void {
  const key = `${source}:${reason}`;
  const existing = map.get(key);
  if (existing) {
    existing.count += 1;
    if (existing.sampleIds.length < 3) existing.sampleIds.push(id);
    return;
  }
  map.set(key, { source, reason, count: 1, sampleIds: [id] });
}

/**
 * Export diagnostics — reports only what audit rows contain (AP-001).
 */
export function analyzeExportDiagnostics(input: {
  agencyId: string;
  webhooks: WebhookAuditRow[];
  imports: ImportAuditRow[];
}): ExportDiagnosticsReport {
  let webhookSuccess = 0;
  let webhookFailed = 0;
  let webhookPending = 0;
  const byResultCode: Record<string, number> = {};
  const reasonMap = new Map<string, FailureReasonRow>();

  for (const row of input.webhooks) {
    const err = row.processing_error?.trim();
    if (row.processed && !err) {
      webhookSuccess += 1;
      continue;
    }
    if (!row.processed && !err) {
      webhookPending += 1;
      bumpReason(reasonMap, "webhook", UNKNOWN_REASON, row.id);
      continue;
    }
    webhookFailed += 1;
    bumpReason(reasonMap, "webhook", err || UNKNOWN_REASON, row.id);
  }

  for (const row of input.imports) {
    const codeKey =
      row.result_code != null ? String(row.result_code) : "null";
    byResultCode[codeKey] = (byResultCode[codeKey] ?? 0) + 1;

    const fromUnmapped = reasonFromUnmapped(row.unmapped);
    const fromRaw = reasonFromRawPayload(row.raw_payload);
    const reason = fromUnmapped ?? fromRaw;
    if (reason) {
      bumpReason(reasonMap, "import", reason, row.id);
    }
  }

  const failureReasons = [...reasonMap.values()].sort((a, b) => b.count - a.count);
  const webhookTotal = input.webhooks.length;
  const importTotal = input.imports.length;

  const summaryParts = [
    `Webhook: ${webhookSuccess}/${webhookTotal} úspešných, ${webhookFailed} zlyhaní, ${webhookPending} nevybavených.`,
    `Import: ${importTotal} záznamov, result_code=${JSON.stringify(byResultCode)}.`,
  ];
  if (failureReasons.length) {
    const top = failureReasons
      .slice(0, 5)
      .map((r) => `${r.source}:${r.reason} (${r.count})`)
      .join("; ");
    summaryParts.push(`Dôvody: ${top}.`);
  }

  const summary = summaryParts.join(" ");

  appendCapabilityAudit({
    capability: CAPABILITY,
    action: "analyze_exports",
    agencyId: input.agencyId,
    entityId: "export-diagnostics",
    result: "pass",
    detail: summary,
  });

  return {
    webhook: {
      total: webhookTotal,
      success: webhookSuccess,
      failed: webhookFailed,
      pending: webhookPending,
    },
    import: {
      total: importTotal,
      byResultCode,
    },
    failureReasons,
    summary,
  };
}
