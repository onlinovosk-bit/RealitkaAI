import type { GatewayLedgerRecord } from "./types.ts";
import type { ModelGatewayConfig } from "./config.ts";

/** Best-effort audit mirror — Langfuse vendor is not in repo; never blocks completion. */
export async function mirrorToLangfuse(
  config: ModelGatewayConfig,
  record: GatewayLedgerRecord,
): Promise<void> {
  if (!config.langfuse) return;
  const url = `${config.langfuse.baseUrl.replace(/\/$/, "")}/api/public/ingestion`;
  const body = {
    batch: [
      {
        type: "generation-create",
        body: {
          id: `${record.taskId}-${record.ts}`,
          traceId: record.taskId,
          name: "model-gateway.complete",
          model: record.model,
          metadata: {
            provider: record.provider,
            status: record.status,
            attempts: record.attempts,
            costEur: record.costEur,
          },
          usage: {
            input: record.tokensIn,
            output: record.tokensOut,
          },
        },
      },
    ],
  };
  const token = Buffer.from(
    `${config.langfuse.publicKey}:${config.langfuse.secretKey}`,
    "utf8",
  ).toString("base64");
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // audit supplement only
  }
}
