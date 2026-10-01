import { describe, expect, it, beforeEach } from "vitest";
import { clearCapabilityAuditForTests } from "@/lib/capabilities/_shared/audit-log";
import { analyzeExportDiagnostics } from "@/lib/capabilities/export-diagnostics";

const AGENCY = "11111111-1111-1111-1111-111111111111";

describe("export-diagnostics analyzeExportDiagnostics", () => {
  beforeEach(() => clearCapabilityAuditForTests());

  it("aggregates webhook and import audit rows without inventing reasons", () => {
    const report = analyzeExportDiagnostics({
      agencyId: AGENCY,
      webhooks: [
        { id: "w1", processed: true, processing_error: null },
        { id: "w2", processed: false, processing_error: "property upsert failed: duplicate key" },
        { id: "w3", processed: false, processing_error: null },
      ],
      imports: [
        { id: "i1", external_id: "13303557", result_code: 1, unmapped: {} },
        { id: "i2", external_id: "784691", result_code: 1, unmapped: { error: "310 nepodarilo zverejniť na Bazoši" } },
        { id: "i3", external_id: "999", result_code: null, unmapped: {} },
      ],
    });

    expect(report.webhook.total).toBe(3);
    expect(report.webhook.success).toBe(1);
    expect(report.webhook.failed).toBe(1);
    expect(report.webhook.pending).toBe(1);
    expect(report.import.total).toBe(3);
    expect(report.import.byResultCode["1"]).toBe(2);
    expect(report.import.byResultCode["null"]).toBe(1);

    const importReason = report.failureReasons.find(
      (r) => r.source === "import" && r.reason.includes("Bazo"),
    );
    expect(importReason?.count).toBe(1);

    const unknownWebhook = report.failureReasons.find(
      (r) => r.source === "webhook" && r.reason === "dôvod neznámy z audit logu",
    );
    expect(unknownWebhook?.count).toBe(1);

    expect(report.summary).toContain("Webhook:");
    expect(report.summary).not.toContain("niečo zlyhalo");
  });

  it("empty arrays — returns zeros without crash", () => {
    const report = analyzeExportDiagnostics({
      agencyId: AGENCY,
      webhooks: [],
      imports: [],
    });
    expect(report.webhook.total).toBe(0);
    expect(report.webhook.success).toBe(0);
    expect(report.webhook.failed).toBe(0);
    expect(report.webhook.pending).toBe(0);
    expect(report.import.total).toBe(0);
    expect(report.failureReasons).toHaveLength(0);
  });

  it("all webhooks processed — no failure reasons from webhook", () => {
    const report = analyzeExportDiagnostics({
      agencyId: AGENCY,
      webhooks: [
        { id: "w1", processed: true, processing_error: null },
        { id: "w2", processed: true, processing_error: null },
      ],
      imports: [],
    });
    expect(report.webhook.success).toBe(2);
    expect(report.webhook.failed).toBe(0);
    expect(report.webhook.pending).toBe(0);
    expect(report.failureReasons.filter((r) => r.source === "webhook")).toHaveLength(0);
  });

  it("repeated webhook error — reason count accumulates", () => {
    const report = analyzeExportDiagnostics({
      agencyId: AGENCY,
      webhooks: [
        { id: "w1", processed: false, processing_error: "timeout" },
        { id: "w2", processed: false, processing_error: "timeout" },
        { id: "w3", processed: false, processing_error: "timeout" },
      ],
      imports: [],
    });
    const reason = report.failureReasons.find((r) => r.reason === "timeout");
    expect(reason?.count).toBe(3);
    expect(reason?.sampleIds.length).toBeLessThanOrEqual(3);
  });
});
