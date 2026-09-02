import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolResponse } from "@revolis/mcp-shared";
import type { OpenOrder } from "../adapters/types.js";
import { beginAudit } from "../audit.js";
import { resolveAdapter } from "../resolve-adapter.js";

export const ordersOpenTool: Tool = {
  name: "onlinovo_orders_open",
  description:
    "List open orders as id/status/age_hours only. No customer names or emails in the default payload.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
};

export async function handleOrdersOpen(_args: unknown) {
  const audit = beginAudit("onlinovo_orders_open");
  const adapter = resolveAdapter();
  try {
    const orders = await adapter.ordersOpen();
    const response: ToolResponse<{ source: string; orders: OpenOrder[] }> = {
      success: true,
      request_id: audit.request_id,
      data: { source: adapter.source, orders },
    };
    audit.finish({ adapter: adapter.source, count: orders.length });
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }] };
  } catch (err) {
    const code = (err as { code?: string }).code ?? "INTERNAL_ERROR";
    const response: ToolResponse<never> = {
      success: false,
      request_id: audit.request_id,
      error: { code, message: String(err) },
    };
    audit.log.error("onlinovo_orders_open failed", { code });
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }], isError: true };
  }
}
