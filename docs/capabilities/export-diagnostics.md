# Capability: Export Diagnostics

**Súbor:** `apps/crm/src/lib/capabilities/export-diagnostics/analyze.ts`  
**Stav:** ✅ verified (unit testy zelené)

## Čo robí

Agreguje audit záznamy z webhook a import tabuliek a vytvára diagnostický report.
Nemodifikuje dáta — len číta a počíta. AP-001: žiadne vymyslené dôvody zlyhaní.

## Vstupy

```ts
{
  agencyId: string
  webhooks: WebhookAuditRow[]  // z tabuľky webhook_audit
  imports: ImportAuditRow[]    // z tabuľky import_audit
}

WebhookAuditRow { id, processed, processing_error?, payload_json? }
ImportAuditRow  { id, external_id?, result_code?, action?, unmapped?, raw_payload? }
```

## Výstupy

```ts
ExportDiagnosticsReport {
  webhook: { total, success, failed, pending }
  import: { total, byResultCode: Record<string, number> }
  failureReasons: FailureReasonRow[]  // zoradené podľa count DESC
  summary: string
}

FailureReasonRow { source: "webhook"|"import", reason: string, count: number, sampleIds: string[] }
```

## Klasifikácia webhookov

- `processed=true && !error` → **success**
- `processed=false && !error` → **pending** (dôvod: "dôvod neznámy z audit logu")
- `processed=false && error` → **failed** (dôvod z `processing_error`)

## Extrakcia dôvodov z importov

Z `unmapped` hľadá polia `error`, `reason`, `failure_reason`, `message`, `export_error`.
Z `raw_payload` hľadá `error`, `reason`, `message`, `result_message`.
Ak nič nenájde — import sa v `failureReasons` neeviduje (žiadny vymyslený dôvod).

## Edge cases

- **Prázdne polia**: `webhooks=[]`, `imports=[]` → všetky hodnoty 0, `failureReasons=[]`, bez pádu
- **Opakovaný dôvod**: `count` sa akumuluje, `sampleIds` max 3 záznamy

## Príklad

```ts
const report = analyzeExportDiagnostics({
  agencyId: "...",
  webhooks: [{ id: "w1", processed: true, processing_error: null }],
  imports: [{ id: "i1", external_id: "13303557", result_code: 1, unmapped: {} }],
});
// report.webhook.success === 1
// report.failureReasons === []
// report.summary.includes("Webhook:")
```
