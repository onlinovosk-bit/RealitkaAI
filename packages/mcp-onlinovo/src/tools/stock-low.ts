import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolResponse } from "@revolis/mcp-shared";
import type { StockItem } from "../adapters/types.js";
import { beginAudit } from "../audit.js";
import { parseThreshold } from "../policy.js";
import { resolveAdapter } from "../resolve-adapter.js";

export const stockLowTool: Tool = {
  name: "onlinovo_stock_low",
  description:
    "List SKUs under a stock threshold. source is fixture, unconnected, or shoptet — never implied live without a connected adapter.",
  inputSchema: {
    type: "object",
    properties: {
      threshold: { type: "number", minimum: 0, description: "Qty strictly below this is low. Default 5." },
    },
    additionalProperties: false,
  },
};

export async function handleStockLow(args: unknown) {
  const audit = beginAudit("onlinovo_stock_low");
  const threshold = parseThreshold(args, 5);
  const adapter = resolveAdapter();
  try {
    const items = await adapter.stockLow(threshold);
    const response: ToolResponse<{ source: string; threshold: number; items: StockItem[] }> = {
      success: true,
      request_id: audit.request_id,
      data: { source: adapter.source, threshold, items },
    };
    audit.finish({ adapter: adapter.source, count: items.length });
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }] };
  } catch (err) {
    const code = (err as { code?: string }).code ?? "INTERNAL_ERROR";
    const response: ToolResponse<never> = {
      success: false,
      request_id: audit.request_id,
      error: { code, message: String(err) },
    };
    audit.log.error("onlinovo_stock_low failed", { code });
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }], isError: true };
  }
}
